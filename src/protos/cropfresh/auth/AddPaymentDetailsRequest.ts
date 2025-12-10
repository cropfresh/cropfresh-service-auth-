// Original file: protos/proto/auth.proto


export interface AddPaymentDetailsRequest {
  'userId'?: (string);
  'paymentType'?: (string);
  'upiId'?: (string);
  'bankAccount'?: (string);
  'ifscCode'?: (string);
  'bankName'?: (string);
}

export interface AddPaymentDetailsRequest__Output {
  'userId': (string);
  'paymentType': (string);
  'upiId': (string);
  'bankAccount': (string);
  'ifscCode': (string);
  'bankName': (string);
}
