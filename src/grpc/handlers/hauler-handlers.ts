/**
 * Hauler Registration gRPC Handlers
 * Story 2.5 - Hauler Account Creation with Vehicle Verification
 * 
 * This module handles all hauler-related gRPC operations:
 * - Step 1: Personal info + OTP (AC2)
 * - Step 2: Vehicle info + photos (AC3)
 * - Step 3: License verification (AC4)
 * - Step 4: Payment setup (AC5)
 * - Registration submission (AC6)
 * - Admin verification (AC7)
 * - Vehicle eligibility lookup (AC8)
 * 
 * @module grpc/handlers/hauler
 */

import * as grpc from '@grpc/grpc-js';
import { Logger } from 'pino';
import {
    HaulerRegistrationService,
    haulerRegistrationService
} from '../../services/hauler-registration-service';
import {
    HaulerAdminService,
    haulerAdminService
} from '../../services/hauler-admin-service';

// ============ Type Definitions ============

/** Hauler handler dependencies interface */
export interface HaulerHandlerDependencies {
    logger: Logger;
    registrationService?: HaulerRegistrationService;
    adminService?: HaulerAdminService;
}

// ============ Handler Factory ============

/**
 * Create hauler gRPC handlers
 * 
 * @param deps - Handler dependencies (logger, services)
 * @returns Object containing all hauler-related gRPC handlers
 */
