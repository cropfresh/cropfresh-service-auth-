// Original file: protos/proto/auth.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { AddPaymentDetailsRequest as _cropfresh_auth_AddPaymentDetailsRequest, AddPaymentDetailsRequest__Output as _cropfresh_auth_AddPaymentDetailsRequest__Output } from '../../cropfresh/auth/AddPaymentDetailsRequest';
import type { CreateFarmerAccountRequest as _cropfresh_auth_CreateFarmerAccountRequest, CreateFarmerAccountRequest__Output as _cropfresh_auth_CreateFarmerAccountRequest__Output } from '../../cropfresh/auth/CreateFarmerAccountRequest';
import type { CreateFarmerAccountResponse as _cropfresh_auth_CreateFarmerAccountResponse, CreateFarmerAccountResponse__Output as _cropfresh_auth_CreateFarmerAccountResponse__Output } from '../../cropfresh/auth/CreateFarmerAccountResponse';
import type { CreateFarmerProfileRequest as _cropfresh_auth_CreateFarmerProfileRequest, CreateFarmerProfileRequest__Output as _cropfresh_auth_CreateFarmerProfileRequest__Output } from '../../cropfresh/auth/CreateFarmerProfileRequest';
import type { FarmProfileResponse as _cropfresh_auth_FarmProfileResponse, FarmProfileResponse__Output as _cropfresh_auth_FarmProfileResponse__Output } from '../../cropfresh/auth/FarmProfileResponse';
import type { FarmerProfileResponse as _cropfresh_auth_FarmerProfileResponse, FarmerProfileResponse__Output as _cropfresh_auth_FarmerProfileResponse__Output } from '../../cropfresh/auth/FarmerProfileResponse';
import type { LoginRequest as _cropfresh_auth_LoginRequest, LoginRequest__Output as _cropfresh_auth_LoginRequest__Output } from '../../cropfresh/auth/LoginRequest';
import type { LoginResponse as _cropfresh_auth_LoginResponse, LoginResponse__Output as _cropfresh_auth_LoginResponse__Output } from '../../cropfresh/auth/LoginResponse';
import type { LoginWithPinRequest as _cropfresh_auth_LoginWithPinRequest, LoginWithPinRequest__Output as _cropfresh_auth_LoginWithPinRequest__Output } from '../../cropfresh/auth/LoginWithPinRequest';
import type { LoginWithPinResponse as _cropfresh_auth_LoginWithPinResponse, LoginWithPinResponse__Output as _cropfresh_auth_LoginWithPinResponse__Output } from '../../cropfresh/auth/LoginWithPinResponse';
import type { LogoutRequest as _cropfresh_auth_LogoutRequest, LogoutRequest__Output as _cropfresh_auth_LogoutRequest__Output } from '../../cropfresh/auth/LogoutRequest';
import type { LogoutResponse as _cropfresh_auth_LogoutResponse, LogoutResponse__Output as _cropfresh_auth_LogoutResponse__Output } from '../../cropfresh/auth/LogoutResponse';
import type { PaymentDetailsResponse as _cropfresh_auth_PaymentDetailsResponse, PaymentDetailsResponse__Output as _cropfresh_auth_PaymentDetailsResponse__Output } from '../../cropfresh/auth/PaymentDetailsResponse';
import type { RefreshTokenRequest as _cropfresh_auth_RefreshTokenRequest, RefreshTokenRequest__Output as _cropfresh_auth_RefreshTokenRequest__Output } from '../../cropfresh/auth/RefreshTokenRequest';
import type { RefreshTokenResponse as _cropfresh_auth_RefreshTokenResponse, RefreshTokenResponse__Output as _cropfresh_auth_RefreshTokenResponse__Output } from '../../cropfresh/auth/RefreshTokenResponse';
import type { RequestLoginOtpRequest as _cropfresh_auth_RequestLoginOtpRequest, RequestLoginOtpRequest__Output as _cropfresh_auth_RequestLoginOtpRequest__Output } from '../../cropfresh/auth/RequestLoginOtpRequest';
import type { RequestLoginOtpResponse as _cropfresh_auth_RequestLoginOtpResponse, RequestLoginOtpResponse__Output as _cropfresh_auth_RequestLoginOtpResponse__Output } from '../../cropfresh/auth/RequestLoginOtpResponse';
import type { RequestOtpRequest as _cropfresh_auth_RequestOtpRequest, RequestOtpRequest__Output as _cropfresh_auth_RequestOtpRequest__Output } from '../../cropfresh/auth/RequestOtpRequest';
import type { RequestOtpResponse as _cropfresh_auth_RequestOtpResponse, RequestOtpResponse__Output as _cropfresh_auth_RequestOtpResponse__Output } from '../../cropfresh/auth/RequestOtpResponse';
import type { SaveFarmProfileRequest as _cropfresh_auth_SaveFarmProfileRequest, SaveFarmProfileRequest__Output as _cropfresh_auth_SaveFarmProfileRequest__Output } from '../../cropfresh/auth/SaveFarmProfileRequest';
import type { SetPinRequest as _cropfresh_auth_SetPinRequest, SetPinRequest__Output as _cropfresh_auth_SetPinRequest__Output } from '../../cropfresh/auth/SetPinRequest';
import type { SetPinResponse as _cropfresh_auth_SetPinResponse, SetPinResponse__Output as _cropfresh_auth_SetPinResponse__Output } from '../../cropfresh/auth/SetPinResponse';
import type { UpdateFarmerProfileRequest as _cropfresh_auth_UpdateFarmerProfileRequest, UpdateFarmerProfileRequest__Output as _cropfresh_auth_UpdateFarmerProfileRequest__Output } from '../../cropfresh/auth/UpdateFarmerProfileRequest';
import type { VerifyLoginOtpRequest as _cropfresh_auth_VerifyLoginOtpRequest, VerifyLoginOtpRequest__Output as _cropfresh_auth_VerifyLoginOtpRequest__Output } from '../../cropfresh/auth/VerifyLoginOtpRequest';
import type { VerifyLoginOtpResponse as _cropfresh_auth_VerifyLoginOtpResponse, VerifyLoginOtpResponse__Output as _cropfresh_auth_VerifyLoginOtpResponse__Output } from '../../cropfresh/auth/VerifyLoginOtpResponse';
import type { VerifyTokenRequest as _cropfresh_auth_VerifyTokenRequest, VerifyTokenRequest__Output as _cropfresh_auth_VerifyTokenRequest__Output } from '../../cropfresh/auth/VerifyTokenRequest';
import type { VerifyTokenResponse as _cropfresh_auth_VerifyTokenResponse, VerifyTokenResponse__Output as _cropfresh_auth_VerifyTokenResponse__Output } from '../../cropfresh/auth/VerifyTokenResponse';
import type { VerifyUpiRequest as _cropfresh_auth_VerifyUpiRequest, VerifyUpiRequest__Output as _cropfresh_auth_VerifyUpiRequest__Output } from '../../cropfresh/auth/VerifyUpiRequest';
import type { VerifyUpiResponse as _cropfresh_auth_VerifyUpiResponse, VerifyUpiResponse__Output as _cropfresh_auth_VerifyUpiResponse__Output } from '../../cropfresh/auth/VerifyUpiResponse';

