/**
 * Agent Repository - Story 2.6
 * 
 * Data access layer for field agent operations:
 * - Create agents with profiles and zone assignments
 * - Query agents with filters (status, zone, search)
 * - Update agent status and zone assignments
 * 
 * @module repositories/agent-repository
 */

import { prisma, User, UserRole, AgentProfile, AgentStatus, EmploymentType, Zone, AgentZoneAssignment } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const PIN_SALT_ROUNDS = 12;

// Input types for agent operations
export interface CreateAgentInput {
    fullName: string;
    mobileNumber: string;
    zoneId: number;
    startDate: Date;
    employmentType: EmploymentType;
    createdById: number;
    temporaryPin: string;
}

export interface ListAgentsFilter {
    status?: AgentStatus;
    zoneId?: number;
    search?: string;
    districtManagerId: number;
    page: number;
    limit: number;
}

export interface AgentWithProfile extends User {
    agentProfile: AgentProfile & {
        zoneAssignments: (AgentZoneAssignment & { zone: Zone })[];
    };
}

/**
 * Repository class for field agent data operations
 */
export class AgentRepository {

    /**
     * Creates a new agent with profile and zone assignment in a transaction
     * Returns the created agent with employee ID
     */
    async createAgent(input: CreateAgentInput): Promise<{
        user: User;
        agentProfile: AgentProfile;
        employeeId: string;
    }> {
        const { fullName, mobileNumber, zoneId, startDate, employmentType, createdById, temporaryPin } = input;

        // Hash the temporary PIN
        const hashedPin = await bcrypt.hash(temporaryPin, PIN_SALT_ROUNDS);

        // Set PIN expiration to 24 hours from now
        const pinExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Generate employee ID (e.g., AGT-BLR-001)
        const employeeId = await this.generateEmployeeId();

        return prisma.$transaction(async (tx) => {
            // Create user with AGENT role
            const user = await tx.user.create({
                data: {
                    phone: mobileNumber,
                    name: fullName,
                    role: UserRole.AGENT,
                    temporaryPin: hashedPin,
                    pinExpiresAt,
                    isActive: true,
                },
            });

            // Create agent profile
            const agentProfile = await tx.agentProfile.create({
                data: {
                    userId: user.id,
                    employeeId,
                    employmentType,
                    status: AgentStatus.TRAINING,
                    startDate,
                    createdById,
                },
            });

            // Create zone assignment
            await tx.agentZoneAssignment.create({
                data: {
                    agentId: agentProfile.id,
                    zoneId,
                    assignedById: createdById,
                    effectiveFrom: startDate,
                },
            });

            logger.info({ agentId: agentProfile.id, employeeId }, 'Agent created successfully');
            return { user, agentProfile, employeeId };
        });
    }

    /**
     * Generates unique employee ID in format AGT-XXX-NNN
     */
    private async generateEmployeeId(): Promise<string> {
        const count = await prisma.agentProfile.count();
        const sequence = (count + 1).toString().padStart(3, '0');
        return `AGT-KA-${sequence}`;
    }

    /**
     * Finds an agent by mobile number
     */
    async findByMobile(mobileNumber: string): Promise<AgentWithProfile | null> {
        return prisma.user.findFirst({
            where: {
                phone: mobileNumber,
                role: UserRole.AGENT,
                deletedAt: null,
            },
            include: {
                agentProfile: {
                    include: {
                        zoneAssignments: {
                            where: { effectiveTo: null },
                            include: { zone: true },
                        },
                    },
                },
            },
        }) as Promise<AgentWithProfile | null>;
    }

    /**
     * Finds an agent by user ID
     */
    async findByUserId(userId: number): Promise<AgentWithProfile | null> {
        return prisma.user.findFirst({
            where: {
                id: userId,
                role: UserRole.AGENT,
                deletedAt: null,
            },
            include: {
                agentProfile: {
                    include: {
                        zoneAssignments: {
                            where: { effectiveTo: null },
                            include: { zone: true },
                        },
                    },
                },
            },
        }) as Promise<AgentWithProfile | null>;
    }

