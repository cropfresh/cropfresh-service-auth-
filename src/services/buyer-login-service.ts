import { prisma, User, BuyerProfile } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { passwordValidationService } from './password-validation-service';


/**
 * Buyer Login Service
 * Story 2.3 - Buyer Email/Password Login (AC7, AC8, AC9)
 * 
 * Handles:
 * - Email/password authentication with bcrypt
 * - Login lockout after 5 failed attempts (30 min)
 * - JWT generation with buyer claims
 * - Password reset token generation
 * - Session invalidation on password reset
 */

// Types
type BuyerWithProfile = User & { buyerProfile: BuyerProfile | null };

interface LoginResult {
    success: boolean;
    token?: string;
    refreshToken?: string;
    buyer?: BuyerWithProfile;
    errorCode?: string;
    message?: string;
    remainingAttempts?: number;
    lockedUntilMinutes?: number;
}

interface ResetResult {
    success: boolean;
    token?: string;
    refreshToken?: string;
    buyer?: BuyerWithProfile;
    errorCode?: string;
    message?: string;
    passwordErrors?: string[];
}

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const JWT_SECRET = process.env.JWT_SECRET || 'cropfresh-dev-secret';
const JWT_EXPIRY = '30d'; // 30-day sessions
const RESET_TOKEN_EXPIRY_HOURS = 1;

export class BuyerLoginService {
    /**
     * AC7: Login with email and password
     * AC8: Handle lockout after 5 failed attempts
     */
    async login(email: string, password: string): Promise<LoginResult> {
        try {
            // Find buyer by email
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                include: { buyerProfile: true },
            }) as BuyerWithProfile | null;

            // User not found - return generic error (security: don't reveal which field is wrong)
            if (!user || user.role !== 'BUYER') {
                return {
                    success: false,
                    errorCode: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                };
            }

