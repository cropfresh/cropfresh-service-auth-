import { prisma, User, UserRole, FarmerProfile, PaymentDetails, FarmSize, PaymentType } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const PIN_SALT_ROUNDS = 12;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export interface CreateFarmerProfileInput {
    userId: number;
    fullName: string;
    village?: string;
    taluk?: string;
    district: string;
    state: string;
    pincode?: string;
    farmSize: FarmSize;
    farmingTypes: string[];
    mainCrops: string[];
}

export interface AddPaymentDetailsInput {
    userId: number;
    paymentType: PaymentType;
    upiId?: string;
    bankAccount?: string;
    ifscCode?: string;
    bankName?: string;
}

export class UserRepository {
    // ============ User Methods ============

    async findByPhoneNumber(phone: string): Promise<User | null> {
        try {
            return await prisma.user.findUnique({
                where: { phone },
            });
        } catch (error) {
            logger.error({ error, phone }, 'Error finding user by phone number');
            throw error;
        }
    }

    async findById(userId: number): Promise<User | null> {
        try {
            return await prisma.user.findUnique({
                where: { id: userId },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error finding user by ID');
            throw error;
        }
    }

    async createFarmer(phone: string, language: string): Promise<User> {
        try {
            return await prisma.user.create({
                data: {
                    phone,
                    role: UserRole.FARMER,
                    language,
                },
            });
        } catch (error) {
            logger.error({ error, phone }, 'Error creating farmer account');
            throw error;
        }
    }

    // ============ Farmer Profile Methods (AC5, AC6) ============

    async createFarmerProfile(input: CreateFarmerProfileInput): Promise<FarmerProfile> {
        try {
            return await prisma.farmerProfile.create({
                data: {
                    userId: input.userId,
                    fullName: input.fullName,
                    village: input.village,
                    taluk: input.taluk,
                    district: input.district,
                    state: input.state,
                    pincode: input.pincode,
                    farmSize: input.farmSize,
                    farmingTypes: input.farmingTypes,
                    mainCrops: input.mainCrops,
                },
            });
        } catch (error) {
            logger.error({ error, userId: input.userId }, 'Error creating farmer profile');
            throw error;
        }
    }

    async updateFarmerProfile(userId: number, updates: Partial<CreateFarmerProfileInput>): Promise<FarmerProfile> {
        try {
            return await prisma.farmerProfile.update({
                where: { userId },
                data: updates,
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error updating farmer profile');
            throw error;
        }
    }

    async getFarmerProfile(userId: number): Promise<FarmerProfile | null> {
        try {
            return await prisma.farmerProfile.findUnique({
                where: { userId },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error fetching farmer profile');
            throw error;
        }
    }

    // ============ PIN Methods (AC8) ============

    async setPin(userId: number, pin: string): Promise<boolean> {
        try {
            const pinHash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
            await prisma.user.update({
                where: { id: userId },
                data: {
                    pinHash,
                    pinAttempts: 0,
                    lockedUntil: null,
                },
            });
            logger.info({ userId }, 'PIN set successfully');
            return true;
        } catch (error) {
            logger.error({ error, userId }, 'Error setting PIN');
            throw error;
        }
    }

    async verifyPin(userId: number, pin: string): Promise<{ success: boolean; locked: boolean; message: string }> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return { success: false, locked: false, message: 'User not found' };
            }

            // Check if account is locked
            if (user.lockedUntil && new Date() < user.lockedUntil) {
                const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
                return {
                    success: false,
                    locked: true,
                    message: `Account locked. Try again in ${remainingMinutes} minutes.`
                };
            }

            // Check if PIN is set
            if (!user.pinHash) {
                return { success: false, locked: false, message: 'PIN not set' };
            }

            // Verify PIN
            const isValid = await bcrypt.compare(pin, user.pinHash);

            if (isValid) {
                // Reset attempts on success
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        pinAttempts: 0,
                        lockedUntil: null,
                        lastLoginAt: new Date(),
                    },
                });
                return { success: true, locked: false, message: 'PIN verified' };
            } else {
                // Increment attempts
                const newAttempts = user.pinAttempts + 1;
                const shouldLock = newAttempts >= MAX_PIN_ATTEMPTS;
                const lockedUntil = shouldLock
                    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                    : null;

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        pinAttempts: newAttempts,
                        lockedUntil,
                    },
                });

                if (shouldLock) {
                    logger.warn({ userId }, 'Account locked due to too many PIN attempts');
                    return {
                        success: false,
                        locked: true,
                        message: `Too many attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
                    };
                }

                return {
                    success: false,
                    locked: false,
                    message: `Invalid PIN. ${MAX_PIN_ATTEMPTS - newAttempts} attempts remaining.`
                };
            }
        } catch (error) {
            logger.error({ error, userId }, 'Error verifying PIN');
            throw error;
        }
    }

    async resetPin(userId: number, newPin: string): Promise<boolean> {
        return this.setPin(userId, newPin);
    }

    // ============ Payment Details Methods (AC7) ============

    async addPaymentDetails(input: AddPaymentDetailsInput): Promise<PaymentDetails> {
        try {
            // Set as primary if first payment method
            const existingCount = await prisma.paymentDetails.count({
                where: { userId: input.userId },
            });

            return await prisma.paymentDetails.create({
                data: {
                    userId: input.userId,
                    paymentType: input.paymentType,
                    upiId: input.upiId,
                    bankAccount: input.bankAccount,
                    ifscCode: input.ifscCode,
                    bankName: input.bankName,
                    isPrimary: existingCount === 0,
                },
            });
        } catch (error) {
            logger.error({ error, userId: input.userId }, 'Error adding payment details');
            throw error;
        }
    }

    async verifyPaymentDetails(paymentId: number): Promise<PaymentDetails> {
        try {
            return await prisma.paymentDetails.update({
                where: { id: paymentId },
                data: {
                    isVerified: true,
                    verifiedAt: new Date(),
                },
            });
        } catch (error) {
            logger.error({ error, paymentId }, 'Error verifying payment details');
            throw error;
        }
    }

    async getPaymentDetails(userId: number): Promise<PaymentDetails[]> {
        try {
            return await prisma.paymentDetails.findMany({
                where: { userId },
                orderBy: { isPrimary: 'desc' },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error fetching payment details');
            throw error;
        }
    }

    async setPrimaryPayment(userId: number, paymentId: number): Promise<void> {
        try {
            // Unset all as primary
            await prisma.paymentDetails.updateMany({
                where: { userId },
                data: { isPrimary: false },
            });

            // Set selected as primary
            await prisma.paymentDetails.update({
                where: { id: paymentId },
                data: { isPrimary: true },
            });
        } catch (error) {
            logger.error({ error, userId, paymentId }, 'Error setting primary payment');
            throw error;
        }
    }
}
