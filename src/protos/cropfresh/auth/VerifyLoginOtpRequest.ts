// Original file: protos/proto/auth.proto


export interface VerifyLoginOtpRequest {
  'phoneNumber'?: (string);
  'otp'?: (string);
  'deviceId'?: (string);
}

export interface VerifyLoginOtpRequest__Output {
  'phoneNumber': (string);
  'otp': (string);
  'deviceId': (string);
}
