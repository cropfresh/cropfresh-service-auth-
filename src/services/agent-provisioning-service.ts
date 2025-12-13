/**
 * Agent Provisioning Service - Story 2.6
 * 
 * Business logic for field agent account management:
 * - Create agent accounts (AC2, AC3)
 * - First-time login with temp PIN (AC4)
 * - PIN change and validation (AC4)
 * - Training completion (AC5)
 * - Agent deactivation (AC7)
 * 
 * @module services/agent-provisioning-service
 */

import { AgentRepository, CreateAgentInput, AgentWithProfile } from '../repositories/agent-repository';
import { ZoneRepository } from '../repositories/zone-repository';
import { ExotelService } from './exotel-service';
import { validatePin, validatePinMatch, validateTemporaryPin, generateTemporaryPin } from '../validators/pin-validator';
import { AgentStatus, EmploymentType } from '../lib/prisma';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cropfresh-dev-secret';
const JWT_EXPIRES_IN = '7d';
const TEMP_TOKEN_EXPIRES_IN = '15m'; // For PIN change flow

// Service response types
export interface CreateAgentResult {
    success: boolean;
    message: string;
    agentId?: string;
    employeeId?: string;
    status?: string;
    smsSent: boolean;
}

export interface FirstLoginResult {
    success: boolean;
    message: string;
    requiresPinChange: boolean;
    temporaryToken?: string;
    agentName?: string;
    errorCode?: string;
}

export interface SetPinResult {
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    requiresTraining: boolean;
    errorCode?: string;
}

export interface TrainingCompleteResult {
    success: boolean;
    message: string;
    status: string;
    dashboardUnlocked: boolean;
}

/**
 * Service class for agent provisioning operations
 */
export class AgentProvisioningService {
    private agentRepo: AgentRepository;
    private zoneRepo: ZoneRepository;
    private exotelService: ExotelService;

    constructor() {
        this.agentRepo = new AgentRepository();
        this.zoneRepo = new ZoneRepository();
        this.exotelService = new ExotelService();
    }

