/**
 * HaulerRegistrationService
 * -------------------------
 * Story 2.5: Hauler Account Creation with Vehicle Verification
 * 
 * Orchestrates the 4-step hauler registration flow:
 * - Step 1: Personal info + OTP verification
 * - Step 2: Vehicle information + photos
 * - Step 3: License verification + photos
 * - Step 4: Payment setup (UPI/Bank)
 * 
 * Dependencies:
 * - OtpService (reused from Story 2.1)
 * - RazorpayService (reused for UPI verification)
 * - HaulerRepository (data access)
 * - HaulerValidationService (input validation)
 * 
 * @author Dev Agent
 * @created 2025-12-12
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

import { haulerRepository, HaulerRepository } from '../repositories/hauler-repository';
import {
    haulerValidationService,
    HaulerValidationService,
    VehicleType
} from './hauler-validation-service';
import { OtpService } from './otp-service';
import { RazorpayService } from './razorpay-service';
import { ExotelService } from './exotel-service';
import { prisma, HaulerDocumentType } from '../lib/prisma';

const logger = pino({ name: 'hauler-registration-service' });

// ============ Type Definitions ============

/** Step 1 registration request */
export interface Step1Request {
    fullName: string;
    mobileNumber: string;
    alternatePhone?: string;
}

/** Step 1 response */
export interface Step1Response {
    success: boolean;
    message: string;
    registrationToken?: string;
    otpSent?: boolean;
    otpExpiresInSeconds?: number;
}

/** Step 2 vehicle info request */
export interface Step2Request {
    registrationToken: string;
    vehicleType: string;
    vehicleNumber: string;
    payloadCapacityKg: number;
    photoFrontUrl: string;
    photoSideUrl: string;
    photoOtherUrls?: string[];
}

/** Step 3 license info request */
export interface Step3Request {
    registrationToken: string;
    dlNumber: string;
    dlExpiry: string;
    dlFrontUrl: string;
    dlBackUrl: string;
}

/** Step 4 payment info request */
export interface Step4Request {
    registrationToken: string;
    upiId: string;
    bankAccount?: string;
    ifscCode?: string;
}

/** Generic step response */
export interface StepResponse {
    success: boolean;
    message: string;
    stepCompleted?: number;
    upiVerified?: boolean;
    bankName?: string;
}

/** Submit registration response */
export interface SubmitResponse {
    success: boolean;
    message: string;
    haulerId?: string;
    status?: string;
    estimatedApproval?: string;
}

// ============ HaulerRegistrationService Class ============

export class HaulerRegistrationService {
    private repo: HaulerRepository;
    private validator: HaulerValidationService;
    private otpService: OtpService;
    private razorpayService: RazorpayService;
    private exotelService: ExotelService;

    constructor(
        repo?: HaulerRepository,
        validator?: HaulerValidationService,
        otpService?: OtpService,
        razorpayService?: RazorpayService,
        exotelService?: ExotelService
    ) {
        this.repo = repo || haulerRepository;
        this.validator = validator || haulerValidationService;
        this.otpService = otpService || new OtpService();
        this.razorpayService = razorpayService || new RazorpayService();
        this.exotelService = exotelService || new ExotelService();
    }

    // ============ Step 1: Personal Information + OTP ============

    /**
     * Initiates hauler registration with personal info
     * Sends OTP to provided mobile number
     * 
     * @param req - Step 1 request data
     * @returns Registration token and OTP status
     */
    async step1PersonalInfo(req: Step1Request): Promise<Step1Response> {
        logger.info({ phone: req.mobileNumber }, 'Starting hauler registration step 1');

        // Validate name
        if (!req.fullName || req.fullName.trim().length < 2) {
            return { success: false, message: 'Name must be at least 2 characters' };
        }

        // Validate mobile format
        const phoneClean = this.cleanPhoneNumber(req.mobileNumber);
        if (!this.isValidIndianMobile(phoneClean)) {
            return { success: false, message: 'Enter valid 10-digit mobile number' };
        }

        // Check for duplicate phone
        const existingUser = await prisma.user.findUnique({ where: { phone: phoneClean } });
        if (existingUser) {
            logger.warn({ phone: phoneClean }, 'Phone already registered');
            return { success: false, message: 'Mobile number already registered' };
        }

        // Generate registration token
        const registrationToken = uuidv4();

        // Store pending registration in temp storage (Redis would be better, using memory for now)
        // For now, we'll create the profile on OTP verification

        // Send OTP
        const otpResult = await this.otpService.generateOTP(phoneClean);
        if (!otpResult.smsSent) {
            logger.error({ phone: phoneClean }, 'Failed to send OTP');
            return { success: false, message: otpResult.message };
        }

        // Store registration data temporarily
        await this.storeTempRegistration(registrationToken, {
            fullName: req.fullName.trim(),
            mobileNumber: phoneClean,
            alternatePhone: req.alternatePhone?.trim(),
        });

        return {
            success: true,
            message: 'OTP sent to your mobile',
            registrationToken,
            otpSent: true,
            otpExpiresInSeconds: 300, // 5 minutes
        };
    }

