import { PrismaClient, FarmSize, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CreateFarmerProfileData {
    userId: number;
    fullName: string;
    village?: string;
    taluk?: string;
    district: string;
    state: string;
    pincode?: string;
}

interface UpdateFarmProfileData {
    userId: number;
    farmSize: 'SMALL' | 'MEDIUM' | 'LARGE';
    farmingTypes: string[];
    mainCrops: string[];
}

interface AddPaymentDetailsData {
    userId: number;
    paymentType: 'UPI' | 'BANK';
    upiId?: string;
    bankAccount?: string;
    ifscCode?: string;
    bankName?: string;
    isVerified?: boolean;
    isPrimary?: boolean;
}

export class FarmerProfileRepository {
    /**
     * Create a new farmer profile
     */
    async createProfile(data: CreateFarmerProfileData) {
        try {
            const profile = await prisma.farmerProfile.create({
                data: {
                    userId: data.userId,
                    fullName: data.fullName,
                    village: data.village || null,
                    taluk: data.taluk || null,
                    district: data.district,
                    state: data.state,
                    pincode: data.pincode || null,
                    farmSize: 'SMALL', // Default, will be updated in SaveFarmProfile
                    farmingTypes: [],
                    mainCrops: [],
                },
            });

            logger.info({ userId: data.userId, profileId: profile.id }, 'Farmer profile created');
            return profile;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    logger.warn({ userId: data.userId }, 'Profile already exists for user');
                    throw new Error('PROFILE_EXISTS');
                }
            }
            logger.error({ error, userId: data.userId }, 'Error creating farmer profile');
            throw error;
        }
    }

    /**
     * Update farmer profile with personal info
     */
    async updateProfile(userId: number, data: Partial<CreateFarmerProfileData>) {
        try {
            const profile = await prisma.farmerProfile.update({
                where: { userId },
                data: {
                    fullName: data.fullName,
                    village: data.village,
                    taluk: data.taluk,
                    district: data.district,
                    state: data.state,
                    pincode: data.pincode,
                },
            });

            logger.info({ userId, profileId: profile.id }, 'Farmer profile updated');
            return profile;
        } catch (error) {
            logger.error({ error, userId }, 'Error updating farmer profile');
            throw error;
        }
    }

    /**
     * Update farm-related fields (size, types, crops)
     */
    async updateFarmProfile(data: UpdateFarmProfileData) {
        try {
            const profile = await prisma.farmerProfile.update({
                where: { userId: data.userId },
                data: {
                    farmSize: data.farmSize as FarmSize,
                    farmingTypes: data.farmingTypes,
                    mainCrops: data.mainCrops,
                },
            });

            logger.info({ userId: data.userId }, 'Farm profile updated');
            return profile;
        } catch (error) {
            logger.error({ error, userId: data.userId }, 'Error updating farm profile');
            throw error;
        }
    }

    /**
     * Get farmer profile by user ID
     */
    async getByUserId(userId: number) {
        try {
            return await prisma.farmerProfile.findUnique({
                where: { userId },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error getting farmer profile');
            throw error;
        }
    }

    /**
     * Add payment details for a user
     */
    async addPaymentDetails(data: AddPaymentDetailsData) {
        try {
            // If this is primary, unset other primary payment methods
            if (data.isPrimary) {
                await prisma.paymentDetails.updateMany({
                    where: { userId: data.userId, isPrimary: true },
                    data: { isPrimary: false },
                });
            }

            const payment = await prisma.paymentDetails.create({
                data: {
                    userId: data.userId,
                    paymentType: data.paymentType,
                    upiId: data.upiId,
                    bankAccount: data.bankAccount,
                    ifscCode: data.ifscCode,
                    bankName: data.bankName,
                    isVerified: data.isVerified || false,
                    isPrimary: data.isPrimary || true, // First payment method is primary by default
                    verifiedAt: data.isVerified ? new Date() : null,
                },
            });

            logger.info({ userId: data.userId, paymentId: payment.id }, 'Payment details added');
            return payment;
        } catch (error) {
            logger.error({ error, userId: data.userId }, 'Error adding payment details');
            throw error;
        }
    }

    /**
     * Get payment details for a user
     */
    async getPaymentDetails(userId: number) {
        try {
            return await prisma.paymentDetails.findMany({
                where: { userId },
                orderBy: { isPrimary: 'desc' },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error getting payment details');
            throw error;
        }
    }

    /**
     * Update payment verification status
     */
    async updatePaymentVerification(paymentId: number, isVerified: boolean) {
        try {
            return await prisma.paymentDetails.update({
                where: { id: paymentId },
                data: {
                    isVerified,
                    verifiedAt: isVerified ? new Date() : null,
                },
            });
        } catch (error) {
            logger.error({ error, paymentId }, 'Error updating payment verification');
            throw error;
        }
    }

    /**
     * Set user PIN (hashed)
     */
    async setUserPin(userId: number, pinHash: string) {
        try {
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    pinHash,
                    pinAttempts: 0,
                    lockedUntil: null,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error setting user PIN');
            throw error;
        }
    }

    /**
     * Get user with PIN hash for verification
     */
    async getUserForPinLogin(userId: number) {
        try {
            return await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phone: true,
                    role: true,
                    name: true,
                    language: true,
                    pinHash: true,
                    pinAttempts: true,
                    lockedUntil: true,
                    isActive: true,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error getting user for PIN login');
            throw error;
        }
    }

    /**
     * Record failed PIN attempt
     */
    async recordFailedPinAttempt(userId: number, currentAttempts: number) {
        const MAX_ATTEMPTS = 5;
        const LOCKOUT_MINUTES = 30;

        const newAttempts = currentAttempts + 1;
        const shouldLock = newAttempts >= MAX_ATTEMPTS;

        try {
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    pinAttempts: newAttempts,
                    lockedUntil: shouldLock
                        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                        : null,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error recording failed PIN attempt');
            throw error;
        }
    }

    /**
     * Clear PIN attempts on successful login
     */
    async clearPinAttempts(userId: number) {
        try {
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    pinAttempts: 0,
                    lockedUntil: null,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error clearing PIN attempts');
            throw error;
        }
    }
}