    /**
     * Creates a new field agent account (AC2, AC3)
     * - Validates mobile number for duplicates
     * - Generates temporary PIN
     * - Sends SMS with credentials
     */
    async createAgent(
        fullName: string,
        mobileNumber: string,
        zoneId: number,
        startDate: Date,
        employmentType: EmploymentType,
        createdById: number
    ): Promise<CreateAgentResult> {
        try {
            // Check for duplicate mobile
            const existing = await this.agentRepo.findByMobile(mobileNumber);
            if (existing) {
                return {
                    success: false,
                    message: 'This mobile number is already registered',
                    smsSent: false,
                };
            }

            // Validate zone exists
            const zone = await this.zoneRepo.getZoneById(zoneId);
            if (!zone) {
                return {
                    success: false,
                    message: 'Invalid zone selection',
                    smsSent: false,
                };
            }

            // Generate 6-digit temporary PIN
            const temporaryPin = generateTemporaryPin();

            // Create agent in database
            const input: CreateAgentInput = {
                fullName,
                mobileNumber,
                zoneId,
                startDate,
                employmentType,
                createdById,
                temporaryPin,
            };

            const { user, agentProfile, employeeId } = await this.agentRepo.createAgent(input);

            // Send SMS with credentials
            let smsSent = false;
            try {
                const smsMessage = this.buildWelcomeSms(fullName, mobileNumber, temporaryPin);
                await this.exotelService.sendSMS(mobileNumber, smsMessage);
                smsSent = true;
                logger.info({ agentId: agentProfile.id }, 'Welcome SMS sent to agent');
            } catch (smsError) {
                logger.warn({ agentId: agentProfile.id, error: smsError }, 'Failed to send welcome SMS');
            }

            return {
                success: true,
                message: `Agent account created. SMS sent to ${mobileNumber}`,
                agentId: agentProfile.id.toString(),
                employeeId,
                status: AgentStatus.TRAINING,
                smsSent,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to create agent');
            throw error;
        }
    }

    /**
     * Handles first-time agent login with temporary PIN (AC4)
     * - Validates PIN format and expiration
     * - Returns temporary token for PIN change
     */
    async firstLogin(mobileNumber: string, pin: string): Promise<FirstLoginResult> {
        // Validate PIN format
        const formatCheck = validateTemporaryPin(pin);
        if (!formatCheck.valid) {
            return {
                success: false,
                message: formatCheck.error || 'Invalid PIN format',
                requiresPinChange: false,
                errorCode: 'INVALID_PIN_FORMAT',
            };
        }

        // Verify against database
        const result = await this.agentRepo.verifyTemporaryPin(mobileNumber, pin);

        if (result.expired) {
            return {
                success: false,
                message: 'Your login PIN has expired. Contact your manager.',
                requiresPinChange: false,
                errorCode: 'PIN_EXPIRED',
            };
        }

        if (!result.valid || !result.user) {
            return {
                success: false,
                message: 'Invalid PIN. Please check and try again.',
                requiresPinChange: false,
                errorCode: 'INVALID_PIN',
            };
        }

        // Generate temporary token for PIN change flow
        const temporaryToken = jwt.sign(
            { userId: result.user.id, purpose: 'pin_change' },
            JWT_SECRET,
            { expiresIn: TEMP_TOKEN_EXPIRES_IN }
        );

        return {
            success: true,
            message: 'PIN verified. Please set your new PIN.',
            requiresPinChange: true,
            temporaryToken,
            agentName: result.user.name || 'Agent',
        };
    }

    /**
     * Sets the permanent PIN after first login (AC4)
     * - Validates PIN rules (no sequential/repeated)
     * - Validates confirmation match
     * - Returns JWT tokens for app access
     */
    async setPin(temporaryToken: string, newPin: string, confirmPin: string): Promise<SetPinResult> {
        // Verify temporary token
        let decoded: any;
        try {
            decoded = jwt.verify(temporaryToken, JWT_SECRET);
            if (decoded.purpose !== 'pin_change') {
                throw new Error('Invalid token purpose');
            }
        } catch (error) {
            return {
                success: false,
                message: 'Session expired. Please login again.',
                requiresTraining: false,
                errorCode: 'TOKEN_EXPIRED',
            };
        }

        // Validate PIN format and rules
        const pinValidation = validatePin(newPin);
        if (!pinValidation.valid) {
            return {
                success: false,
                message: pinValidation.error || 'Invalid PIN format',
                requiresTraining: false,
                errorCode: pinValidation.errorCode,
            };
        }

        // Validate PIN match
        const matchValidation = validatePinMatch(newPin, confirmPin);
        if (!matchValidation.valid) {
            return {
                success: false,
                message: matchValidation.error || 'PINs do not match',
                requiresTraining: false,
                errorCode: 'MISMATCH',
            };
        }

        // Set permanent PIN
        const userId = decoded.userId;
        await this.agentRepo.setPermanentPin(userId, newPin);

        // Get agent profile to check training status
        const agent = await this.agentRepo.findByUserId(userId);
        const requiresTraining = agent?.agentProfile?.status === AgentStatus.TRAINING;

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { userId, role: 'AGENT' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        const refreshToken = jwt.sign(
            { userId, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return {
            success: true,
            message: 'PIN set successfully',
            accessToken,
            refreshToken,
            requiresTraining,
        };
    }

    /**
     * Marks agent training as complete (AC5)
     * - Updates status from TRAINING to ACTIVE
     * - Unlocks dashboard access
     */
    async completeTraining(userId: number): Promise<TrainingCompleteResult> {
        const agent = await this.agentRepo.findByUserId(userId);

        if (!agent?.agentProfile) {
            return {
                success: false,
                message: 'Agent not found',
                status: '',
                dashboardUnlocked: false,
            };
        }

        if (agent.agentProfile.status !== AgentStatus.TRAINING) {
            return {
                success: true,
                message: 'Training already completed',
                status: agent.agentProfile.status,
                dashboardUnlocked: true,
            };
        }

        await this.agentRepo.updateStatus(agent.agentProfile.id, AgentStatus.ACTIVE);

        logger.info({ userId, agentId: agent.agentProfile.id }, 'Agent training completed');

        return {
            success: true,
            message: 'Training complete! Start your work.',
            status: AgentStatus.ACTIVE,
            dashboardUnlocked: true,
        };
    }

    /**
     * Deactivates an agent account (AC7)
     * - Sets status to INACTIVE
     * - Sends notification SMS
     */
    async deactivateAgent(
        agentId: number,
        reason: string,
        deactivatedById: number
    ): Promise<{ success: boolean; message: string; smsSent: boolean }> {
        const agent = await this.agentRepo.findByUserId(agentId);

        if (!agent?.agentProfile) {
            return { success: false, message: 'Agent not found', smsSent: false };
        }

        await this.agentRepo.updateStatus(agent.agentProfile.id, AgentStatus.INACTIVE, reason);

        // Send deactivation SMS
        let smsSent = false;
        try {
            const smsMessage = 'Your CropFresh agent account has been deactivated. Contact your manager for details.';
            await this.exotelService.sendSMS(agent.phone, smsMessage);
            smsSent = true;
        } catch (error) {
            logger.warn({ agentId }, 'Failed to send deactivation SMS');
        }

        return {
            success: true,
            message: 'Agent deactivated',
            smsSent,
        };
    }

    /**
     * Builds welcome SMS message for new agent
     */
    private buildWelcomeSms(name: string, mobile: string, pin: string): string {
        const appLink = 'https://play.google.com/store/apps/details?id=com.cropfresh.agent';
        return `Welcome to CropFresh, ${name}! Download the Agents app: ${appLink}. Login with ${mobile} + PIN: ${pin}. Valid for 24 hours.`;
    }
}
