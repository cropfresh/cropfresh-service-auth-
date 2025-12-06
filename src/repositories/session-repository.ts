import { PrismaClient, Session } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class SessionRepository {
    /**
     * Creates a new session for a user
     * @param userId - User's database ID
     * @param token - JWT token (will be hashed for storage)
     * @param refreshToken - Refresh token
     * @param expiresAt - Token expiry date
     * @param ipAddress - Client IP address
     * @param userAgent - Client user agent
     */
    async createSession(
        userId: number,
        token: string,
        refreshToken: string,
        expiresAt: Date,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Session> {
        try {
            // Hash the token for storage (security best practice)
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            return await prisma.session.create({
                data: {
                    userId,
                    token: tokenHash,
                    refreshToken,
                    expiresAt,
                    ipAddress,
                    userAgent,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error creating session');
            throw error;
        }
    }

    /**
     * Invalidates all existing sessions for a user (single device login)
     * Called when user logs in from a new device
     */
    async invalidateUserSessions(userId: number): Promise<number> {
        try {
            const result = await prisma.session.updateMany({
                where: {
                    userId,
                    deletedAt: null,
                },
                data: {
                    deletedAt: new Date(),
                },
            });
            logger.info({ userId, count: result.count }, 'Invalidated user sessions');
            return result.count;
        } catch (error) {
            logger.error({ error, userId }, 'Error invalidating user sessions');
            throw error;
        }
    }

    /**
     * Finds active session by token hash
     */
    async findByTokenHash(tokenHash: string): Promise<Session | null> {
        try {
            return await prisma.session.findFirst({
                where: {
                    token: tokenHash,
                    deletedAt: null,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
        } catch (error) {
            logger.error({ error }, 'Error finding session by token');
            throw error;
        }
    }

    /**
     * Updates last active timestamp for a session
     */
    async updateLastActive(sessionId: number): Promise<void> {
        try {
            await prisma.session.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() },
            });
        } catch (error) {
            logger.error({ error, sessionId }, 'Error updating session last active');
            throw error;
        }
    }
}