export function createHaulerHandlers(deps: HaulerHandlerDependencies) {
    const { logger } = deps;
    const regService = deps.registrationService || haulerRegistrationService;
    const adminService = deps.adminService || haulerAdminService;

    return {
        // ============ Step 1: Personal Info + OTP ============

        /**
         * HaulerRegisterStep1 - Initiate registration with personal info
         * Sends OTP to provided mobile number (AC2)
         */
        HaulerRegisterStep1: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ phone: req.mobile_number }, 'HaulerRegisterStep1 called');

            try {
                // Validate required fields
                if (!req.full_name || !req.mobile_number) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'full_name and mobile_number are required',
                    });
                }

                const result = await regService.step1PersonalInfo({
                    fullName: req.full_name,
                    mobileNumber: req.mobile_number,
                    alternatePhone: req.alternate_phone,
                });

                if (!result.success) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    registration_token: result.registrationToken,
                    otp_sent: result.otpSent,
                    otp_expires_in_seconds: result.otpExpiresInSeconds,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerRegisterStep1');
                return handleHaulerError(error, callback);
            }
        },

        /**
         * HaulerVerifyOtp - Verify OTP and create user account
         */
        HaulerVerifyOtp: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ phone: req.mobile_number }, 'HaulerVerifyOtp called');

            try {
                if (!req.registration_token || !req.mobile_number || !req.otp) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'registration_token, mobile_number, and otp are required',
                    });
                }

                const result = await regService.verifyOtpAndCreateUser(
                    req.registration_token,
                    req.mobile_number,
                    req.otp
                );

                if (!result.success) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    step_completed: result.stepCompleted,
                    user_id: result.userId,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerVerifyOtp');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Step 2: Vehicle Info ============

        /**
         * HaulerAddVehicleInfo - Add vehicle details and photos (AC3)
         */
        HaulerAddVehicleInfo: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ token: req.registration_token }, 'HaulerAddVehicleInfo called');

            try {
                if (!req.registration_token || !req.vehicle_type || !req.vehicle_number) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'registration_token, vehicle_type, and vehicle_number are required',
                    });
                }

                const result = await regService.step2VehicleInfo({
                    registrationToken: req.registration_token,
                    vehicleType: req.vehicle_type,
                    vehicleNumber: req.vehicle_number,
                    payloadCapacityKg: req.payload_capacity_kg || 0,
                    photoFrontUrl: req.photo_front_url,
                    photoSideUrl: req.photo_side_url,
                    photoOtherUrls: req.photo_other_urls || [],
                });

                if (!result.success) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    step_completed: result.stepCompleted,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerAddVehicleInfo');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Step 3: License Info ============

        /**
         * HaulerAddLicenseInfo - Add driving license details (AC4)
         */
        HaulerAddLicenseInfo: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ token: req.registration_token }, 'HaulerAddLicenseInfo called');

            try {
                if (!req.registration_token || !req.dl_number || !req.dl_expiry) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'registration_token, dl_number, and dl_expiry are required',
                    });
                }

                const result = await regService.step3LicenseInfo({
                    registrationToken: req.registration_token,
                    dlNumber: req.dl_number,
                    dlExpiry: req.dl_expiry,
                    dlFrontUrl: req.dl_front_url,
                    dlBackUrl: req.dl_back_url,
                });

                if (!result.success) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    step_completed: result.stepCompleted,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerAddLicenseInfo');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Step 4: Payment Info ============

        /**
         * HaulerAddPaymentInfo - Add payment details with UPI verification (AC5)
         */
        HaulerAddPaymentInfo: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ token: req.registration_token }, 'HaulerAddPaymentInfo called');

            try {
                if (!req.registration_token || !req.upi_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'registration_token and upi_id are required',
                    });
                }

                const result = await regService.step4PaymentInfo({
                    registrationToken: req.registration_token,
                    upiId: req.upi_id,
                    bankAccount: req.bank_account,
                    ifscCode: req.ifsc_code,
                });

                if (!result.success) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    step_completed: result.stepCompleted,
                    upi_verified: result.upiVerified,
                    bank_name: result.bankName || '',
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerAddPaymentInfo');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Submit Registration ============

        /**
         * HaulerSubmitRegistration - Submit completed registration (AC6)
         */
        HaulerSubmitRegistration: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ token: req.registration_token }, 'HaulerSubmitRegistration called');

            try {
                if (!req.registration_token) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'registration_token is required',
                    });
                }

                const result = await regService.submitRegistration(req.registration_token);

                if (!result.success) {
                    return callback({
                        code: grpc.status.FAILED_PRECONDITION,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    hauler_id: result.haulerId,
                    status: result.status,
                    estimated_approval: result.estimatedApproval,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in HaulerSubmitRegistration');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Admin Operations ============

        /**
         * GetPendingHaulerVerifications - Get verification queue for admin (AC7)
         */
        GetPendingHaulerVerifications: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ page: req.page, limit: req.limit }, 'GetPendingHaulerVerifications called');

            try {
                const result = await adminService.getPendingVerifications(
                    req.page || 1,
                    req.limit || 10,
                    req.district_filter
                );

                callback(null, {
                    success: result.success,
                    haulers: result.haulers.map(h => ({
                        hauler_id: h.haulerId,
                        name: h.name,
                        phone: h.phone,
                        vehicle_type: h.vehicleType,
                        vehicle_number: h.vehicleNumber,
                        dl_number: h.dlNumber,
                        submitted_at: h.submittedAt,
                        photo_urls: h.photoUrls,
                    })),
                    pagination: result.pagination,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in GetPendingHaulerVerifications');
                return handleHaulerError(error, callback);
            }
        },

        /**
         * VerifyHaulerAccount - Approve or reject hauler (AC7)
         */
        VerifyHaulerAccount: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({
                haulerId: req.hauler_id,
                action: req.action
            }, 'VerifyHaulerAccount called');

            try {
                if (!req.hauler_id || !req.action) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'hauler_id and action are required',
                    });
                }

                if (!['APPROVE', 'REJECT'].includes(req.action)) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'action must be APPROVE or REJECT',
                    });
                }

                const result = await adminService.verifyHauler({
                    haulerId: req.hauler_id,
                    action: req.action,
                    rejectionReason: req.rejection_reason,
                    verifiedByUserId: req.verified_by_user_id,
                });

                if (!result.success) {
                    return callback({
                        code: grpc.status.FAILED_PRECONDITION,
                        details: result.message,
                    });
                }

                callback(null, {
                    success: true,
                    message: result.message,
                    new_status: result.newStatus,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in VerifyHaulerAccount');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Vehicle Eligibility ============

        /**
         * GetVehicleEligibility - Get capacity/radius rules (AC8)
         */
        GetVehicleEligibility: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ vehicleType: req.vehicle_type }, 'GetVehicleEligibility called');

            try {
                const rules = adminService.getVehicleEligibility(req.vehicle_type);

                callback(null, {
                    success: true,
                    rules: rules.map(r => ({
                        vehicle_type: r.type,
                        max_capacity_kg: r.maxCapacityKg,
                        max_radius_km: r.maxRadiusKm,
                        description: r.description,
                    })),
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in GetVehicleEligibility');
                return handleHaulerError(error, callback);
            }
        },

        // ============ Hauler Profile ============

        /**
         * GetHaulerProfile - Get hauler profile by user ID
         */
        GetHaulerProfile: async (call: any, callback: any) => {
            const req = call.request;
            logger.info({ userId: req.user_id }, 'GetHaulerProfile called');

            try {
                if (!req.user_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'user_id is required',
                    });
                }

                const profile = await adminService.getHaulerProfile(parseInt(req.user_id, 10));

                if (!profile) {
                    return callback({
                        code: grpc.status.NOT_FOUND,
                        details: 'Hauler profile not found',
                    });
                }

                callback(null, {
                    success: true,
                    message: 'Profile found',
                    profile: {
                        hauler_id: profile.haulerId,
                        user_id: profile.userId,
                        name: profile.name || '',
                        phone: profile.phone,
                        alternate_phone: profile.alternatePhone || '',
                        vehicle_type: profile.vehicleType,
                        vehicle_number: profile.vehicleNumber,
                        payload_capacity_kg: profile.payloadCapacityKg,
                        dl_number: profile.dlNumber,
                        dl_expiry: profile.dlExpiry,
                        verification_status: profile.verificationStatus,
                        verified_at: profile.verifiedAt || '',
                        rejection_reason: profile.rejectionReason || '',
                        documents: profile.documents.map((d: any) => ({
                            id: d.id,
                            document_type: d.documentType,
                            url: d.url,
                            uploaded_at: d.uploadedAt,
                        })),
                    },
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in GetHaulerProfile');
                return handleHaulerError(error, callback);
            }
        },
    };
}

