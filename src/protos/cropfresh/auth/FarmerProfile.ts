// Original file: protos/proto/auth.proto


export interface FarmerProfile {
  'id'?: (string);
  'userId'?: (string);
  'fullName'?: (string);
  'village'?: (string);
  'taluk'?: (string);
  'district'?: (string);
  'state'?: (string);
  'pincode'?: (string);
  'farmSize'?: (string);
  'farmingTypes'?: (string)[];
  'mainCrops'?: (string)[];
}

export interface FarmerProfile__Output {
  'id': (string);
  'userId': (string);
  'fullName': (string);
  'village': (string);
  'taluk': (string);
  'district': (string);
  'state': (string);
  'pincode': (string);
  'farmSize': (string);
  'farmingTypes': (string)[];
  'mainCrops': (string)[];
}