    /**
     * Verifies OTP and creates hauler user account
     * 
     * @param registrationToken - Token from step 1
     * @param mobileNumber - Mobile number to verify
     * @param otp - OTP code entered by user
     * @returns User ID if successful
     */
    async verifyOtpAndCreateUser(
        registrationToken: string,
        mobileNumber: string,
        otp: string
    ): Promise<{ success: boolean; message: string; stepCompleted?: number; userId?: string }> {

        const phoneClean = this.cleanPhoneNumber(mobileNumber);
        logger.info({ phone: phoneClean }, 'Verifying OTP for hauler registration');

        // Get temp registration data
        const tempData = await this.getTempRegistration(registrationToken);
        if (!tempData) {
            return { success: false, message: 'Registration session expired. Start again.' };
        }

        if (tempData.mobileNumber !== phoneClean) {
            return { success: false, message: 'Mobile number mismatch' };
        }

        // Verify OTP
        const isValid = await this.otpService.verifyOTP(phoneClean, otp);
        if (!isValid) {
            return { success: false, message: 'Invalid OTP. Please try again.' };
        }

        // Create user and hauler profile
        try {
            const result = await this.repo.createHaulerUser({
                phone: phoneClean,
                name: tempData.fullName,
                alternatePhone: tempData.alternatePhone,
                registrationToken,
            });

            // Clear temp data
            await this.clearTempRegistration(registrationToken);

            return {
                success: true,
                message: 'Mobile verified. Continue to vehicle details.',
                stepCompleted: 1,
                userId: result.user.id.toString(),
            };
        } catch (error) {
            logger.error({ error, phone: phoneClean }, 'Error creating hauler user');
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    }

    // ============ Step 2: Vehicle Information ============

    /**
     * Adds vehicle information to hauler profile
     * 
     * @param req - Step 2 request data
     * @returns Step completion status
     */
    async step2VehicleInfo(req: Step2Request): Promise<StepResponse> {
        logger.info({ token: req.registrationToken }, 'Processing step 2: vehicle info');

        // Find profile by registration token
        const profile = await this.repo.findByRegistrationToken(req.registrationToken);
        if (!profile) {
            return { success: false, message: 'Registration session not found' };
        }

        // Validate vehicle type
        const typeResult = this.validator.validateVehicleType(req.vehicleType);
        if (!typeResult.valid) {
            return { success: false, message: typeResult.message };
        }

        // Validate vehicle number
        const vehicleResult = this.validator.validateVehicleNumber(req.vehicleNumber);
        if (!vehicleResult.valid) {
            return { success: false, message: vehicleResult.message };
        }

        // Check duplicate vehicle number
        const vehicleExists = await this.repo.vehicleNumberExists(vehicleResult.normalizedValue!);
        if (vehicleExists) {
            return { success: false, message: 'Vehicle already registered' };
        }

        // Validate payload capacity
        const capacityResult = this.validator.validatePayloadCapacity(
            typeResult.typedValue!,
            req.payloadCapacityKg
        );
        if (!capacityResult.valid) {
            return { success: false, message: capacityResult.message };
        }

        // Validate required photos
        if (!req.photoFrontUrl || !req.photoSideUrl) {
            return { success: false, message: 'Front and side vehicle photos are required' };
        }

        try {
            // Update vehicle info
            await this.repo.updateVehicleInfo(profile.id, {
                vehicleType: typeResult.typedValue!,
                vehicleNumber: vehicleResult.normalizedValue!,
                payloadCapacityKg: req.payloadCapacityKg,
            });

            // Add document references
            await this.addVehicleDocuments(profile.id, req);

            return { success: true, message: 'Vehicle details saved. Continue to license.', stepCompleted: 2 };
        } catch (error) {
            logger.error({ error, haulerId: profile.id }, 'Error saving vehicle info');
            return { success: false, message: 'Failed to save vehicle details' };
        }
    }

    /**
     * Adds vehicle photo document references
     */
    private async addVehicleDocuments(haulerId: number, req: Step2Request): Promise<void> {
        // Add front photo
        await this.repo.addDocument({
            haulerId,
            docType: 'VEHICLE_PHOTO_FRONT' as HaulerDocumentType,
            storageUrl: req.photoFrontUrl,
            fileName: 'vehicle_front.jpg',
            fileSize: 0,
            mimeType: 'image/jpeg',
        });

        // Add side photo
        await this.repo.addDocument({
            haulerId,
            docType: 'VEHICLE_PHOTO_SIDE' as HaulerDocumentType,
            storageUrl: req.photoSideUrl,
            fileName: 'vehicle_side.jpg',
            fileSize: 0,
            mimeType: 'image/jpeg',
        });

        // Add optional additional photos
        if (req.photoOtherUrls) {
            for (let i = 0; i < req.photoOtherUrls.length && i < 2; i++) {
                await this.repo.addDocument({
                    haulerId,
                    docType: 'VEHICLE_PHOTO_OTHER' as HaulerDocumentType,
                    storageUrl: req.photoOtherUrls[i],
                    fileName: `vehicle_other_${i + 1}.jpg`,
                    fileSize: 0,
                    mimeType: 'image/jpeg',
                });
            }
        }
    }

    // ============ Step 3: License Information ============

    /**
     * Adds driving license information to hauler profile
     * 
     * @param req - Step 3 request data
     * @returns Step completion status
     */
    async step3LicenseInfo(req: Step3Request): Promise<StepResponse> {
        logger.info({ token: req.registrationToken }, 'Processing step 3: license info');

        // Find profile
        const profile = await this.repo.findByRegistrationToken(req.registrationToken);
        if (!profile) {
            return { success: false, message: 'Registration session not found' };
        }

        // Validate DL number
        const dlResult = this.validator.validateDLNumber(req.dlNumber);
        if (!dlResult.valid) {
            return { success: false, message: dlResult.message };
        }

        // Validate DL expiry
        const expiryResult = this.validator.validateDLExpiry(req.dlExpiry);
        if (!expiryResult.valid) {
            return { success: false, message: expiryResult.message };
        }

        // Validate required DL photos
        if (!req.dlFrontUrl || !req.dlBackUrl) {
            return { success: false, message: 'DL front and back photos are required' };
        }

        try {
            // Update license info
            await this.repo.updateLicenseInfo(profile.id, {
                dlNumber: dlResult.normalizedValue!,
                dlExpiry: new Date(req.dlExpiry),
            });

            // Add DL document references
            await this.addLicenseDocuments(profile.id, req);

            return { success: true, message: 'License details saved. Continue to payment.', stepCompleted: 3 };
        } catch (error) {
            logger.error({ error, haulerId: profile.id }, 'Error saving license info');
            return { success: false, message: 'Failed to save license details' };
        }
    }

    /**
     * Adds DL photo document references
     */
    private async addLicenseDocuments(haulerId: number, req: Step3Request): Promise<void> {
        await this.repo.addDocument({
            haulerId,
            docType: 'DL_FRONT' as HaulerDocumentType,
            storageUrl: req.dlFrontUrl,
            fileName: 'dl_front.jpg',
            fileSize: 0,
            mimeType: 'image/jpeg',
        });

        await this.repo.addDocument({
            haulerId,
            docType: 'DL_BACK' as HaulerDocumentType,
            storageUrl: req.dlBackUrl,
            fileName: 'dl_back.jpg',
            fileSize: 0,
            mimeType: 'image/jpeg',
        });
    }

    // ============ Step 4: Payment Information ============

    /**
     * Adds payment information and verifies UPI
     * 
     * @param req - Step 4 request data
     * @returns Step completion status with UPI verification result
     */
    async step4PaymentInfo(req: Step4Request): Promise<StepResponse> {
        logger.info({ token: req.registrationToken }, 'Processing step 4: payment info');

        // Find profile
        const profile = await this.repo.findByRegistrationToken(req.registrationToken);
        if (!profile) {
            return { success: false, message: 'Registration session not found' };
        }

        // Validate UPI format
        const upiResult = this.validator.validateUpiId(req.upiId);
        if (!upiResult.valid) {
            return { success: false, message: upiResult.message };
        }

        // Verify UPI via Razorpay
        const upiVerification = await this.razorpayService.validateVpa(upiResult.normalizedValue!);
        if (!upiVerification.valid) {
            return {
                success: false,
                message: 'UPI verification failed. Check your UPI ID.',
                upiVerified: false,
            };
        }

        // If bank account provided, validate IFSC
        let bankName: string | undefined;
        if (req.bankAccount) {
            if (!req.ifscCode) {
                return { success: false, message: 'IFSC code required with bank account' };
            }
            const ifscResult = await this.razorpayService.getBankFromIfsc(req.ifscCode);
            if (!ifscResult.valid) {
                return { success: false, message: 'Invalid IFSC code' };
            }
            bankName = ifscResult.bankName;
        }

        try {
            // Add payment details (reusing existing payment_details table)
            await prisma.paymentDetails.create({
                data: {
                    userId: profile.userId,
                    paymentType: 'UPI',
                    upiId: upiResult.normalizedValue,
                    bankAccount: req.bankAccount,
                    ifscCode: req.ifscCode,
                    bankName,
                    isVerified: true,
                    verifiedAt: new Date(),
                    isPrimary: true,
                },
            });

            // Mark step 4 complete
            await this.repo.completeStep4(profile.id);

            return {
                success: true,
                message: 'Payment details verified.',
                stepCompleted: 4,
                upiVerified: true,
                bankName,
            };
        } catch (error) {
            logger.error({ error, haulerId: profile.id }, 'Error saving payment info');
            return { success: false, message: 'Failed to save payment details' };
        }
    }

    // ============ Submit Registration ============

    /**
     * Submits completed registration for verification
     * Sends confirmation SMS
     * 
     * @param registrationToken - Registration token
     * @returns Submission result with hauler ID
     */
    async submitRegistration(registrationToken: string): Promise<SubmitResponse> {
        logger.info({ token: registrationToken }, 'Submitting hauler registration');

        // Find and validate profile
        const profile = await this.repo.findByRegistrationToken(registrationToken);
        if (!profile) {
            return { success: false, message: 'Registration session not found' };
        }

        if (profile.currentStep < 4) {
            return { success: false, message: `Please complete step ${profile.currentStep + 1} first` };
        }

        try {
            // Submit for verification
            const submitted = await this.repo.submitRegistration(profile.id);

            // Send confirmation SMS
            await this.exotelService.sendSMS(
                submitted.user.phone,
                'Your CropFresh Hauler registration is under review. We will notify you within 24 hours.'
            );

            return {
                success: true,
                message: "Registration submitted! We'll verify within 24 hours.",
                haulerId: submitted.id.toString(),
                status: 'PENDING_VERIFICATION',
                estimatedApproval: '24 hours',
            };
        } catch (error) {
            logger.error({ error, haulerId: profile.id }, 'Error submitting registration');
            return { success: false, message: 'Submission failed. Please try again.' };
        }
    }

    // ============ Utility Methods ============

    /** Cleans and normalizes phone number */
    private cleanPhoneNumber(phone: string): string {
        return phone.replace(/\D/g, '').slice(-10);
    }

    /** Validates Indian mobile number format */
    private isValidIndianMobile(phone: string): boolean {
        return /^[6-9]\d{9}$/.test(phone);
    }

    /** Stores temporary registration data (in-memory for now, should use Redis) */
    private tempStorage = new Map<string, Step1Request>();

    private async storeTempRegistration(token: string, data: Step1Request): Promise<void> {
        this.tempStorage.set(token, data);
        // Set TTL (would use Redis SETEX in production)
        setTimeout(() => this.tempStorage.delete(token), 10 * 60 * 1000); // 10 min
    }

    private async getTempRegistration(token: string): Promise<Step1Request | undefined> {
        return this.tempStorage.get(token);
    }

    private async clearTempRegistration(token: string): Promise<void> {
        this.tempStorage.delete(token);
    }
}

// Export singleton instance
export const haulerRegistrationService = new HaulerRegistrationService();