export interface AuthServiceClient extends grpc.Client {
  AddPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  AddPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  AddPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  AddPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  addPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  addPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  addPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  addPaymentDetails(argument: _cropfresh_auth_AddPaymentDetailsRequest, callback: grpc.requestCallback<_cropfresh_auth_PaymentDetailsResponse__Output>): grpc.ClientUnaryCall;
  
  CreateFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  createFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  createFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  createFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  createFarmerAccount(argument: _cropfresh_auth_CreateFarmerAccountRequest, callback: grpc.requestCallback<_cropfresh_auth_CreateFarmerAccountResponse__Output>): grpc.ClientUnaryCall;
  
  CreateFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  CreateFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  createFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  createFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  createFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  createFarmerProfile(argument: _cropfresh_auth_CreateFarmerProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  
  Login(argument: _cropfresh_auth_LoginRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _cropfresh_auth_LoginRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _cropfresh_auth_LoginRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  Login(argument: _cropfresh_auth_LoginRequest, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _cropfresh_auth_LoginRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _cropfresh_auth_LoginRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _cropfresh_auth_LoginRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  login(argument: _cropfresh_auth_LoginRequest, callback: grpc.requestCallback<_cropfresh_auth_LoginResponse__Output>): grpc.ClientUnaryCall;
  
  LoginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  LoginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  LoginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  LoginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  loginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  loginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  loginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  loginWithPin(argument: _cropfresh_auth_LoginWithPinRequest, callback: grpc.requestCallback<_cropfresh_auth_LoginWithPinResponse__Output>): grpc.ClientUnaryCall;
  
  Logout(argument: _cropfresh_auth_LogoutRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _cropfresh_auth_LogoutRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _cropfresh_auth_LogoutRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  Logout(argument: _cropfresh_auth_LogoutRequest, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _cropfresh_auth_LogoutRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _cropfresh_auth_LogoutRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _cropfresh_auth_LogoutRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  logout(argument: _cropfresh_auth_LogoutRequest, callback: grpc.requestCallback<_cropfresh_auth_LogoutResponse__Output>): grpc.ClientUnaryCall;
  
  RefreshToken(argument: _cropfresh_auth_RefreshTokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  RefreshToken(argument: _cropfresh_auth_RefreshTokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  RefreshToken(argument: _cropfresh_auth_RefreshTokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  RefreshToken(argument: _cropfresh_auth_RefreshTokenRequest, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  refreshToken(argument: _cropfresh_auth_RefreshTokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  refreshToken(argument: _cropfresh_auth_RefreshTokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  refreshToken(argument: _cropfresh_auth_RefreshTokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  refreshToken(argument: _cropfresh_auth_RefreshTokenRequest, callback: grpc.requestCallback<_cropfresh_auth_RefreshTokenResponse__Output>): grpc.ClientUnaryCall;
  
  RequestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  requestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  requestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  requestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  requestLoginOtp(argument: _cropfresh_auth_RequestLoginOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_RequestLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  
  RequestOtp(argument: _cropfresh_auth_RequestOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestOtp(argument: _cropfresh_auth_RequestOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestOtp(argument: _cropfresh_auth_RequestOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  RequestOtp(argument: _cropfresh_auth_RequestOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  requestOtp(argument: _cropfresh_auth_RequestOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  requestOtp(argument: _cropfresh_auth_RequestOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  requestOtp(argument: _cropfresh_auth_RequestOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  requestOtp(argument: _cropfresh_auth_RequestOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_RequestOtpResponse__Output>): grpc.ClientUnaryCall;
  
  SaveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  SaveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  SaveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  SaveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  saveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  saveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  saveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  saveFarmProfile(argument: _cropfresh_auth_SaveFarmProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmProfileResponse__Output>): grpc.ClientUnaryCall;
  
  SetPin(argument: _cropfresh_auth_SetPinRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  SetPin(argument: _cropfresh_auth_SetPinRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  SetPin(argument: _cropfresh_auth_SetPinRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  SetPin(argument: _cropfresh_auth_SetPinRequest, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  setPin(argument: _cropfresh_auth_SetPinRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  setPin(argument: _cropfresh_auth_SetPinRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  setPin(argument: _cropfresh_auth_SetPinRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  setPin(argument: _cropfresh_auth_SetPinRequest, callback: grpc.requestCallback<_cropfresh_auth_SetPinResponse__Output>): grpc.ClientUnaryCall;
  
  UpdateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  UpdateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  UpdateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  UpdateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  updateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  updateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  updateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  updateFarmerProfile(argument: _cropfresh_auth_UpdateFarmerProfileRequest, callback: grpc.requestCallback<_cropfresh_auth_FarmerProfileResponse__Output>): grpc.ClientUnaryCall;
  
  VerifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  VerifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  VerifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  VerifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  verifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  verifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  verifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  verifyLoginOtp(argument: _cropfresh_auth_VerifyLoginOtpRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyLoginOtpResponse__Output>): grpc.ClientUnaryCall;
  
  VerifyToken(argument: _cropfresh_auth_VerifyTokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  VerifyToken(argument: _cropfresh_auth_VerifyTokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  VerifyToken(argument: _cropfresh_auth_VerifyTokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  VerifyToken(argument: _cropfresh_auth_VerifyTokenRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  verifyToken(argument: _cropfresh_auth_VerifyTokenRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  verifyToken(argument: _cropfresh_auth_VerifyTokenRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  verifyToken(argument: _cropfresh_auth_VerifyTokenRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  verifyToken(argument: _cropfresh_auth_VerifyTokenRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyTokenResponse__Output>): grpc.ClientUnaryCall;
  
  VerifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  VerifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  VerifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  VerifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  verifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  verifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  verifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  verifyUpi(argument: _cropfresh_auth_VerifyUpiRequest, callback: grpc.requestCallback<_cropfresh_auth_VerifyUpiResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface AuthServiceHandlers extends grpc.UntypedServiceImplementation {
  AddPaymentDetails: grpc.handleUnaryCall<_cropfresh_auth_AddPaymentDetailsRequest__Output, _cropfresh_auth_PaymentDetailsResponse>;
  
  CreateFarmerAccount: grpc.handleUnaryCall<_cropfresh_auth_CreateFarmerAccountRequest__Output, _cropfresh_auth_CreateFarmerAccountResponse>;
  
  CreateFarmerProfile: grpc.handleUnaryCall<_cropfresh_auth_CreateFarmerProfileRequest__Output, _cropfresh_auth_FarmerProfileResponse>;
  
  Login: grpc.handleUnaryCall<_cropfresh_auth_LoginRequest__Output, _cropfresh_auth_LoginResponse>;
  
  LoginWithPin: grpc.handleUnaryCall<_cropfresh_auth_LoginWithPinRequest__Output, _cropfresh_auth_LoginWithPinResponse>;
  
  Logout: grpc.handleUnaryCall<_cropfresh_auth_LogoutRequest__Output, _cropfresh_auth_LogoutResponse>;
  
  RefreshToken: grpc.handleUnaryCall<_cropfresh_auth_RefreshTokenRequest__Output, _cropfresh_auth_RefreshTokenResponse>;
  
  RequestLoginOtp: grpc.handleUnaryCall<_cropfresh_auth_RequestLoginOtpRequest__Output, _cropfresh_auth_RequestLoginOtpResponse>;
  
  RequestOtp: grpc.handleUnaryCall<_cropfresh_auth_RequestOtpRequest__Output, _cropfresh_auth_RequestOtpResponse>;
  
  SaveFarmProfile: grpc.handleUnaryCall<_cropfresh_auth_SaveFarmProfileRequest__Output, _cropfresh_auth_FarmProfileResponse>;
  
  SetPin: grpc.handleUnaryCall<_cropfresh_auth_SetPinRequest__Output, _cropfresh_auth_SetPinResponse>;
  
  UpdateFarmerProfile: grpc.handleUnaryCall<_cropfresh_auth_UpdateFarmerProfileRequest__Output, _cropfresh_auth_FarmerProfileResponse>;
  
  VerifyLoginOtp: grpc.handleUnaryCall<_cropfresh_auth_VerifyLoginOtpRequest__Output, _cropfresh_auth_VerifyLoginOtpResponse>;
  
  VerifyToken: grpc.handleUnaryCall<_cropfresh_auth_VerifyTokenRequest__Output, _cropfresh_auth_VerifyTokenResponse>;
  
  VerifyUpi: grpc.handleUnaryCall<_cropfresh_auth_VerifyUpiRequest__Output, _cropfresh_auth_VerifyUpiResponse>;
  
}

export interface AuthServiceDefinition extends grpc.ServiceDefinition {
  AddPaymentDetails: MethodDefinition<_cropfresh_auth_AddPaymentDetailsRequest, _cropfresh_auth_PaymentDetailsResponse, _cropfresh_auth_AddPaymentDetailsRequest__Output, _cropfresh_auth_PaymentDetailsResponse__Output>
  CreateFarmerAccount: MethodDefinition<_cropfresh_auth_CreateFarmerAccountRequest, _cropfresh_auth_CreateFarmerAccountResponse, _cropfresh_auth_CreateFarmerAccountRequest__Output, _cropfresh_auth_CreateFarmerAccountResponse__Output>
  CreateFarmerProfile: MethodDefinition<_cropfresh_auth_CreateFarmerProfileRequest, _cropfresh_auth_FarmerProfileResponse, _cropfresh_auth_CreateFarmerProfileRequest__Output, _cropfresh_auth_FarmerProfileResponse__Output>
  Login: MethodDefinition<_cropfresh_auth_LoginRequest, _cropfresh_auth_LoginResponse, _cropfresh_auth_LoginRequest__Output, _cropfresh_auth_LoginResponse__Output>
  LoginWithPin: MethodDefinition<_cropfresh_auth_LoginWithPinRequest, _cropfresh_auth_LoginWithPinResponse, _cropfresh_auth_LoginWithPinRequest__Output, _cropfresh_auth_LoginWithPinResponse__Output>
  Logout: MethodDefinition<_cropfresh_auth_LogoutRequest, _cropfresh_auth_LogoutResponse, _cropfresh_auth_LogoutRequest__Output, _cropfresh_auth_LogoutResponse__Output>
  RefreshToken: MethodDefinition<_cropfresh_auth_RefreshTokenRequest, _cropfresh_auth_RefreshTokenResponse, _cropfresh_auth_RefreshTokenRequest__Output, _cropfresh_auth_RefreshTokenResponse__Output>
  RequestLoginOtp: MethodDefinition<_cropfresh_auth_RequestLoginOtpRequest, _cropfresh_auth_RequestLoginOtpResponse, _cropfresh_auth_RequestLoginOtpRequest__Output, _cropfresh_auth_RequestLoginOtpResponse__Output>
  RequestOtp: MethodDefinition<_cropfresh_auth_RequestOtpRequest, _cropfresh_auth_RequestOtpResponse, _cropfresh_auth_RequestOtpRequest__Output, _cropfresh_auth_RequestOtpResponse__Output>
  SaveFarmProfile: MethodDefinition<_cropfresh_auth_SaveFarmProfileRequest, _cropfresh_auth_FarmProfileResponse, _cropfresh_auth_SaveFarmProfileRequest__Output, _cropfresh_auth_FarmProfileResponse__Output>
  SetPin: MethodDefinition<_cropfresh_auth_SetPinRequest, _cropfresh_auth_SetPinResponse, _cropfresh_auth_SetPinRequest__Output, _cropfresh_auth_SetPinResponse__Output>
  UpdateFarmerProfile: MethodDefinition<_cropfresh_auth_UpdateFarmerProfileRequest, _cropfresh_auth_FarmerProfileResponse, _cropfresh_auth_UpdateFarmerProfileRequest__Output, _cropfresh_auth_FarmerProfileResponse__Output>
  VerifyLoginOtp: MethodDefinition<_cropfresh_auth_VerifyLoginOtpRequest, _cropfresh_auth_VerifyLoginOtpResponse, _cropfresh_auth_VerifyLoginOtpRequest__Output, _cropfresh_auth_VerifyLoginOtpResponse__Output>
  VerifyToken: MethodDefinition<_cropfresh_auth_VerifyTokenRequest, _cropfresh_auth_VerifyTokenResponse, _cropfresh_auth_VerifyTokenRequest__Output, _cropfresh_auth_VerifyTokenResponse__Output>
  VerifyUpi: MethodDefinition<_cropfresh_auth_VerifyUpiRequest, _cropfresh_auth_VerifyUpiResponse, _cropfresh_auth_VerifyUpiRequest__Output, _cropfresh_auth_VerifyUpiResponse__Output>
}
