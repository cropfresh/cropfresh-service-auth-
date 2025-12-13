import * as grpc from '@grpc/grpc-js';
import { AuthServiceHandlers } from '../../protos/cropfresh/auth/AuthService';
import { Logger } from 'pino';
import { OtpService } from '../../services/otp-service';
import { LoginLockoutService } from '../../services/login-lockout-service';
import { PasswordValidationService } from '../../services/password-validation-service';
import { UserRepository } from '../../repositories/user-repository';
import { SessionRepository } from '../../repositories/session-repository';
import { FarmerProfileRepository } from '../../repositories/farmer-profile-repository';
import { BuyerRepository } from '../../repositories/buyer-repository';
import { RazorpayService } from '../../services/razorpay-service';
import jwt from 'jsonwebtoken';
import { prisma, BusinessType } from '../../lib/prisma';
import { valkey } from '../../utils/valkey';
// Story 2.4 - Modular Team Management Handlers
import { createTeamHandlers } from '../handlers/team-handlers';
// Story 2.5 - Modular Hauler Registration Handlers
import { createHaulerHandlers } from '../handlers/hauler-handlers';
// Story 2.6 - Modular Agent Provisioning Handlers
import { createAgentHandlers } from '../handlers/agent-handlers';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const OTP_TTL_SECONDS = 600; // 10 minutes

