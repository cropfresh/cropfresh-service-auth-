import { PrismaClient, TeamMembership, TeamInvitation, TeamRoleChange, BuyerTeamRole, TeamMemberStatus, Prisma, User } from '../generated/prisma/client';

/**
 * TeamMembershipRepository - Data access for team memberships
 * Story 2.4 - AC1, AC5, AC6, AC7
 */
export class TeamMembershipRepository {
    constructor(private prisma: PrismaClient) { }

    /**
     * Find team membership by user ID and organization
     */
    async findByUserAndOrg(userId: number, buyerOrgId: number): Promise<TeamMembership | null> {
        return this.prisma.teamMembership.findUnique({
            where: {
                buyerOrgId_userId: { buyerOrgId, userId }
            }
        });
    }

    /**
     * Find team membership by ID
     */
    async findById(id: number): Promise<TeamMembership | null> {
        return this.prisma.teamMembership.findUnique({
            where: { id },
            include: { user: true, buyerOrg: true }
        });
    }

    /**
     * List team members with pagination and filters (AC1, AC5)
     */
    async listMembers(
        buyerOrgId: number,
        options: {
            page?: number;
            limit?: number;
            roleFilter?: BuyerTeamRole;
            statusFilter?: TeamMemberStatus;
            search?: string;
        }
    ): Promise<{ members: (TeamMembership & { user: User })[]; total: number }> {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 10, 50);
        const skip = (page - 1) * limit;

        const where: Prisma.TeamMembershipWhereInput = {
            buyerOrgId,
            ...(options.roleFilter && { role: options.roleFilter }),
            ...(options.statusFilter && { status: options.statusFilter }),
            ...(options.search && {
                user: {
                    OR: [
                        { name: { contains: options.search, mode: 'insensitive' } },
                        { email: { contains: options.search, mode: 'insensitive' } }
                    ]
                }
            })
        };

        const [members, total] = await Promise.all([
            this.prisma.teamMembership.findMany({
                where,
                skip,
                take: limit,
                include: { user: true },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.teamMembership.count({ where })
        ]);

        return { members, total };
    }

    /**
     * Create a new team membership
     */
    async create(data: {
        buyerOrgId: number;
        userId: number;
        role: BuyerTeamRole;
        status?: TeamMemberStatus;
        invitedById?: number;
    }): Promise<TeamMembership> {
        return this.prisma.teamMembership.create({
            data: {
                buyerOrgId: data.buyerOrgId,
                userId: data.userId,
                role: data.role,
                status: data.status || TeamMemberStatus.ACTIVE,
                invitedById: data.invitedById,
                acceptedAt: new Date()
            }
        });
    }

    /**
     * Update member role (AC6)
     */
    async updateRole(
        id: number,
        newRole: BuyerTeamRole,
        changedById: number,
        reason?: string
    ): Promise<{ membership: TeamMembership; roleChange: TeamRoleChange }> {
        const existing = await this.prisma.teamMembership.findUnique({ where: { id } });
        if (!existing) {
            throw new Error('Team membership not found');
        }

        const [membership, roleChange] = await this.prisma.$transaction([
            this.prisma.teamMembership.update({
                where: { id },
                data: { role: newRole }
            }),
            this.prisma.teamRoleChange.create({
                data: {
                    teamMembershipId: id,
                    oldRole: existing.role,
                    newRole,
                    changedById,
                    reason
                }
            })
        ]);

        return { membership, roleChange };
    }

    /**
     * Deactivate member (AC7) - Sets status to INACTIVE
     */
    async deactivate(id: number): Promise<TeamMembership> {
        return this.prisma.teamMembership.update({
            where: { id },
            data: { status: TeamMemberStatus.INACTIVE }
        });
    }

    /**
     * Soft delete member (AC7) - Removes from organization
     */
    async softDelete(userId: number, buyerOrgId: number): Promise<void> {
        // Update user's deletedAt timestamp for soft delete
        await this.prisma.$transaction([
            this.prisma.teamMembership.delete({
                where: { buyerOrgId_userId: { buyerOrgId, userId } }
            })
        ]);
    }

    /**
     * Count active admins in organization (AC7 - last admin protection)
     */
    async countActiveAdmins(buyerOrgId: number): Promise<number> {
        return this.prisma.teamMembership.count({
            where: {
                buyerOrgId,
                role: BuyerTeamRole.ADMIN,
                status: TeamMemberStatus.ACTIVE
            }
        });
    }

    /**
     * Check if user is the last active admin
     */
    async isLastAdmin(userId: number, buyerOrgId: number): Promise<boolean> {
        const membership = await this.findByUserAndOrg(userId, buyerOrgId);
        if (!membership || membership.role !== BuyerTeamRole.ADMIN) {
            return false;
        }

        const adminCount = await this.countActiveAdmins(buyerOrgId);
        return adminCount === 1;
    }
}
