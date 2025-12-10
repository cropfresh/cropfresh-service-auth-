// Original file: protos/proto/auth.proto

import type { UserProfile as _cropfresh_auth_UserProfile, UserProfile__Output as _cropfresh_auth_UserProfile__Output } from '../../cropfresh/auth/UserProfile';

export interface LoginWithPinResponse {
  'success'?: (boolean);
  'token'?: (string);
  'refreshToken'?: (string);
  'user'?: (_cropfresh_auth_UserProfile | null);
  'message'?: (string);
  'remainingAttempts'?: (number);
}

export interface LoginWithPinResponse__Output {
  'success': (boolean);
  'token': (string);
  'refreshToken': (string);
  'user': (_cropfresh_auth_UserProfile__Output | null);
  'message': (string);
  'remainingAttempts': (number);
}
