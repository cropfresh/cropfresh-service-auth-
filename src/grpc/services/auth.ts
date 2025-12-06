import * as grpc from '@grpc/grpc-js';
import { AuthServiceHandlers } from '../../protos/cropfresh/auth/AuthService';
import { Logger } from 'pino';
import { OtpService } from '../../services/otp-service';
import { LoginLockoutService } from '../../services/login-lockout-service';
import { UserRepository } from '../../repositories/user-repository';
import { SessionRepository } from '../../repositories/session-repository';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const OTP_TTL_SECONDS = 600; // 10 minutes
const prisma = new PrismaClient();

export const authServiceHandlers = (logger: Logger): AuthServiceHandlers => {
  const otpService = new OtpService();
  const loginLockoutService = new LoginLockoutService();
  const userRepository = new UserRepository();
  const sessionRepository = new SessionRepository();

  return {
    Login: (call, callback) => {
      logger.info('Login called');
      callback(null, { token: 'stub-token', refreshToken: 'stub-refresh-token' });
    },
    Logout: (call, callback) => {
      logger.info('Logout called');
      callback(null, { success: true });
    },
    RefreshToken: (call, callback) => {
      logger.info('RefreshToken called');
      callback(null, { token: 'new-stub-token', refreshToken: 'new-stub-refresh-token' });
    },
    VerifyToken: (call, callback) => {
      logger.info('VerifyToken called');
      callback(null, { valid: true, userId: '1' });
    },
    CreateFarmerAccount: async (call, callback) => {
      const { phoneNumber, otp, languagePreference } = call.request;
      logger.info({ phoneNumber }, 'CreateFarmerAccount called');

      try {
        if (!phoneNumber || !otp) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number and OTP are required',
          });
        }

        const isValid = await otpService.verifyOTP(phoneNumber, otp);
        if (!isValid) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: 'Invalid or expired OTP',
          });
        }

        // Check if user already exists
        const existingUser = await userRepository.findByPhoneNumber(phoneNumber);
        if (existingUser) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            details: 'User already exists',
          });
        }

        // Create new farmer
        const newUser = await userRepository.createFarmer(phoneNumber, languagePreference || 'en');

        // Generate Token
        const token = jwt.sign(
          { userId: newUser.id, role: newUser.role },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
          { userId: newUser.id },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        callback(null, {
          token,
          refreshToken,
          userId: newUser.id.toString(),
          userType: newUser.role,
        });

      } catch (error) {
        logger.error({ error }, 'Error in CreateFarmerAccount');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },
    RequestOtp: async (call, callback) => {
      const { phoneNumber } = call.request;
      logger.info({ phoneNumber }, 'RequestOtp called');

      try {
        if (!phoneNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number is required',
          });
        }

        const otp = await otpService.generateOTP(phoneNumber);

        if (!otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: 'Rate limit exceeded for OTP generation',
          });
        }

        // In a real application, send OTP via SMS here.
        // For development, we log it.
        logger.info({ phoneNumber, otp }, 'OTP Generated (DEV ONLY)');

        callback(null, {
          success: true,
          message: 'OTP sent successfully',
        });

      } catch (error) {
        logger.error({ error }, 'Error in RequestOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Story 2.2 - Farmer Passwordless Login
    RequestLoginOtp: async (call, callback) => {
      const { phoneNumber } = call.request;
      logger.info({ phoneNumber }, 'RequestLoginOtp called');

      try {
        if (!phoneNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number is required',
          });
        }

        // Check if account is locked
        const lockoutStatus = await loginLockoutService.getLockoutStatus(phoneNumber);
        if (lockoutStatus.isLocked) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: JSON.stringify({
              error: 'ACCOUNT_LOCKED',
              message: 'Account locked for 30 minutes',
              lockedUntil: lockoutStatus.lockedUntil?.toISOString(),
            }),
          });
        }

        // Check if phone number is registered
        const user = await userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: JSON.stringify({
              error: 'PHONE_NOT_REGISTERED',
              message: 'Number not found. Register now?',
            }),
          });
        }

        // Check if account is active
        if (!user.isActive) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: 'Account is deactivated',
          });
        }

        // Generate and store OTP
        const otp = await otpService.generateOTP(phoneNumber);

        if (!otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: 'Rate limit exceeded for OTP generation',
          });
        }

        // In production, send OTP via SMS here
        logger.info({ phoneNumber, otp }, 'Login OTP Generated (DEV ONLY)');

        callback(null, {
          success: true,
          message: 'OTP sent successfully',
          expiresIn: OTP_TTL_SECONDS,
        });

      } catch (error) {
        logger.error({ error }, 'Error in RequestLoginOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    VerifyLoginOtp: async (call, callback) => {
      const { phoneNumber, otp, deviceId } = call.request;
      logger.info({ phoneNumber, deviceId }, 'VerifyLoginOtp called');

      try {
        if (!phoneNumber || !otp) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number and OTP are required',
          });
        }

        // Check if account is locked
        const lockoutStatus = await loginLockoutService.getLockoutStatus(phoneNumber);
        if (lockoutStatus.isLocked) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: JSON.stringify({
              error: 'ACCOUNT_LOCKED',
              message: 'Account locked for 30 minutes',
              lockedUntil: lockoutStatus.lockedUntil?.toISOString(),
            }),
          });
        }

        // Find user
        const user = await userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: JSON.stringify({
              error: 'PHONE_NOT_REGISTERED',
              message: 'Number not found',
            }),
          });
        }

        // Verify OTP
        const isValid = await otpService.verifyOTP(phoneNumber, otp);
        if (!isValid) {
          // Record failed attempt
          const newLockoutStatus = await loginLockoutService.recordFailedAttempt(phoneNumber);

          if (newLockoutStatus.isLocked) {
            // TODO: Send security alert SMS in production
            logger.warn({ phoneNumber }, 'Account locked due to failed login attempts');
            return callback({
              code: grpc.status.PERMISSION_DENIED,
              details: JSON.stringify({
                error: 'ACCOUNT_LOCKED',
                message: 'Account locked for 30 minutes due to multiple failed attempts',
                lockedUntil: newLockoutStatus.lockedUntil?.toISOString(),
              }),
            });
          }

          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: JSON.stringify({
              error: 'INVALID_OTP',
              message: 'Invalid or expired OTP',
              remainingAttempts: newLockoutStatus.remainingAttempts,
            }),
          });
        }

        // OTP verified successfully - clear failed attempts
        await loginLockoutService.clearFailedAttempts(phoneNumber);

        // Invalidate existing sessions (single device login per AC5)
        await sessionRepository.invalidateUserSessions(user.id);

        // Generate JWT token with 30-day expiry (per AC3)
        const token = jwt.sign(
          {
            sub: user.id.toString(),
            userId: user.id,
            userType: user.role,
            deviceId: deviceId || 'unknown',
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const refreshToken = jwt.sign(
          { userId: user.id },
          JWT_SECRET,
          { expiresIn: '60d' }
        );

        // Create session in database
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await sessionRepository.createSession(
          user.id,
          token,
          refreshToken,
          expiresAt,
          undefined, // ipAddress - would come from call metadata in production
          undefined  // userAgent - would come from call metadata in production
        );

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { updatedAt: new Date() },
        });

        logger.info({ phoneNumber, userId: user.id }, 'Login successful');

        callback(null, {
          token,
          refreshToken,
          user: {
            id: user.id.toString(),
            name: user.name || user.fullName || '',
            phone: user.phone,
            userType: user.role,
            language: user.language || 'en',
          },
        });

      } catch (error) {
        logger.error({ error }, 'Error in VerifyLoginOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },
  };
};
