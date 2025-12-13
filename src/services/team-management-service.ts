import { PrismaClient, BuyerTeamRole, TeamMemberStatus, TeamMembership, TeamInvitation, User } from '../generated/prisma/client';
import { TeamMembershipRepository } from '../repositories/team-membership-repository';
import { TeamInvitationRepository } from '../repositories/team-invitation-repository';
import { PasswordValidationService } from './password-validation-service';
import * as bcrypt from 'bcrypt';

/**
 * TeamManagementService - Business logic for team management
 * Story 2.4 - All ACs
 */
export class TeamManagementService {
    private membershipRepo: TeamMembershipRepository;
    private invitationRepo: TeamInvitationRepository;
    private passwordService: PasswordValidationService;

    constructor(private prisma: PrismaClient) {
        this.membershipRepo = new TeamMembershipRepository(prisma);
        this.invitationRepo = new TeamInvitationRepository(prisma);
        this.passwordService = new PasswordValidationService();
    }

    /**
     * Invite a new team member (AC2, AC3)
     */
    async inviteTeamMember(params: {
        buyerOrgId: number;
        email: string;
        mobile: string;
        role: BuyerTeamRole;
        note?: string;
        invitedById: number;
    }): Promise<{ invitation: TeamInvitation; rawToken: string }> {
        // AC3: Check for duplicate email
        const isDuplicate = await this.invitationRepo.isDuplicateEmail(params.buyerOrgId, params.email);
        if (isDuplicate) {
            throw new Error('DUPLICATE_EMAIL: User already exists or has pending invitation');
        }

        // AC2: Validate role
        if (!Object.values(BuyerTeamRole).includes(params.role)) {
            throw new Error('INVALID_ROLE: Role must be one of: ADMIN, PROCUREMENT_MANAGER, FINANCE_USER, RECEIVING_STAFF');
        }

        // Verify inviter is admin
        const inviter = await this.membershipRepo.findByUserAndOrg(params.invitedById, params.buyerOrgId);
        if (!inviter || inviter.role !== BuyerTeamRole.ADMIN) {
            throw new Error('UNAUTHORIZED: Only admins can invite team members');
        }

        // AC3: Create invitation with secure token
        const result = await this.invitationRepo.create(params);

        // TODO: Send email and SMS notifications
        // await this.notificationService.sendInvitationEmail(params.email, result.rawToken);
        // await this.notificationService.sendInvitationSms(params.mobile, result.rawToken);

        return result;
    }

