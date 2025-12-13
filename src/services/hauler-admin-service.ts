/**
 * HaulerAdminService
 * ------------------
 * Story 2.5: Hauler Account Creation with Vehicle Verification
 * 
 * Provides admin functionality for District Managers:
 * - Get pending hauler verifications (AC7)
 * - Approve hauler accounts (AC7)
 * - Reject hauler accounts with reason (AC7)
 * - Vehicle eligibility lookup (AC8)
 * 
 * @author Dev Agent
 * @created 2025-12-12
 */

import pino from 'pino';

import { haulerRepository, HaulerRepository } from '../repositories/hauler-repository';
import {
    VEHICLE_ELIGIBILITY_RULES,
    VehicleEligibilityRule,
    VehicleType
} from './hauler-validation-service';
import { ExotelService } from './exotel-service';

const logger = pino({ name: 'hauler-admin-service' });

// ============ Type Definitions ============

/** Pending hauler for verification queue */
export interface PendingHauler {
    haulerId: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    dlNumber: string;
    submittedAt: string;
    photoUrls: string[];
}

/** Verification request */
export interface VerifyHaulerRequest {
    haulerId: string;
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
    verifiedByUserId: number;
}

/** Verification response */
export interface VerifyHaulerResponse {
    success: boolean;
    message: string;
    newStatus?: string;
}

/** Pagination info */
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/** Pending haulers list response */
export interface GetPendingHaulersResponse {
    success: boolean;
    haulers: PendingHauler[];
    pagination: Pagination;
}

// ============ Rejection Reasons ============

/** Standard rejection reasons (AC7) */
export const REJECTION_REASONS = [
    'Invalid DL',
    'Vehicle mismatch',
    'Photo unclear',
    'Expired license',
    'Incomplete information',
    'Other',
] as const;

export type RejectionReason = typeof REJECTION_REASONS[number];

// ============ HaulerAdminService Class ============

export class HaulerAdminService {
    private repo: HaulerRepository;
    private exotelService: ExotelService;

    constructor(repo?: HaulerRepository, exotelService?: ExotelService) {
        this.repo = repo || haulerRepository;
        this.exotelService = exotelService || new ExotelService();
    }

    // ============ Verification Queue ============

    /**
     * Gets list of pending hauler verifications for admin review
     * Ordered by submission date (oldest first - FIFO queue)
     * 
     * @param page - Page number (1-indexed)
     * @param limit - Items per page (max 50)
     * @param districtFilter - Optional district filter (not yet implemented)
     * @returns Paginated list of pending haulers
     */
    async getPendingVerifications(
        page: number = 1,
        limit: number = 10,
        districtFilter?: string
    ): Promise<GetPendingHaulersResponse> {
        // Validate pagination
        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 50);

        logger.info({ page: validPage, limit: validLimit, districtFilter }, 'Getting pending verifications');

