// Original file: protos/proto/auth.proto

import type { PaymentDetails as _cropfresh_auth_PaymentDetails, PaymentDetails__Output as _cropfresh_auth_PaymentDetails__Output } from '../../cropfresh/auth/PaymentDetails';

export interface PaymentDetailsResponse {
  'success'?: (boolean);
  'message'?: (string);
  'payment'?: (_cropfresh_auth_PaymentDetails | null);
}

export interface PaymentDetailsResponse__Output {
  'success': (boolean);
  'message': (string);
  'payment': (_cropfresh_auth_PaymentDetails__Output | null);
}