            // Check if account is locked
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const minutesRemaining = Math.ceil(
                    (user.lockedUntil.getTime() - Date.now()) / 60000
                );
                return {
                    success: false,
                    errorCode: 'ACCOUNT_LOCKED',
                    message: `Account locked. Try again in ${minutesRemaining} minutes.`,
                    lockedUntilMinutes: minutesRemaining,
                };
            }

            // Verify password
            if (!user.passwordHash) {
                return {
                    success: false,
                    errorCode: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                };
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

            if (!isPasswordValid) {
                // Increment failed attempts
                const newAttempts = user.loginAttempts + 1;
                const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        loginAttempts: newAttempts,
                        lockedUntil: shouldLock
                            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
                            : null,
                    },
                });

                if (shouldLock) {
                    // TODO: Send security SMS alert via Exotel
                    logger.warn({ userId: user.id }, 'Account locked after 5 failed attempts');
                    return {
                        success: false,
                        errorCode: 'ACCOUNT_LOCKED',
                        message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
                        lockedUntilMinutes: LOCKOUT_DURATION_MINUTES,
                    };
                }

                return {
                    success: false,
                    errorCode: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                    remainingAttempts: MAX_LOGIN_ATTEMPTS - newAttempts,
                };
            }

            // Successful login - reset attempts and update last login
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: 0,
                    lockedUntil: null,
                    lastLoginAt: new Date(),
                },
            });

            // Generate JWT token
            const token = this.generateToken(user);
            const refreshToken = uuidv4();

            // Store session
            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: await this.hashToken(token),
                    refreshToken,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                },
            });

            logger.info({ userId: user.id, email }, 'Buyer login successful');

            return {
                success: true,
                token,
                refreshToken,
                buyer: user,
            };
        } catch (error) {
            logger.error({ error, email }, 'Login error');
            throw error;
        }
    }

    /**
     * AC12: Logout - invalidate token
     */
    async logout(token: string): Promise<{ success: boolean; message: string }> {
        try {
            const tokenHash = await this.hashToken(token);

            // Mark session as deleted
            await prisma.session.updateMany({
                where: { token: tokenHash },
                data: { deletedAt: new Date() },
            });

            // TODO: Add token to Valkey blacklist for immediate invalidation
            // await this.addToBlacklist(tokenHash, tokenExpiry);

            return { success: true, message: 'Logged out successfully' };
        } catch (error) {
            logger.error({ error }, 'Logout error');
            return { success: false, message: 'Logout failed' };
        }
    }

    /**
     * AC9: Request password reset
     * Always returns success to prevent email enumeration
     */
    async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            // If user exists, generate and store reset token
            if (user && user.role === 'BUYER') {
                const resetToken = uuidv4();
                const tokenHash = await bcrypt.hash(resetToken, 12);
                const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

                // Invalidate any existing reset tokens
                await prisma.$executeRaw`
                    UPDATE password_reset_tokens 
                    SET used_at = NOW() 
                    WHERE user_id = ${user.id} AND used_at IS NULL
                `;

                // Create new reset token
                await prisma.$executeRaw`
                    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
                    VALUES (${user.id}, ${tokenHash}, ${expiresAt}, NOW())
                `;

                // TODO: Send email via AWS SES
                // await emailService.sendPasswordResetEmail(email, resetToken);

                logger.info({ userId: user.id }, 'Password reset token generated');
            }

            // Always return success
            return {
                success: true,
                message: 'If this email exists, we\'ve sent a reset link.',
            };
        } catch (error) {
            logger.error({ error, email }, 'Forgot password error');
            // Still return success to prevent enumeration
            return {
                success: true,
                message: 'If this email exists, we\'ve sent a reset link.',
            };
        }
    }

    /**
     * AC9: Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<ResetResult> {
        try {
            // Validate new password
            const validation = passwordValidationService.validatePassword(newPassword);
            if (!validation.isValid) {
                return {
                    success: false,
                    errorCode: 'INVALID_PASSWORD',
                    message: 'Password does not meet requirements',
                    passwordErrors: validation.errors,
                };
            }

            // Find valid reset token
            const resetTokens = await prisma.$queryRaw<Array<{
                id: number;
                user_id: number;
                token_hash: string;
                expires_at: Date;
            }>>`
                SELECT id, user_id, token_hash, expires_at
                FROM password_reset_tokens
                WHERE used_at IS NULL AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 10
            `;

            // Verify token against stored hashes
            let matchingToken: typeof resetTokens[0] | null = null;
            for (const rt of resetTokens) {
                if (await bcrypt.compare(token, rt.token_hash)) {
                    matchingToken = rt;
                    break;
                }
            }

            if (!matchingToken) {
                return {
                    success: false,
                    errorCode: 'TOKEN_EXPIRED',
                    message: 'Reset link has expired or is invalid. Please request a new one.',
                };
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, 12);

            // Update user password
            const user = await prisma.user.update({
                where: { id: matchingToken.user_id },
                data: {
                    passwordHash,
                    loginAttempts: 0,
                    lockedUntil: null,
                },
                include: { buyerProfile: true },
            }) as BuyerWithProfile;

            // Mark reset token as used
            await prisma.$executeRaw`
                UPDATE password_reset_tokens 
                SET used_at = NOW() 
                WHERE id = ${matchingToken.id}
            `;

            // Invalidate all existing sessions
            await prisma.session.updateMany({
                where: { userId: user.id },
                data: { deletedAt: new Date() },
            });

            logger.info({ userId: user.id }, 'Password reset successful, all sessions invalidated');

            // Generate new session for auto-login
            const jwtToken = this.generateToken(user);
            const refreshToken = uuidv4();

            await prisma.session.create({
                data: {
                    userId: user.id,
                    token: await this.hashToken(jwtToken),
                    refreshToken,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            return {
                success: true,
                token: jwtToken,
                refreshToken,
                buyer: user,
                message: 'Password reset successful',
            };
        } catch (error) {
            logger.error({ error }, 'Reset password error');
            throw error;
        }
    }

    /**
     * Generate JWT token with buyer claims
     * Includes: userId, userType, email, buyerOrgId
     */
    private generateToken(user: BuyerWithProfile): string {
        return jwt.sign(
            {
                userId: user.id,
                userType: 'BUYER',
                email: user.email,
                buyerOrgId: user.buyerProfile?.id,
                // Note: Role is fetched from DB per request, not cached in JWT
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    }

    /**
     * Hash token for storage (security best practice)
     */
    private async hashToken(token: string): Promise<string> {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}

export const buyerLoginService = new BuyerLoginService();
