// Original file: protos/proto/auth.proto

import type { UserProfile as _cropfresh_auth_UserProfile, UserProfile__Output as _cropfresh_auth_UserProfile__Output } from '../../cropfresh/auth/UserProfile';

export interface VerifyLoginOtpResponse {
  'token'?: (string);
  'refreshToken'?: (string);
  'user'?: (_cropfresh_auth_UserProfile | null);
}

export interface VerifyLoginOtpResponse__Output {
  'token': (string);
  'refreshToken': (string);
  'user': (_cropfresh_auth_UserProfile__Output | null);
}