export const authServiceHandlers = (logger: Logger): AuthServiceHandlers => {
  const otpService = new OtpService();
  const loginLockoutService = new LoginLockoutService();
  const passwordValidationService = new PasswordValidationService();
  const userRepository = new UserRepository();
  const sessionRepository = new SessionRepository();
  const farmerProfileRepository = new FarmerProfileRepository();
  const buyerRepository = new BuyerRepository();
  const razorpayService = new RazorpayService();

  // Story 2.4 - Team Management Handlers (modular)
  const teamHandlers = createTeamHandlers({ logger });

  // Story 2.5 - Hauler Registration Handlers (modular)
  const haulerHandlers = createHaulerHandlers({ logger });

  // Story 2.6 - Agent Provisioning Handlers (modular)
  const agentHandlers = createAgentHandlers(logger);

  return {
    // Spread team handlers for modular organization
    ...teamHandlers,
    // Spread hauler handlers for Story 2.5
    ...haulerHandlers,
    // Spread agent handlers for Story 2.6
    ...agentHandlers,


    Login: (call, callback) => {
      logger.info('Login called');
      callback(null, { token: 'stub-token', refreshToken: 'stub-refresh-token' });
    },
    Logout: (call, callback) => {
      logger.info('Logout called');
      callback(null, { success: true });
    },
    RefreshToken: (call, callback) => {
      logger.info('RefreshToken called');
      callback(null, { token: 'new-stub-token', refreshToken: 'new-stub-refresh-token' });
    },
    VerifyToken: (call, callback) => {
      logger.info('VerifyToken called');
      callback(null, { valid: true, userId: '1' });
    },
    CreateFarmerAccount: async (call, callback) => {
      const { phoneNumber, otp, languagePreference } = call.request;
      logger.info({ phoneNumber }, 'CreateFarmerAccount called');

      try {
        if (!phoneNumber || !otp) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number and OTP are required',
          });
        }

        const isValid = await otpService.verifyOTP(phoneNumber, otp);
        if (!isValid) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: 'Invalid or expired OTP',
          });
        }

        // Check if user already exists
        const existingUser = await userRepository.findByPhoneNumber(phoneNumber);
        if (existingUser) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            details: 'User already exists',
          });
        }

        // Create new farmer
        const newUser = await userRepository.createFarmer(phoneNumber, languagePreference || 'en');

        // Generate Token
        const token = jwt.sign(
          { userId: newUser.id, role: newUser.role },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
          { userId: newUser.id },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        callback(null, {
          token,
          refreshToken,
          userId: newUser.id.toString(),
          userType: newUser.role,
        });

      } catch (error) {
        logger.error({ error }, 'Error in CreateFarmerAccount');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },
    // SendOtp - matches proto definition (formerly RequestOtp)
    SendOtp: async (call: any, callback: any) => {
      // Proto uses 'phone' field, not 'phoneNumber'
      const request = call.request as any;
      const phoneNumber = request.phone || request.phoneNumber;
      logger.info({ phoneNumber }, 'SendOtp called');

      try {
        if (!phoneNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number is required',
          });
        }

        const result = await otpService.generateOTP(phoneNumber);

        if (!result.otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: result.message || 'Rate limit exceeded for OTP generation',
          });
        }

        // Log OTP in dev mode for testing
        if (!result.smsSent) {
          logger.info({ phoneNumber, otp: result.otp }, 'OTP Generated (DEV MODE - check logs)');
        }

        callback(null, {
          success: true,
          message: result.message,
          expires_in_seconds: 600,  // Match proto response
        });

      } catch (error) {
        logger.error({ error }, 'Error in SendOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Alias for TypeScript types compatibility (types expect RequestOtp)
    RequestOtp: async (call: any, callback: any) => {
      // Proto uses 'phone' field, not 'phoneNumber' 
      const phoneNumber = call.request.phone || call.request.phoneNumber;
      logger.info({ phoneNumber }, 'RequestOtp/SendOtp called');

      try {
        if (!phoneNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number is required',
          });
        }

        const result = await otpService.generateOTP(phoneNumber);

        if (!result.otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: result.message || 'Rate limit exceeded for OTP generation',
          });
        }

        if (!result.smsSent) {
          logger.info({ phoneNumber, otp: result.otp }, 'OTP Generated (DEV MODE)');
        }

        callback(null, {
          success: true,
          message: result.message,
          expiresIn: 600,
        });

      } catch (error) {
        logger.error({ error }, 'Error in RequestOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Story 2.2 - Farmer Passwordless Login
    RequestLoginOtp: async (call, callback) => {
      const { phoneNumber } = call.request;
      logger.info({ phoneNumber }, 'RequestLoginOtp called');

      try {
        if (!phoneNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number is required',
          });
        }

        // Check if account is locked
        const lockoutStatus = await loginLockoutService.getLockoutStatus(phoneNumber);
        if (lockoutStatus.isLocked) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: JSON.stringify({
              error: 'ACCOUNT_LOCKED',
              message: 'Account locked for 30 minutes',
              lockedUntil: lockoutStatus.lockedUntil?.toISOString(),
            }),
          });
        }

        // Check if phone number is registered
        const user = await userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: JSON.stringify({
              error: 'PHONE_NOT_REGISTERED',
              message: 'Number not found. Register now?',
            }),
          });
        }

        // Check if account is active
        if (!user.isActive) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: 'Account is deactivated',
          });
        }

        // Generate and store OTP (with SMS if Exotel enabled)
        const result = await otpService.generateOTP(phoneNumber);

        if (!result.otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: result.message || 'Rate limit exceeded for OTP generation',
          });
        }

        // Log OTP in dev mode for testing
        if (!result.smsSent) {
          logger.info({ phoneNumber, otp: result.otp }, 'Login OTP Generated (DEV MODE)');
        }

        callback(null, {
          success: true,
          message: 'OTP sent successfully',
          expiresIn: OTP_TTL_SECONDS,
        });

      } catch (error) {
        logger.error({ error }, 'Error in RequestLoginOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    VerifyLoginOtp: async (call, callback) => {
      const { phoneNumber, otp, deviceId } = call.request;
      logger.info({ phoneNumber, deviceId }, 'VerifyLoginOtp called');

      try {
        if (!phoneNumber || !otp) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Phone number and OTP are required',
          });
        }

        // Check if account is locked
        const lockoutStatus = await loginLockoutService.getLockoutStatus(phoneNumber);
        if (lockoutStatus.isLocked) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: JSON.stringify({
              error: 'ACCOUNT_LOCKED',
              message: 'Account locked for 30 minutes',
              lockedUntil: lockoutStatus.lockedUntil?.toISOString(),
            }),
          });
        }

        // Find user
        const user = await userRepository.findByPhoneNumber(phoneNumber);
        if (!user) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: JSON.stringify({
              error: 'PHONE_NOT_REGISTERED',
              message: 'Number not found',
            }),
          });
        }

        // Verify OTP
        const isValid = await otpService.verifyOTP(phoneNumber, otp);
        if (!isValid) {
          // Record failed attempt
          const newLockoutStatus = await loginLockoutService.recordFailedAttempt(phoneNumber);

          if (newLockoutStatus.isLocked) {
            // TODO: Send security alert SMS in production
            logger.warn({ phoneNumber }, 'Account locked due to failed login attempts');
            return callback({
              code: grpc.status.PERMISSION_DENIED,
              details: JSON.stringify({
                error: 'ACCOUNT_LOCKED',
                message: 'Account locked for 30 minutes due to multiple failed attempts',
                lockedUntil: newLockoutStatus.lockedUntil?.toISOString(),
              }),
            });
          }

          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: JSON.stringify({
              error: 'INVALID_OTP',
              message: 'Invalid or expired OTP',
              remainingAttempts: newLockoutStatus.remainingAttempts,
            }),
          });
        }

        // OTP verified successfully - clear failed attempts
        await loginLockoutService.clearFailedAttempts(phoneNumber);

        // Invalidate existing sessions (single device login per AC5)
        await sessionRepository.invalidateUserSessions(user.id);

        // Generate JWT token with 30-day expiry (per AC3)
        const token = jwt.sign(
          {
            sub: user.id.toString(),
            userId: user.id,
            userType: user.role,
            deviceId: deviceId || 'unknown',
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const refreshToken = jwt.sign(
          { userId: user.id },
          JWT_SECRET,
          { expiresIn: '60d' }
        );

        // Create session in database
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await sessionRepository.createSession(
          user.id,
          token,
          refreshToken,
          expiresAt,
          undefined, // ipAddress - would come from call metadata in production
          undefined  // userAgent - would come from call metadata in production
        );

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { updatedAt: new Date() },
        });

        logger.info({ phoneNumber, userId: user.id }, 'Login successful');

        callback(null, {
          token,
          refreshToken,
          user: {
            id: user.id.toString(),
            name: user.name || '',
            phone: user.phone,
            userType: user.role,
            language: user.language || 'en',
          },
        });

      } catch (error) {
        logger.error({ error }, 'Error in VerifyLoginOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // =====================================================
    // Story 2.1 - Complete Onboarding Handlers
    // =====================================================

    // Create Farmer Profile (AC5)
    CreateFarmerProfile: async (call, callback) => {
      const { userId, fullName, village, taluk, district, state, pincode } = call.request;
      logger.info({ userId }, 'CreateFarmerProfile called');

      try {
        if (!userId || !fullName || !district || !state) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID, full name, district, and state are required',
          });
        }

        const profile = await farmerProfileRepository.createProfile({
          userId: parseInt(userId, 10),
          fullName,
          village: village || undefined,
          taluk: taluk || undefined,
          district,
          state,
          pincode: pincode || undefined,
        });

        callback(null, {
          success: true,
          message: 'Profile created successfully',
          profile: {
            id: profile.id.toString(),
            userId: profile.userId.toString(),
            fullName: profile.fullName,
            village: profile.village || '',
            taluk: profile.taluk || '',
            district: profile.district,
            state: profile.state,
            pincode: profile.pincode || '',
            farmSize: profile.farmSize,
            farmingTypes: profile.farmingTypes,
            mainCrops: profile.mainCrops,
          },
        });
      } catch (error: any) {
        if (error.message === 'PROFILE_EXISTS') {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            details: 'Profile already exists for this user',
          });
        }
        logger.error({ error }, 'Error in CreateFarmerProfile');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Update Farmer Profile (AC5)
    UpdateFarmerProfile: async (call, callback) => {
      const { userId, fullName, village, taluk, district, state, pincode } = call.request;
      logger.info({ userId }, 'UpdateFarmerProfile called');

      try {
        if (!userId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID is required',
          });
        }

        const profile = await farmerProfileRepository.updateProfile(parseInt(userId, 10), {
          fullName: fullName || undefined,
          village: village || undefined,
          taluk: taluk || undefined,
          district: district || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
        });

        callback(null, {
          success: true,
          message: 'Profile updated successfully',
          profile: {
            id: profile.id.toString(),
            userId: profile.userId.toString(),
            fullName: profile.fullName,
            village: profile.village || '',
            taluk: profile.taluk || '',
            district: profile.district,
            state: profile.state,
            pincode: profile.pincode || '',
            farmSize: profile.farmSize,
            farmingTypes: profile.farmingTypes,
            mainCrops: profile.mainCrops,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Error in UpdateFarmerProfile');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Save Farm Profile (AC6)
    SaveFarmProfile: async (call, callback) => {
      const { userId, farmSize, farmingTypes, mainCrops } = call.request;
      logger.info({ userId }, 'SaveFarmProfile called');

      try {
        if (!userId || !farmSize) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID and farm size are required',
          });
        }

        const validFarmSizes = ['SMALL', 'MEDIUM', 'LARGE'];
        if (!validFarmSizes.includes(farmSize)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Invalid farm size. Must be SMALL, MEDIUM, or LARGE',
          });
        }

        const profile = await farmerProfileRepository.updateFarmProfile({
          userId: parseInt(userId, 10),
          farmSize: farmSize as 'SMALL' | 'MEDIUM' | 'LARGE',
          farmingTypes: farmingTypes || [],
          mainCrops: mainCrops || [],
        });

        callback(null, {
          success: true,
          message: 'Farm profile saved successfully',
          profile: {
            id: profile.id.toString(),
            userId: profile.userId.toString(),
            fullName: profile.fullName,
            village: profile.village || '',
            taluk: profile.taluk || '',
            district: profile.district,
            state: profile.state,
            pincode: profile.pincode || '',
            farmSize: profile.farmSize,
            farmingTypes: profile.farmingTypes,
            mainCrops: profile.mainCrops,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Error in SaveFarmProfile');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Add Payment Details (AC7)
    AddPaymentDetails: async (call, callback) => {
      const { userId, paymentType, upiId, bankAccount, ifscCode, bankName } = call.request;
      logger.info({ userId, paymentType }, 'AddPaymentDetails called');

      try {
        if (!userId || !paymentType) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID and payment type are required',
          });
        }

        if (paymentType === 'UPI' && !upiId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'UPI ID is required for UPI payment type',
          });
        }

        if (paymentType === 'BANK' && (!bankAccount || !ifscCode)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Bank account and IFSC code are required for BANK payment type',
          });
        }

        const payment = await farmerProfileRepository.addPaymentDetails({
          userId: parseInt(userId, 10),
          paymentType: paymentType as 'UPI' | 'BANK',
          upiId: upiId || undefined,
          bankAccount: bankAccount || undefined,
          ifscCode: ifscCode || undefined,
          bankName: bankName || undefined,
          isPrimary: true,
        });

        callback(null, {
          success: true,
          message: 'Payment details added successfully',
          payment: {
            id: payment.id.toString(),
            userId: payment.userId.toString(),
            paymentType: payment.paymentType,
            upiId: payment.upiId || '',
            bankAccount: payment.bankAccount || '',
            ifscCode: payment.ifscCode || '',
            bankName: payment.bankName || '',
            isVerified: payment.isVerified,
            isPrimary: payment.isPrimary,
          },
        });
      } catch (error) {
        logger.error({ error }, 'Error in AddPaymentDetails');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Verify UPI (AC7)
    VerifyUpi: async (call, callback) => {
      // Gateway sends snake_case (upi_id), but TypeScript types use camelCase (upiId)
      // Try both formats to handle either proto-loader configuration
      const request = call.request as any;
      const upiId = request.upiId || request.upi_id;
      logger.info({ upiId, rawRequest: request }, 'VerifyUpi called');

      try {
        if (!upiId) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'UPI ID is required',
          });
        }

        const result = await razorpayService.validateVpa(upiId);

        callback(null, {
          valid: result.valid,
          customerName: result.customerName || '',
          message: result.message,
        });
      } catch (error) {
        logger.error({ error }, 'Error in VerifyUpi');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Set PIN (AC8)
    SetPin: async (call, callback) => {
      const { userId, pin } = call.request;
      logger.info({ userId }, 'SetPin called');

      try {
        if (!userId || !pin) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID and PIN are required',
          });
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'PIN must be exactly 4 digits',
          });
        }

        // Hash the PIN using bcrypt
        const bcrypt = require('bcrypt');
        const pinHash = await bcrypt.hash(pin, 10);

        await farmerProfileRepository.setUserPin(parseInt(userId, 10), pinHash);

        callback(null, {
          success: true,
          message: 'PIN set successfully',
        });
      } catch (error) {
        logger.error({ error }, 'Error in SetPin');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Login with PIN (AC8)
    LoginWithPin: async (call, callback) => {
      const { userId, pin, deviceId } = call.request;
      logger.info({ userId, deviceId }, 'LoginWithPin called');

      try {
        if (!userId || !pin) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'User ID and PIN are required',
          });
        }

        const user = await farmerProfileRepository.getUserForPinLogin(parseInt(userId, 10));

        if (!user) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: 'User not found',
          });
        }

        if (!user.isActive) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: 'Account is deactivated',
          });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            details: JSON.stringify({
              error: 'ACCOUNT_LOCKED',
              message: 'Account locked due to too many failed attempts',
              lockedUntil: user.lockedUntil.toISOString(),
            }),
          });
        }

        if (!user.pinHash) {
          return callback({
            code: grpc.status.FAILED_PRECONDITION,
            details: 'PIN not set for this user',
          });
        }

        // Verify PIN
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare(pin, user.pinHash);

        if (!isValid) {
          // Record failed attempt
          await farmerProfileRepository.recordFailedPinAttempt(user.id, user.pinAttempts);
          const remainingAttempts = Math.max(0, 4 - user.pinAttempts);

          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: JSON.stringify({
              error: 'INVALID_PIN',
              message: 'Incorrect PIN',
              remainingAttempts,
            }),
          });
        }

        // Clear failed attempts
        await farmerProfileRepository.clearPinAttempts(user.id);

        // Invalidate existing sessions
        await sessionRepository.invalidateUserSessions(user.id);

        // Generate new tokens
        const token = jwt.sign(
          {
            sub: user.id.toString(),
            userId: user.id,
            userType: user.role,
            deviceId: deviceId || 'unknown',
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const refreshToken = jwt.sign(
          { userId: user.id },
          JWT_SECRET,
          { expiresIn: '60d' }
        );

        // Create session
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await sessionRepository.createSession(user.id, token, refreshToken, expiresAt);

        callback(null, {
          success: true,
          token,
          refreshToken,
          user: {
            id: user.id.toString(),
            name: user.name || '',
            phone: user.phone,
            userType: user.role,
            language: user.language || 'en',
          },
          message: 'Login successful',
          remainingAttempts: 5,
        });
      } catch (error) {
        logger.error({ error }, 'Error in LoginWithPin');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // =====================================================
    // Story 2.3 - Buyer Business Account Creation Handlers
    // =====================================================

    // Register Buyer - Step 1: Validate input and send OTP
    RegisterBuyer: async (call: any, callback: any) => {
      const { businessName, businessType, email, password, mobileNumber, gstNumber } = call.request;
      logger.info({ email, mobileNumber, businessType }, 'RegisterBuyer called');

      try {
        // Validate required fields
        if (!businessName || !businessType || !email || !password || !mobileNumber) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Business name, type, email, password, and mobile are required',
          });
        }

        // Validate email format
        if (!passwordValidationService.validateEmail(email)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Invalid email format',
          });
        }

        // Validate mobile number
        if (!passwordValidationService.validateMobileNumber(mobileNumber)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Invalid mobile number. Must be a valid Indian mobile number.',
          });
        }

        // Validate password strength
        const passwordValidation = passwordValidationService.validatePassword(password);
        if (!passwordValidation.isValid) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: JSON.stringify({
              error: 'WEAK_PASSWORD',
              message: 'Password does not meet requirements',
              errors: passwordValidation.errors,
            }),
          });
        }

        // Validate GST number if provided
        if (gstNumber && !passwordValidationService.validateGstNumber(gstNumber)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Invalid GST number format. Must be 15 alphanumeric characters.',
          });
        }

        // Check for duplicate email
        const emailExists = await buyerRepository.emailExists(email);
        if (emailExists) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            details: JSON.stringify({
              error: 'EMAIL_EXISTS',
              message: 'An account with this email already exists',
            }),
          });
        }

        // Check for duplicate phone
        const phoneExists = await buyerRepository.phoneExists(mobileNumber);
        if (phoneExists) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            details: JSON.stringify({
              error: 'PHONE_EXISTS',
              message: 'An account with this mobile number already exists',
            }),
          });
        }

        // Validate business type
        const validBusinessTypes = [
          'RESTAURANT', 'HOTEL', 'CATERER', 'CANTEEN', 'CLOUD_KITCHEN', 'CAFE', 'FAST_FOOD_CHAIN',
          'SUPERMARKET', 'GROCERY_STORE', 'HYPERMARKET', 'CONVENIENCE_STORE', 'ORGANIC_STORE',
          'WHOLESALER', 'DISTRIBUTOR', 'COMMISSION_AGENT', 'TRADER',
          'FOOD_PROCESSOR', 'JUICE_MANUFACTURER', 'FROZEN_FOOD_COMPANY', 'PICKLE_MANUFACTURER',
          'EXPORTER', 'EXPORT_HOUSE', 'INTERNATIONAL_TRADER',
          'HOSPITAL', 'SCHOOL_COLLEGE', 'CORPORATE_CAFETERIA', 'GOVERNMENT_INSTITUTION',
          'FARM_TO_TABLE'
        ];
        if (!validBusinessTypes.includes(businessType)) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Invalid business type',
          });
        }

        // Hash password
        const passwordHash = await passwordValidationService.hashPassword(password);

        // Store pending registration data in Valkey (expires in 10 minutes)
        const registrationKey = `buyer_reg:${mobileNumber}`;
        await valkey.setex(registrationKey, OTP_TTL_SECONDS, JSON.stringify({
          businessName,
          businessType,
          email: email.toLowerCase(),
          passwordHash,
          mobileNumber,
          gstNumber: gstNumber || null,
        }));

        // Generate and send OTP
        const otp = await otpService.generateOTP(mobileNumber);
        if (!otp) {
          return callback({
            code: grpc.status.RESOURCE_EXHAUSTED,
            details: 'Rate limit exceeded for OTP generation',
          });
        }

        logger.info({ mobileNumber, otp }, 'Buyer registration OTP generated (DEV ONLY)');

        callback(null, {
          success: true,
          message: 'OTP sent to your mobile number',
          expiresIn: OTP_TTL_SECONDS,
          passwordErrors: [],
        });

      } catch (error) {
        logger.error({ error }, 'Error in RegisterBuyer');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // Verify Buyer OTP - Step 2: Verify OTP and create account
    VerifyBuyerOtp: async (call: any, callback: any) => {
      const { mobileNumber, otp, address } = call.request;
      logger.info({ mobileNumber }, 'VerifyBuyerOtp called');

      try {
        if (!mobileNumber || !otp) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Mobile number and OTP are required',
          });
        }

        if (!address || !address.addressLine1 || !address.city || !address.state || !address.pincode) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Address with line1, city, state, and pincode is required',
          });
        }

        // Verify OTP
        const isValid = await otpService.verifyOTP(mobileNumber, otp);
        if (!isValid) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: JSON.stringify({
              error: 'INVALID_OTP',
              message: 'Invalid or expired OTP',
            }),
          });
        }

        // Retrieve pending registration data
        const registrationKey = `buyer_reg:${mobileNumber}`;
        const registrationDataStr = await valkey.get(registrationKey);
        if (!registrationDataStr) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: 'Registration session expired. Please start again.',
          });
        }

        const registrationData = JSON.parse(registrationDataStr);

        // Create buyer account
        const buyer = await buyerRepository.createBuyer({
          phone: mobileNumber,
          email: registrationData.email,
          passwordHash: registrationData.passwordHash,
          businessName: registrationData.businessName,
          businessType: registrationData.businessType as BusinessType,
          gstNumber: registrationData.gstNumber,
          address: {
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || undefined,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            latitude: address.latitude || undefined,
            longitude: address.longitude || undefined,
          },
        });

        // Clean up registration data
        await valkey.del(registrationKey);

        // Generate JWT tokens
        const token = jwt.sign(
          {
            sub: buyer.id.toString(),
            userId: buyer.id,
            userType: 'BUYER',
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const refreshToken = jwt.sign(
          { userId: buyer.id },
          JWT_SECRET,
          { expiresIn: '60d' }
        );

        // Create session
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await sessionRepository.createSession(buyer.id, token, refreshToken, expiresAt);

        // Update last login
        await buyerRepository.updateLastLogin(buyer.id);

        logger.info({ userId: buyer.id, email: buyer.email }, 'Buyer account created successfully');

        // Send welcome SMS (TODO: implement in production)
        logger.info({ mobileNumber }, 'Welcome SMS would be sent here');

        callback(null, {
          success: true,
          token,
          refreshToken,
          buyer: {
            id: buyer.buyerProfile?.id.toString() || '',
            userId: buyer.id.toString(),
            businessName: buyer.buyerProfile?.businessName || '',
            businessType: buyer.buyerProfile?.businessType || '',
            email: buyer.email || '',
            mobileNumber: buyer.phone,
            gstNumber: buyer.buyerProfile?.gstNumber || '',
            address: {
              addressLine1: buyer.buyerProfile?.addressLine1 || '',
              addressLine2: buyer.buyerProfile?.addressLine2 || '',
              city: buyer.buyerProfile?.city || '',
              state: buyer.buyerProfile?.state || '',
              pincode: buyer.buyerProfile?.pincode || '',
              latitude: buyer.buyerProfile?.latitude || 0,
              longitude: buyer.buyerProfile?.longitude || 0,
            },
            emailVerified: buyer.emailVerified || false,
          },
          message: 'Account created successfully',
        });

      } catch (error) {
        logger.error({ error }, 'Error in VerifyBuyerOtp');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // =====================================================
    // Story 2.3 - Buyer Login & Password Management Handlers
    // =====================================================

    // AC7: Buyer Email/Password Login
    LoginBuyer: async (call: any, callback: any) => {
      const { email, password } = call.request;
      logger.info({ email }, 'LoginBuyer called');

      try {
        if (!email || !password) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Email and password are required',
          });
        }

        const { buyerLoginService } = await import('../../services/buyer-login-service');
        const result = await buyerLoginService.login(email, password);

        if (!result.success) {
          if (result.errorCode === 'ACCOUNT_LOCKED') {
            return callback({
              code: grpc.status.RESOURCE_EXHAUSTED,
              details: JSON.stringify({
                error: 'ACCOUNT_LOCKED',
                message: result.message,
                lockedUntilMinutes: result.lockedUntilMinutes,
              }),
            });
          }
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            details: JSON.stringify({
              error: result.errorCode || 'INVALID_CREDENTIALS',
              message: result.message,
              remainingAttempts: result.remainingAttempts,
            }),
          });
        }

        callback(null, {
          success: true,
          token: result.token,
          refreshToken: result.refreshToken,
          buyer: result.buyer ? {
            id: result.buyer.buyerProfile?.id.toString() || '',
            userId: result.buyer.id.toString(),
            businessName: result.buyer.buyerProfile?.businessName || '',
            businessType: result.buyer.buyerProfile?.businessType || '',
            email: result.buyer.email || '',
            mobileNumber: result.buyer.phone,
            gstNumber: result.buyer.buyerProfile?.gstNumber || '',
            emailVerified: result.buyer.emailVerified || false,
          } : undefined,
          message: 'Login successful',
        });
      } catch (error) {
        logger.error({ error }, 'Error in LoginBuyer');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // AC12: Buyer Logout
    LogoutBuyer: async (call: any, callback: any) => {
      const { token } = call.request;
      logger.info('LogoutBuyer called');

      try {
        if (!token) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Token is required',
          });
        }

        const { buyerLoginService } = await import('../../services/buyer-login-service');
        const result = await buyerLoginService.logout(token);

        callback(null, {
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        logger.error({ error }, 'Error in LogoutBuyer');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },

    // AC9: Forgot Password
    ForgotPassword: async (call: any, callback: any) => {
      const { email } = call.request;
      logger.info({ email }, 'ForgotPassword called');

      try {
        if (!email) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Email is required',
          });
        }

        const { buyerLoginService } = await import('../../services/buyer-login-service');
        const result = await buyerLoginService.forgotPassword(email);

        // Always return success to prevent email enumeration
        callback(null, {
          success: true,
          message: result.message,
        });
      } catch (error) {
        logger.error({ error }, 'Error in ForgotPassword');
        // Still return success to prevent enumeration
        callback(null, {
          success: true,
          message: 'If this email exists, we\'ve sent a reset link.',
        });
      }
    },

    // AC9: Reset Password
    ResetPassword: async (call: any, callback: any) => {
      const { token, newPassword } = call.request;
      logger.info('ResetPassword called');

      try {
        if (!token || !newPassword) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'Token and new password are required',
          });
        }

        const { buyerLoginService } = await import('../../services/buyer-login-service');
        const result = await buyerLoginService.resetPassword(token, newPassword);

        if (!result.success) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            details: JSON.stringify({
              error: result.errorCode,
              message: result.message,
              passwordErrors: result.passwordErrors,
            }),
          });
        }

        callback(null, {
          success: true,
          token: result.token,
          refreshToken: result.refreshToken,
          buyer: result.buyer ? {
            id: result.buyer.buyerProfile?.id.toString() || '',
            userId: result.buyer.id.toString(),
            businessName: result.buyer.buyerProfile?.businessName || '',
            businessType: result.buyer.buyerProfile?.businessType || '',
            email: result.buyer.email || '',
            mobileNumber: result.buyer.phone,
            gstNumber: result.buyer.buyerProfile?.gstNumber || '',
            emailVerified: result.buyer.emailVerified || false,
          } : undefined,
          message: result.message,
        });
      } catch (error) {
        logger.error({ error }, 'Error in ResetPassword');
        callback({
          code: grpc.status.INTERNAL,
          details: 'Internal server error',
        });
      }
    },
  };
};