// ============ Error Handler ============

/**
 * Map hauler error codes to gRPC status codes
 */
function handleHaulerError(error: any, callback: any): void {
    const message = error.message || 'Unknown error';

    // Map error codes to gRPC status
    const errorMap: Record<string, number> = {
        'DUPLICATE_PHONE': grpc.status.ALREADY_EXISTS,
        'DUPLICATE_VEHICLE_NUMBER': grpc.status.ALREADY_EXISTS,
        'INVALID_VEHICLE_NUMBER': grpc.status.INVALID_ARGUMENT,
        'INVALID_DL_NUMBER': grpc.status.INVALID_ARGUMENT,
        'DL_EXPIRED': grpc.status.INVALID_ARGUMENT,
        'INVALID_UPI': grpc.status.INVALID_ARGUMENT,
        'UPI_VERIFICATION_FAILED': grpc.status.FAILED_PRECONDITION,
        'REGISTRATION_NOT_FOUND': grpc.status.NOT_FOUND,
        'HAULER_NOT_FOUND': grpc.status.NOT_FOUND,
        'RECORD_NOT_FOUND': grpc.status.NOT_FOUND,
        'PENDING_VERIFICATION': grpc.status.FAILED_PRECONDITION,
    };

    // Check if error message starts with known code
    for (const [code, grpcStatus] of Object.entries(errorMap)) {
        if (message.startsWith(code) || message.includes(code)) {
            return callback({
                code: grpcStatus,
                details: JSON.stringify({ error: code, message }),
            });
        }
    }

    // Default: internal error
    callback({
        code: grpc.status.INTERNAL,
        details: message,
    });
}

export default createHaulerHandlers;
