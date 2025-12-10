// Original file: protos/proto/auth.proto


export interface PaymentDetails {
  'id'?: (string);
  'userId'?: (string);
  'paymentType'?: (string);
  'upiId'?: (string);
  'bankAccount'?: (string);
  'ifscCode'?: (string);
  'bankName'?: (string);
  'isVerified'?: (boolean);
  'isPrimary'?: (boolean);
}

export interface PaymentDetails__Output {
  'id': (string);
  'userId': (string);
  'paymentType': (string);
  'upiId': (string);
  'bankAccount': (string);
  'ifscCode': (string);
  'bankName': (string);
  'isVerified': (boolean);
  'isPrimary': (boolean);
}