    /**
     * Accept team invitation (AC4)
     */
    async acceptInvitation(params: {
        token: string;
        fullName: string;
        password: string;
    }): Promise<{ user: User; token: string }> {
        // Validate invitation token
        const invitation = await this.invitationRepo.validateToken(params.token);
        if (!invitation) {
            throw new Error('INVALID_TOKEN: Invitation not found or expired');
        }

        // AC9: Check if expired
        if (this.invitationRepo.isExpired(invitation)) {
            throw new Error('INVITATION_EXPIRED: This invitation has expired. Please request a new one.');
        }

        // Validate password strength (same as Story 2.3)
        const passwordValid = this.passwordService.validatePassword(params.password);
        if (!passwordValid.isValid) {
            throw new Error(`WEAK_PASSWORD: ${passwordValid.errors.join(', ')}`);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(params.password, 12);

        // Transaction: Create user + membership + mark invitation accepted
        const result = await this.prisma.$transaction(async (tx) => {
            // Create new user account
            const user = await tx.user.create({
                data: {
                    phone: invitation.mobile,
                    email: invitation.email,
                    name: params.fullName,
                    passwordHash,
                    role: 'BUYER', // All team members are buyers
                    isActive: true,
                    emailVerified: true, // Consider email verified since they clicked invite link
                    emailVerifiedAt: new Date()
                }
            });

            // Create team membership
            await tx.teamMembership.create({
                data: {
                    buyerOrgId: invitation.buyerOrgId,
                    userId: user.id,
                    role: invitation.role,
                    status: TeamMemberStatus.ACTIVE,
                    invitedById: invitation.invitedById,
                    acceptedAt: new Date()
                }
            });

            // Mark invitation as accepted
            await tx.teamInvitation.update({
                where: { id: invitation.id },
                data: {
                    accepted: true,
                    acceptedAt: new Date()
                }
            });

            return user;
        });

        // TODO: Generate JWT token and return
        // const jwt = await this.authService.generateToken(result);

        return { user: result, token: 'jwt-placeholder' };
    }

    /**
     * List team members with pagination and filters (AC1, AC5)
     */
    async listTeamMembers(params: {
        buyerOrgId: number;
        requesterId: number;
        page?: number;
        limit?: number;
        roleFilter?: BuyerTeamRole;
        statusFilter?: TeamMemberStatus;
        search?: string;
    }) {
        // Verify requester has access to this org
        const requesterMembership = await this.membershipRepo.findByUserAndOrg(params.requesterId, params.buyerOrgId);
        if (!requesterMembership) {
            throw new Error('UNAUTHORIZED: Not a member of this organization');
        }

        const { members, total } = await this.membershipRepo.listMembers(params.buyerOrgId, {
            page: params.page,
            limit: params.limit,
            roleFilter: params.roleFilter,
            statusFilter: params.statusFilter,
            search: params.search
        });

        const page = params.page || 1;
        const limit = params.limit || 10;

        return {
            members: members.map(m => this.formatMember(m)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update team member role (AC6)
     */
    async updateMemberRole(params: {
        buyerOrgId: number;
        memberId: number;
        newRole: BuyerTeamRole;
        changedById: number;
        reason?: string;
    }) {
        // Verify changer is admin
        const changer = await this.membershipRepo.findByUserAndOrg(params.changedById, params.buyerOrgId);
        if (!changer || changer.role !== BuyerTeamRole.ADMIN) {
            throw new Error('UNAUTHORIZED: Only admins can modify roles');
        }

        const targetMembership = await this.membershipRepo.findByUserAndOrg(params.memberId, params.buyerOrgId);
        if (!targetMembership) {
            throw new Error('MEMBER_NOT_FOUND: Team member not found');
        }

        // AC7: Prevent changing own role if last admin
        if (params.memberId === params.changedById) {
            if (targetMembership.role === BuyerTeamRole.ADMIN && params.newRole !== BuyerTeamRole.ADMIN) {
                const isLast = await this.membershipRepo.isLastAdmin(params.memberId, params.buyerOrgId);
                if (isLast) {
                    throw new Error('LAST_ADMIN: Cannot demote the last admin. Promote another member first.');
                }
            }
        }

        const { membership, roleChange } = await this.membershipRepo.updateRole(
            targetMembership.id,
            params.newRole,
            params.changedById,
            params.reason
        );

        return {
            memberId: params.memberId.toString(),
            oldRole: roleChange.oldRole,
            newRole: roleChange.newRole
        };
    }

    /**
     * Deactivate team member (AC7)
     */
    async deactivateMember(params: {
        buyerOrgId: number;
        memberId: number;
        deactivatedById: number;
    }) {
        // Verify deactivator is admin
        const requester = await this.membershipRepo.findByUserAndOrg(params.deactivatedById, params.buyerOrgId);
        if (!requester || requester.role !== BuyerTeamRole.ADMIN) {
            throw new Error('UNAUTHORIZED: Only admins can deactivate members');
        }

        // Prevent self-deactivation
        if (params.memberId === params.deactivatedById) {
            throw new Error('SELF_ACTION: Cannot deactivate yourself');
        }

        const membership = await this.membershipRepo.findByUserAndOrg(params.memberId, params.buyerOrgId);
        if (!membership) {
            throw new Error('MEMBER_NOT_FOUND: Team member not found');
        }

        // AC7: Last admin protection
        if (membership.role === BuyerTeamRole.ADMIN) {
            const isLast = await this.membershipRepo.isLastAdmin(params.memberId, params.buyerOrgId);
            if (isLast) {
                throw new Error('LAST_ADMIN: Cannot deactivate the last admin');
            }
        }

        await this.membershipRepo.deactivate(membership.id);

        // TODO: Revoke active sessions for this user
        // await this.sessionService.revokeAllSessions(params.memberId);

        return { success: true };
    }

    /**
     * Delete team member (AC7)
     */
    async deleteMember(params: {
        buyerOrgId: number;
        memberId: number;
        deletedById: number;
    }) {
        // Same validations as deactivate
        const requester = await this.membershipRepo.findByUserAndOrg(params.deletedById, params.buyerOrgId);
        if (!requester || requester.role !== BuyerTeamRole.ADMIN) {
            throw new Error('UNAUTHORIZED: Only admins can delete members');
        }

        if (params.memberId === params.deletedById) {
            throw new Error('SELF_ACTION: Cannot delete yourself');
        }

        const membership = await this.membershipRepo.findByUserAndOrg(params.memberId, params.buyerOrgId);
        if (!membership) {
            throw new Error('MEMBER_NOT_FOUND: Team member not found');
        }

        if (membership.role === BuyerTeamRole.ADMIN) {
            const isLast = await this.membershipRepo.isLastAdmin(params.memberId, params.buyerOrgId);
            if (isLast) {
                throw new Error('LAST_ADMIN: Cannot delete the last admin');
            }
        }

        await this.membershipRepo.softDelete(params.memberId, params.buyerOrgId);

        return { success: true };
    }

    /**
     * Resend invitation (AC9)
     */
    async resendInvitation(params: {
        buyerOrgId: number;
        invitationId: number;
        resentById: number;
    }) {
        // Verify admin
        const requester = await this.membershipRepo.findByUserAndOrg(params.resentById, params.buyerOrgId);
        if (!requester || requester.role !== BuyerTeamRole.ADMIN) {
            throw new Error('UNAUTHORIZED: Only admins can resend invitations');
        }

        const invitation = await this.invitationRepo.findById(params.invitationId);
        if (!invitation || invitation.buyerOrgId !== params.buyerOrgId) {
            throw new Error('INVITATION_NOT_FOUND: Invitation not found');
        }

        if (invitation.accepted) {
            throw new Error('ALREADY_ACCEPTED: This invitation has already been accepted');
        }

        const result = await this.invitationRepo.resend(params.invitationId);

        // TODO: Send email and SMS notifications with new token
        // await this.notificationService.sendInvitationEmail(invitation.email, result.rawToken);

        return result;
    }

    /**
     * Validate invitation token (for frontend)
     */
    async validateInvitationToken(token: string) {
        const invitation = await this.invitationRepo.validateToken(token);
        if (!invitation) {
            return { valid: false };
        }

        // Check if expired
        if (this.invitationRepo.isExpired(invitation)) {
            return { valid: false, reason: 'EXPIRED' };
        }

        // Get organization info
        const buyerOrg = await this.prisma.buyerProfile.findUnique({
            where: { id: invitation.buyerOrgId }
        });

        return {
            valid: true,
            email: invitation.email,
            businessName: buyerOrg?.businessName || '',
            role: invitation.role,
            expiresAt: invitation.expiresAt.toISOString()
        };
    }

    private formatMember(membership: TeamMembership & { user: User }) {
        return {
            id: membership.userId.toString(),
            name: membership.user.name || '',
            email: membership.user.email || '',
            phone: membership.user.phone,
            role: membership.role,
            status: membership.status,
            lastLoginAt: membership.user.lastLoginAt?.toISOString() || '',
            joinedAt: membership.acceptedAt?.toISOString() || membership.createdAt.toISOString(),
            avatarUrl: '' // Placeholder: implement avatar URL generation
        };
    }
}
