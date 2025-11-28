import * as grpc from '@grpc/grpc-js';
import { AuthServiceHandlers } from '../../protos/cropfresh/auth/AuthService';
import { Logger } from 'pino';

export const authServiceHandlers = (logger: Logger): AuthServiceHandlers => ({
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
  }
});
