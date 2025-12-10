// Original file: protos/proto/auth.proto

import type { FarmerProfile as _cropfresh_auth_FarmerProfile, FarmerProfile__Output as _cropfresh_auth_FarmerProfile__Output } from '../../cropfresh/auth/FarmerProfile';

export interface FarmProfileResponse {
  'success'?: (boolean);
  'message'?: (string);
  'profile'?: (_cropfresh_auth_FarmerProfile | null);
}

export interface FarmProfileResponse__Output {
  'success': (boolean);
  'message': (string);
  'profile': (_cropfresh_auth_FarmerProfile__Output | null);
}
