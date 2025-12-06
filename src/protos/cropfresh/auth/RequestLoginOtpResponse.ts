// Original file: protos/proto/auth.proto


export interface RequestLoginOtpResponse {
  'success'?: (boolean);
  'message'?: (string);
  'expiresIn'?: (number);
}

export interface RequestLoginOtpResponse__Output {
  'success': (boolean);
  'message': (string);
  'expiresIn': (number);
}
