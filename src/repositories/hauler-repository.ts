/**
 * HaulerRepository
 * ----------------
 * Story 2.5: Hauler Account Creation with Vehicle Verification
 * 
 * Provides data access methods for:
 * - Hauler profile CRUD operations
 * - Document management
 * - Verification queue operations
 * - Vehicle eligibility lookups
 * 
 * Follows repository pattern established in farmer-profile-repository.ts
 * 
 * @author Dev Agent
 * @created 2025-12-12
 */

import {
    prisma,
    HaulerStatus,
    VehicleType,
    HaulerDocumentType,
    Prisma
} from '../lib/prisma';
import { logger } from '../utils/logger';

// ============ Type Definitions ============

/** Data for creating initial hauler registration (Step 1) */
export interface CreateHaulerUserData {
    phone: string;
    name: string;
    alternatePhone?: string;
    registrationToken: string;
}

/** Data for adding vehicle info (Step 2) */
export interface AddVehicleInfoData {
    userId: number;
    vehicleType: VehicleType;
    vehicleNumber: string;
    payloadCapacityKg: number;
}

/** Data for adding license info (Step 3) */
export interface AddLicenseInfoData {
    haulerId: number;
    dlNumber: string;
    dlExpiry: Date;
}

/** Data for adding hauler document */
export interface AddDocumentData {
    haulerId: number;
    docType: HaulerDocumentType;
    storageUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

/** Pagination parameters */
export interface PaginationParams {
    page: number;
    limit: number;
}

/** Hauler profile with documents and user */
export type HaulerProfileWithRelations = Awaited<ReturnType<typeof prisma.haulerProfile.findFirst>> & {
    user: { phone: string; name: string | null; alternatePhone: string | null };
    documents: Awaited<ReturnType<typeof prisma.haulerDocument.findMany>>;
};

// ============ HaulerRepository Class ============

export class HaulerRepository {

    // ============ User Creation ============

    /**
     * Creates a new hauler user and initial profile stub
     * Called during Step 1 after OTP verification
     * 
     * @param data - User and registration data
     * @returns Created user with hauler profile
     */
    async createHaulerUser(data: CreateHaulerUserData) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Create user with HAULER role
                const user = await tx.user.create({
                    data: {
                        phone: data.phone,
                        name: data.name,
                        alternatePhone: data.alternatePhone ?? null,
                        role: 'HAULER',
                        isActive: true,
                    },
                });

                // Create hauler profile stub with registration token
                const profile = await tx.haulerProfile.create({
                    data: {
                        userId: user.id,
                        vehicleType: 'BIKE', // Placeholder, updated in Step 2
                        vehicleNumber: 'TEMP-' + user.id, // Placeholder
                        payloadCapacityKg: 0,
                        dlNumber: 'TEMP',
                        dlExpiry: new Date(),
                        registrationToken: data.registrationToken,
                        currentStep: 1,
                        stepCompleted: false,
                    },
                });

