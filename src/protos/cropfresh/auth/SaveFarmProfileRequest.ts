// Original file: protos/proto/auth.proto


export interface SaveFarmProfileRequest {
  'userId'?: (string);
  'farmSize'?: (string);
  'farmingTypes'?: (string)[];
  'mainCrops'?: (string)[];
}

export interface SaveFarmProfileRequest__Output {
  'userId': (string);
  'farmSize': (string);
  'farmingTypes': (string)[];
  'mainCrops': (string)[];
}
