import * as grpc from '@grpc/grpc-js';
import { AuthServiceHandlers } from '../../protos/cropfresh/auth/AuthService';
import { Logger } from 'pino';
import { OtpService } from '../../services/otp-service';
import { UserRepository } from '../../repositories/user-repository';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

export const authServiceHandlers = (logger: Logger): AuthServiceHandlers => {
  const otpService = new OtpService();
  const userRepository = new UserRepository();

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
    }
  };
};