                return { user, profile };
            });

            logger.info({ userId: result.user.id, profileId: result.profile.id }, 'Hauler user created');
            return result;
        } catch (error) {
            this.handlePrismaError(error, 'createHaulerUser', { phone: data.phone });
            throw error;
        }
    }

    // ============ Profile Lookups ============

    /**
     * Finds hauler registration by token
     * Used to continue multi-step registration flow
     */
    async findByRegistrationToken(token: string) {
        try {
            return await prisma.haulerProfile.findUnique({
                where: { registrationToken: token },
                include: {
                    user: { select: { id: true, phone: true, name: true, alternatePhone: true } },
                    documents: true,
                },
            });
        } catch (error) {
            logger.error({ error, token }, 'Error finding by registration token');
            throw error;
        }
    }

    /**
     * Finds hauler profile by user ID
     */
    async findByUserId(userId: number) {
        try {
            return await prisma.haulerProfile.findUnique({
                where: { userId },
                include: {
                    user: { select: { id: true, phone: true, name: true, alternatePhone: true } },
                    documents: true,
                },
            });
        } catch (error) {
            logger.error({ error, userId }, 'Error finding hauler by user ID');
            throw error;
        }
    }

    /**
     * Checks if vehicle number already exists
     */
    async vehicleNumberExists(vehicleNumber: string): Promise<boolean> {
        try {
            const existing = await prisma.haulerProfile.findFirst({
                where: {
                    vehicleNumber,
                    NOT: { vehicleNumber: { startsWith: 'TEMP-' } }
                },
            });
            return !!existing;
        } catch (error) {
            logger.error({ error, vehicleNumber }, 'Error checking vehicle number');
            throw error;
        }
    }

    // ============ Step Updates ============

    /**
     * Updates hauler profile with vehicle information (Step 2)
     */
    async updateVehicleInfo(haulerId: number, data: Omit<AddVehicleInfoData, 'userId'>) {
        try {
            const profile = await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: {
                    vehicleType: data.vehicleType,
                    vehicleNumber: data.vehicleNumber,
                    payloadCapacityKg: data.payloadCapacityKg,
                    currentStep: 2,
                },
            });

            logger.info({ haulerId }, 'Vehicle info updated');
            return profile;
        } catch (error) {
            this.handlePrismaError(error, 'updateVehicleInfo', { haulerId });
            throw error;
        }
    }

    /**
     * Updates hauler profile with license information (Step 3)
     */
    async updateLicenseInfo(haulerId: number, data: Omit<AddLicenseInfoData, 'haulerId'>) {
        try {
            const profile = await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: {
                    dlNumber: data.dlNumber,
                    dlExpiry: data.dlExpiry,
                    currentStep: 3,
                },
            });

            logger.info({ haulerId }, 'License info updated');
            return profile;
        } catch (error) {
            logger.error({ error, haulerId }, 'Error updating license info');
            throw error;
        }
    }

    /**
     * Marks registration step 4 (payment) complete
     */
    async completeStep4(haulerId: number) {
        try {
            return await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: { currentStep: 4 },
            });
        } catch (error) {
            logger.error({ error, haulerId }, 'Error completing step 4');
            throw error;
        }
    }

    // ============ Registration Submission ============

    /**
     * Submits hauler registration for verification
     * Sets status to PENDING_VERIFICATION and clears registration token
     */
    async submitRegistration(haulerId: number) {
        try {
            const profile = await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: {
                    verificationStatus: 'PENDING_VERIFICATION',
                    stepCompleted: true,
                    registrationToken: null, // Clear temp token
                },
                include: {
                    user: { select: { id: true, phone: true, name: true } },
                },
            });

            logger.info({ haulerId, userId: profile.userId }, 'Hauler registration submitted');
            return profile;
        } catch (error) {
            logger.error({ error, haulerId }, 'Error submitting registration');
            throw error;
        }
    }

    // ============ Document Management ============

    /**
     * Adds a document reference to hauler profile
     */
    async addDocument(data: AddDocumentData) {
        try {
            const doc = await prisma.haulerDocument.create({
                data: {
                    haulerId: data.haulerId,
                    docType: data.docType,
                    storageUrl: data.storageUrl,
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    mimeType: data.mimeType,
                },
            });

            logger.info({ haulerId: data.haulerId, docType: data.docType }, 'Document added');
            return doc;
        } catch (error) {
            logger.error({ error, haulerId: data.haulerId }, 'Error adding document');
            throw error;
        }
    }

    /**
     * Gets all documents for a hauler
     */
    async getDocuments(haulerId: number) {
        try {
            return await prisma.haulerDocument.findMany({
                where: { haulerId },
                orderBy: { uploadedAt: 'desc' },
            });
        } catch (error) {
            logger.error({ error, haulerId }, 'Error getting documents');
            throw error;
        }
    }

    // ============ Admin Verification ============

    /**
     * Gets pending hauler verifications for admin review
     */
    async getPendingVerifications(params: PaginationParams) {
        try {
            const skip = (params.page - 1) * params.limit;

            const [haulers, total] = await Promise.all([
                prisma.haulerProfile.findMany({
                    where: { verificationStatus: 'PENDING_VERIFICATION', stepCompleted: true },
                    include: {
                        user: { select: { id: true, phone: true, name: true } },
                        documents: true,
                    },
                    orderBy: { createdAt: 'asc' }, // Oldest first (FIFO queue)
                    skip,
                    take: params.limit,
                }),
                prisma.haulerProfile.count({
                    where: { verificationStatus: 'PENDING_VERIFICATION', stepCompleted: true },
                }),
            ]);

            return {
                haulers,
                pagination: {
                    page: params.page,
                    limit: params.limit,
                    total,
                    totalPages: Math.ceil(total / params.limit),
                },
            };
        } catch (error) {
            logger.error({ error }, 'Error getting pending verifications');
            throw error;
        }
    }

    /**
     * Approves a hauler registration
     */
    async approveHauler(haulerId: number, verifiedById: number) {
        try {
            const profile = await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: {
                    verificationStatus: 'ACTIVE',
                    verifiedById,
                    verifiedAt: new Date(),
                    rejectionReason: null,
                },
                include: {
                    user: { select: { id: true, phone: true, name: true } },
                },
            });

            logger.info({ haulerId, verifiedById }, 'Hauler approved');
            return profile;
        } catch (error) {
            logger.error({ error, haulerId }, 'Error approving hauler');
            throw error;
        }
    }

    /**
     * Rejects a hauler registration with reason
     */
    async rejectHauler(haulerId: number, verifiedById: number, reason: string) {
        try {
            const profile = await prisma.haulerProfile.update({
                where: { id: haulerId },
                data: {
                    verificationStatus: 'REJECTED',
                    verifiedById,
                    verifiedAt: new Date(),
                    rejectionReason: reason,
                },
                include: {
                    user: { select: { id: true, phone: true, name: true } },
                },
            });

            logger.info({ haulerId, verifiedById, reason }, 'Hauler rejected');
            return profile;
        } catch (error) {
            logger.error({ error, haulerId }, 'Error rejecting hauler');
            throw error;
        }
    }

    // ============ Error Handling ============

    /**
     * Handles Prisma-specific errors with better messages
     */
    private handlePrismaError(error: unknown, operation: string, context: Record<string, unknown>) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                const field = (error.meta?.target as string[])?.join(', ') || 'field';
                logger.warn({ ...context, field }, `Duplicate ${field} in ${operation}`);
                throw new Error(`DUPLICATE_${field.toUpperCase()}`);
            }
            if (error.code === 'P2025') {
                logger.warn(context, `Record not found in ${operation}`);
                throw new Error('RECORD_NOT_FOUND');
            }
        }
        logger.error({ error, ...context }, `Error in ${operation}`);
    }
}

// Export singleton instance
export const haulerRepository = new HaulerRepository();