    /**
     * Lists agents with filtering and pagination
     */
    async listAgents(filter: ListAgentsFilter): Promise<{
        agents: AgentWithProfile[];
        total: number;
    }> {
        const { status, zoneId, search, districtManagerId, page, limit } = filter;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            role: UserRole.AGENT,
            deletedAt: null,
            agentProfile: {
                createdById: districtManagerId,
                ...(status && { status }),
            },
        };

        // Add search filter
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        // Add zone filter
        if (zoneId) {
            where.agentProfile = {
                ...where.agentProfile,
                zoneAssignments: {
                    some: {
                        zoneId,
                        effectiveTo: null,
                    },
                },
            };
        }

        const [agents, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    agentProfile: {
                        include: {
                            zoneAssignments: {
                                where: { effectiveTo: null },
                                include: { zone: true },
                            },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return { agents: agents as AgentWithProfile[], total };
    }

    /**
     * Updates agent status
     */
    async updateStatus(
        agentProfileId: number,
        status: AgentStatus,
        reason?: string
    ): Promise<AgentProfile> {
        const updateData: any = { status };

        if (status === AgentStatus.INACTIVE) {
            updateData.deactivatedAt = new Date();
            updateData.deactivationReason = reason;
        } else if (status === AgentStatus.ACTIVE) {
            updateData.trainingCompletedAt = new Date();
        }

        return prisma.agentProfile.update({
            where: { id: agentProfileId },
            data: updateData,
        });
    }

    /**
     * Reassigns agent to a new zone
     */
    async reassignZone(
        agentProfileId: number,
        newZoneId: number,
        assignedById: number,
        effectiveFrom: Date
    ): Promise<void> {
        await prisma.$transaction(async (tx) => {
            // End current assignment
            await tx.agentZoneAssignment.updateMany({
                where: {
                    agentId: agentProfileId,
                    effectiveTo: null,
                },
                data: {
                    effectiveTo: effectiveFrom,
                },
            });

            // Create new assignment
            await tx.agentZoneAssignment.create({
                data: {
                    agentId: agentProfileId,
                    zoneId: newZoneId,
                    assignedById,
                    effectiveFrom,
                },
            });
        });

        logger.info({ agentProfileId, newZoneId }, 'Agent zone reassigned');
    }

    /**
     * Clears temporary PIN after successful PIN change
     */
    async clearTemporaryPin(userId: number): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                temporaryPin: null,
                pinExpiresAt: null,
            },
        });
    }

    /**
     * Sets the permanent PIN for an agent
     */
    async setPermanentPin(userId: number, pin: string): Promise<void> {
        const hashedPin = await bcrypt.hash(pin, PIN_SALT_ROUNDS);
        await prisma.user.update({
            where: { id: userId },
            data: {
                pinHash: hashedPin,
                temporaryPin: null,
                pinExpiresAt: null,
            },
        });
        logger.info({ userId }, 'Agent permanent PIN set');
    }

    /**
     * Verifies the temporary PIN for first-time login
     */
    async verifyTemporaryPin(mobileNumber: string, pin: string): Promise<{
        valid: boolean;
        expired: boolean;
        user?: User;
    }> {
        const user = await prisma.user.findFirst({
            where: {
                phone: mobileNumber,
                role: UserRole.AGENT,
                deletedAt: null,
            },
        });

        if (!user || !user.temporaryPin) {
            return { valid: false, expired: false };
        }

        // Check expiration
        if (user.pinExpiresAt && new Date() > user.pinExpiresAt) {
            return { valid: false, expired: true };
        }

        // Verify PIN
        const isValid = await bcrypt.compare(pin, user.temporaryPin);
        return { valid: isValid, expired: false, user: isValid ? user : undefined };
    }
}