        try {
            const result = await this.repo.getPendingVerifications({
                page: validPage,
                limit: validLimit,
            });

            // Transform to response format
            const haulers: PendingHauler[] = result.haulers.map((h) => ({
                haulerId: h.id.toString(),
                name: h.user.name || 'Unknown',
                phone: h.user.phone,
                vehicleType: h.vehicleType,
                vehicleNumber: h.vehicleNumber,
                dlNumber: this.maskDLNumber(h.dlNumber), // Mask for security
                submittedAt: h.createdAt.toISOString(),
                photoUrls: h.documents.map((d) => d.storageUrl),
            }));

            return {
                success: true,
                haulers,
                pagination: result.pagination,
            };
        } catch (error) {
            logger.error({ error }, 'Error getting pending verifications');
            return {
                success: false,
                haulers: [],
                pagination: { page: validPage, limit: validLimit, total: 0, totalPages: 0 },
            };
        }
    }

    // ============ Verification Actions ============

    /**
     * Approves or rejects a hauler registration
     * Sends notification SMS to hauler
     * 
     * @param req - Verification request
     * @returns Verification result
     */
    async verifyHauler(req: VerifyHaulerRequest): Promise<VerifyHaulerResponse> {
        logger.info({
            haulerId: req.haulerId,
            action: req.action,
            verifiedBy: req.verifiedByUserId
        }, 'Processing hauler verification');

        // Validate hauler ID
        const haulerId = parseInt(req.haulerId, 10);
        if (isNaN(haulerId)) {
            return { success: false, message: 'Invalid hauler ID' };
        }

        // Validate rejection reason if rejecting
        if (req.action === 'REJECT') {
            if (!req.rejectionReason || req.rejectionReason.trim().length === 0) {
                return { success: false, message: 'Rejection reason is required' };
            }
        }

        try {
            if (req.action === 'APPROVE') {
                return await this.approveHauler(haulerId, req.verifiedByUserId);
            } else {
                return await this.rejectHauler(haulerId, req.verifiedByUserId, req.rejectionReason!);
            }
        } catch (error) {
            logger.error({ error, haulerId }, 'Error verifying hauler');
            return { success: false, message: 'Verification failed. Please try again.' };
        }
    }

    /**
     * Approves hauler and sends notification
     */
    private async approveHauler(haulerId: number, verifiedById: number): Promise<VerifyHaulerResponse> {
        const profile = await this.repo.approveHauler(haulerId, verifiedById);

        // Send approval SMS
        await this.sendApprovalNotification(profile.user.phone, profile.user.name);

        logger.info({ haulerId, verifiedById }, 'Hauler approved');

        return {
            success: true,
            message: 'Hauler approved successfully',
            newStatus: 'ACTIVE',
        };
    }

    /**
     * Rejects hauler with reason and sends notification
     */
    private async rejectHauler(
        haulerId: number,
        verifiedById: number,
        reason: string
    ): Promise<VerifyHaulerResponse> {
        const profile = await this.repo.rejectHauler(haulerId, verifiedById, reason);

        // Send rejection SMS
        await this.sendRejectionNotification(profile.user.phone, reason);

        logger.info({ haulerId, verifiedById, reason }, 'Hauler rejected');

        return {
            success: true,
            message: 'Hauler registration rejected',
            newStatus: 'REJECTED',
        };
    }

    // ============ Notifications ============

    /**
     * Sends approval notification SMS
     */
    private async sendApprovalNotification(phone: string, name: string | null): Promise<void> {
        const message = `Congratulations${name ? ` ${name}` : ''}! Your CropFresh Hauler account is now active. Start accepting delivery routes now.`;

        try {
            await this.exotelService.sendSMS(phone, message);
        } catch (error) {
            logger.warn({ error, phone }, 'Failed to send approval SMS');
            // Don't throw - verification succeeded, SMS is best-effort
        }
    }

    /**
     * Sends rejection notification SMS with reason
     */
    private async sendRejectionNotification(phone: string, reason: string): Promise<void> {
        const message = `Your CropFresh Hauler registration was not approved. Reason: ${reason}. Please update your details and resubmit.`;

        try {
            await this.exotelService.sendSMS(phone, message);
        } catch (error) {
            logger.warn({ error, phone }, 'Failed to send rejection SMS');
        }
    }

    // ============ Vehicle Eligibility ============

    /**
     * Gets vehicle eligibility rules
     * 
     * @param vehicleType - Optional specific type, returns all if not provided
     * @returns Eligibility rules
     */
    getVehicleEligibility(vehicleType?: string): VehicleEligibilityRule[] {
        if (!vehicleType) {
            return VEHICLE_ELIGIBILITY_RULES;
        }

        const normalized = vehicleType.toUpperCase() as VehicleType;
        const rule = VEHICLE_ELIGIBILITY_RULES.find(r => r.type === normalized);

        return rule ? [rule] : [];
    }

    // ============ Hauler Profile ============

    /**
     * Gets hauler profile by user ID
     * 
     * @param userId - User ID to lookup
     * @returns Hauler profile data or null
     */
    async getHaulerProfile(userId: number) {
        try {
            const profile = await this.repo.findByUserId(userId);

            if (!profile) {
                return null;
            }

            return {
                haulerId: profile.id.toString(),
                userId: profile.userId.toString(),
                name: profile.user.name,
                phone: profile.user.phone,
                alternatePhone: profile.user.alternatePhone,
                vehicleType: profile.vehicleType,
                vehicleNumber: profile.vehicleNumber,
                payloadCapacityKg: profile.payloadCapacityKg,
                dlNumber: this.maskDLNumber(profile.dlNumber),
                dlExpiry: profile.dlExpiry.toISOString().split('T')[0],
                verificationStatus: profile.verificationStatus,
                verifiedAt: profile.verifiedAt?.toISOString(),
                rejectionReason: profile.rejectionReason,
                documents: profile.documents.map(d => ({
                    id: d.id.toString(),
                    documentType: d.docType,
                    url: d.storageUrl,
                    uploadedAt: d.uploadedAt.toISOString(),
                })),
            };
        } catch (error) {
            logger.error({ error, userId }, 'Error getting hauler profile');
            throw error;
        }
    }

    // ============ Utility Methods ============

    /**
     * Masks DL number for security (shows first 2 and last 4 chars)
     * Example: KA012020123456 -> KA******3456
     */
    private maskDLNumber(dlNumber: string): string {
        if (dlNumber.length <= 6) {
            return dlNumber;
        }
        const prefix = dlNumber.slice(0, 2);
        const suffix = dlNumber.slice(-4);
        return `${prefix}${'*'.repeat(dlNumber.length - 6)}${suffix}`;
    }
}

// Export singleton instance
export const haulerAdminService = new HaulerAdminService();
