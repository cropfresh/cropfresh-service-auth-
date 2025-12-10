import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { AuthServiceClient as _cropfresh_auth_AuthServiceClient, AuthServiceDefinition as _cropfresh_auth_AuthServiceDefinition } from './cropfresh/auth/AuthService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  cropfresh: {
    auth: {
      AddPaymentDetailsRequest: MessageTypeDefinition
      AuthService: SubtypeConstructor<typeof grpc.Client, _cropfresh_auth_AuthServiceClient> & { service: _cropfresh_auth_AuthServiceDefinition }
      CreateFarmerAccountRequest: MessageTypeDefinition
      CreateFarmerAccountResponse: MessageTypeDefinition
      CreateFarmerProfileRequest: MessageTypeDefinition
      FarmProfileResponse: MessageTypeDefinition
      FarmerProfile: MessageTypeDefinition
      FarmerProfileResponse: MessageTypeDefinition
      LoginRequest: MessageTypeDefinition
      LoginResponse: MessageTypeDefinition
      LoginWithPinRequest: MessageTypeDefinition
      LoginWithPinResponse: MessageTypeDefinition
      LogoutRequest: MessageTypeDefinition
      LogoutResponse: MessageTypeDefinition
      PaymentDetails: MessageTypeDefinition
      PaymentDetailsResponse: MessageTypeDefinition
      RefreshTokenRequest: MessageTypeDefinition
      RefreshTokenResponse: MessageTypeDefinition
      RequestLoginOtpRequest: MessageTypeDefinition
      RequestLoginOtpResponse: MessageTypeDefinition
      RequestOtpRequest: MessageTypeDefinition
      RequestOtpResponse: MessageTypeDefinition
      SaveFarmProfileRequest: MessageTypeDefinition
      SetPinRequest: MessageTypeDefinition
      SetPinResponse: MessageTypeDefinition
      UpdateFarmerProfileRequest: MessageTypeDefinition
      UserProfile: MessageTypeDefinition
      VerifyLoginOtpRequest: MessageTypeDefinition
      VerifyLoginOtpResponse: MessageTypeDefinition
      VerifyTokenRequest: MessageTypeDefinition
      VerifyTokenResponse: MessageTypeDefinition
      VerifyUpiRequest: MessageTypeDefinition
      VerifyUpiResponse: MessageTypeDefinition
    }
  }
}

