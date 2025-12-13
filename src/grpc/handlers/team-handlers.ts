/**
 * Team Management gRPC Handlers
 * Story 2.4 - Buyer Team Management & Role Assignment
 * 
 * This module handles all team-related gRPC operations including:
 * - Team member invitations (AC2, AC3)
 * - Invitation acceptance (AC4)
 * - Team member listing with filters (AC1, AC5)
 * - Role updates (AC6)
 * - Member deactivation/deletion (AC7)
 * - Invitation resend (AC9)
 * 
 * @module grpc/handlers/team
 */

import * as grpc from '@grpc/grpc-js';
import { Logger } from 'pino';
import { TeamManagementService } from '../../services/team-management-service';
import { RolePermissionService } from '../../services/role-permission-service';
import { prisma } from '../../lib/prisma';


/**
 * Buyer team roles (matches schema.prisma BuyerTeamRole enum)
 * Using const object so it can be used as both type and value
 * TODO: Replace with Prisma types after running `prisma generate`
 */
export const BUYER_TEAM_ROLES = {
    ADMIN: 'ADMIN',
    PROCUREMENT_MANAGER: 'PROCUREMENT_MANAGER',
    FINANCE_USER: 'FINANCE_USER',
    RECEIVING_STAFF: 'RECEIVING_STAFF',
} as const;

export type BuyerTeamRole = typeof BUYER_TEAM_ROLES[keyof typeof BUYER_TEAM_ROLES];

/**
 * Team member status (matches schema.prisma TeamMemberStatus enum)
 * TODO: Replace with Prisma types after running `prisma generate`
 */
export type TeamMemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

/**
 * Team handler dependencies interface
 */
export interface TeamHandlerDependencies {
    logger: Logger;
    teamService?: TeamManagementService;
    permissionService?: RolePermissionService;
}

/**
 * Create team management gRPC handlers
 * 
 * @param deps - Handler dependencies (logger, services)
 * @returns Object containing all team-related gRPC handlers
 */
export function createTeamHandlers(deps: TeamHandlerDependencies) {
    const { logger } = deps;
    const teamService = deps.teamService || new TeamManagementService(prisma);
    const permissionService = deps.permissionService || new RolePermissionService();

    return {
        /**
         * InviteTeamMember - Send invitation to join organization (AC2, AC3)
         * 
         * Validates admin permissions, checks for duplicates, generates secure token,
         * and creates invitation record with 24-hour expiry.
         */
        InviteTeamMember: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({ buyerOrgId: request.buyer_org_id, email: request.email }, 'InviteTeamMember called');

            try {
                // Validate required fields
                if (!request.buyer_org_id || !request.email || !request.mobile_number || !request.role) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id, email, mobile_number, and role are required',
                    });
                }

                // Validate role
                if (!permissionService.isValidRole(request.role)) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: `Invalid role. Must be one of: ${Object.values(BUYER_TEAM_ROLES).join(', ')}`,
                    });
                }

                const result = await teamService.inviteTeamMember({
                    buyerOrgId: request.buyer_org_id,
                    email: request.email,
                    mobile: request.mobile_number,
                    role: request.role as BuyerTeamRole,
                    note: request.note,
                    invitedById: request.invited_by_user_id,
                });

                callback(null, {
                    success: true,
                    message: 'Invitation sent successfully',
                    invitation_id: result.invitation.id.toString(),
                    email: result.invitation.email,
                    role: result.invitation.role,
                    expires_at: result.invitation.expiresAt.toISOString(),
                    status: 'PENDING',
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in InviteTeamMember');
                return handleTeamError(error, callback);
            }
        },

        /**
         * AcceptTeamInvitation - Complete registration for invited user (AC4)
         * 
         * Validates token, creates user account, establishes team membership,
         * and returns JWT for immediate login.
         */
        AcceptTeamInvitation: async (call: any, callback: any) => {
            const request = call.request;
            logger.info('AcceptTeamInvitation called');

            try {
                // Validate required fields
                if (!request.token || !request.full_name || !request.password) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'token, full_name, and password are required',
                    });
                }

                const result = await teamService.acceptInvitation({
                    token: request.token,
                    fullName: request.full_name,
                    password: request.password,
                });

                callback(null, {
                    token: result.token,
                    refreshToken: '', // TODO: Implement refresh token
                    user: {
                        id: result.user.id.toString(),
                        name: result.user.name || '',
                        phone: result.user.phone,
                        userType: result.user.role,
                    },
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in AcceptTeamInvitation');
                return handleTeamError(error, callback);
            }
        },

        /**
         * ListTeamMembers - Get paginated list of team members (AC1, AC5)
         * 
         * Supports filtering by role, status, and search query.
         * Returns formatted member list with pagination info.
         */
        ListTeamMembers: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({ buyerOrgId: request.buyer_org_id }, 'ListTeamMembers called');

            try {
                // Validate required fields
                if (!request.buyer_org_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id is required',
                    });
                }

                // Parse optional filters
                const roleFilter = request.role_filter
                    ? permissionService.parseRole(request.role_filter)
                    : undefined;

                const statusFilter = request.status_filter
                    ? (request.status_filter as TeamMemberStatus)
                    : undefined;

                const result = await teamService.listTeamMembers({
                    buyerOrgId: request.buyer_org_id,
                    requesterId: request.requester_id || 0, // TODO: Get from auth context
                    page: request.page || 1,
                    limit: request.limit || 10,
                    roleFilter,
                    statusFilter,
                    search: request.search || undefined,
                });

                callback(null, {
                    success: true,
                    members: result.members,
                    pagination: result.pagination,
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in ListTeamMembers');
                return handleTeamError(error, callback);
            }
        },

        /**
         * UpdateTeamMemberRole - Change a member's role (AC6)
         * 
         * Validates admin permissions and last-admin protection.
         * Creates audit trail for role changes.
         */
        UpdateTeamMemberRole: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({
                buyerOrgId: request.buyer_org_id,
                memberId: request.member_id,
                newRole: request.new_role
            }, 'UpdateTeamMemberRole called');

            try {
                // Validate required fields
                if (!request.buyer_org_id || !request.member_id || !request.new_role) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id, member_id, and new_role are required',
                    });
                }

                // Validate role
                if (!permissionService.isValidRole(request.new_role)) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: `Invalid role. Must be one of: ${Object.values(BUYER_TEAM_ROLES).join(', ')}`,
                    });
                }

                const result = await teamService.updateMemberRole({
                    buyerOrgId: request.buyer_org_id,
                    memberId: parseInt(request.member_id, 10),
                    newRole: request.new_role as BuyerTeamRole,
                    changedById: request.changed_by_user_id,
                });

                callback(null, {
                    success: true,
                    message: 'Role updated successfully',
                    member_id: result.memberId,
                    old_role: result.oldRole,
                    new_role: result.newRole,
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in UpdateTeamMemberRole');
                return handleTeamError(error, callback);
            }
        },

        /**
         * DeactivateTeamMember - Disable member access (AC7)
         * 
         * Revokes active sessions and sets status to INACTIVE.
         * Protected against self-deactivation and last-admin removal.
         */
        DeactivateTeamMember: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({
                buyerOrgId: request.buyer_org_id,
                memberId: request.member_id
            }, 'DeactivateTeamMember called');

            try {
                // Validate required fields
                if (!request.buyer_org_id || !request.member_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id and member_id are required',
                    });
                }

                await teamService.deactivateMember({
                    buyerOrgId: request.buyer_org_id,
                    memberId: parseInt(request.member_id, 10),
                    deactivatedById: request.deactivated_by_user_id,
                });

                callback(null, {
                    success: true,
                    message: 'Member deactivated successfully',
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in DeactivateTeamMember');
                return handleTeamError(error, callback);
            }
        },

        /**
         * DeleteTeamMember - Remove member from organization (AC7)
         * 
         * Permanently removes team membership record.
         * Protected against self-deletion and last-admin removal.
         */
        DeleteTeamMember: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({
                buyerOrgId: request.buyer_org_id,
                memberId: request.member_id
            }, 'DeleteTeamMember called');

            try {
                // Validate required fields
                if (!request.buyer_org_id || !request.member_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id and member_id are required',
                    });
                }

                await teamService.deleteMember({
                    buyerOrgId: request.buyer_org_id,
                    memberId: parseInt(request.member_id, 10),
                    deletedById: request.deleted_by_user_id,
                });

                callback(null, {
                    success: true,
                    message: 'Member deleted successfully',
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in DeleteTeamMember');
                return handleTeamError(error, callback);
            }
        },

        /**
         * ResendTeamInvitation - Regenerate and resend invitation (AC9)
         * 
         * Generates new token, resets 24-hour expiry, and sends new email/SMS.
         */
        ResendTeamInvitation: async (call: any, callback: any) => {
            const request = call.request;
            logger.info({
                buyerOrgId: request.buyer_org_id,
                invitationId: request.invitation_id
            }, 'ResendTeamInvitation called');

            try {
                // Validate required fields
                if (!request.buyer_org_id || !request.invitation_id) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'buyer_org_id and invitation_id are required',
                    });
                }

                const result = await teamService.resendInvitation({
                    buyerOrgId: request.buyer_org_id,
                    invitationId: parseInt(request.invitation_id, 10),
                    resentById: request.resent_by_user_id,
                });

                callback(null, {
                    success: true,
                    message: 'Invitation resent successfully',
                    invitation_id: result.invitation.id.toString(),
                    email: result.invitation.email,
                    role: result.invitation.role,
                    expires_at: result.invitation.expiresAt.toISOString(),
                    status: 'PENDING',
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in ResendTeamInvitation');
                return handleTeamError(error, callback);
            }
        },

        /**
         * ValidateInvitationToken - Check if invitation is valid (for frontend)
         * 
         * Returns invitation details if token is valid and not expired.
         * Used by accept-invitation screen to prefill data.
         */
        ValidateInvitationToken: async (call: any, callback: any) => {
            const request = call.request;
            logger.info('ValidateInvitationToken called');

            try {
                // Validate required fields
                if (!request.token) {
                    return callback({
                        code: grpc.status.INVALID_ARGUMENT,
                        details: 'token is required',
                    });
                }

                const result = await teamService.validateInvitationToken(request.token);

                callback(null, {
                    valid: result.valid,
                    email: result.email || '',
                    business_name: result.businessName || '',
                    role: result.role || '',
                    expires_at: result.expiresAt || '',
                });

            } catch (error: any) {
                logger.error({ error: error.message }, 'Error in ValidateInvitationToken');
                callback(null, { valid: false });
            }
        },
    };
}

/**
 * Map error codes to gRPC status codes
 * 
 * @param error - Error object with message containing error code prefix
 * @param callback - gRPC callback function
 */
function handleTeamError(error: any, callback: any): void {
    const message = error.message || 'Unknown error';

    // Parse error code from message (format: "CODE: message")
    const [code, ...rest] = message.split(':');
    const details = rest.join(':').trim() || message;

    // Map error codes to gRPC status
    const errorMap: Record<string, number> = {
        'DUPLICATE_EMAIL': grpc.status.ALREADY_EXISTS,
        'INVALID_ROLE': grpc.status.INVALID_ARGUMENT,
        'UNAUTHORIZED': grpc.status.PERMISSION_DENIED,
        'INVALID_TOKEN': grpc.status.NOT_FOUND,
        'INVITATION_EXPIRED': grpc.status.FAILED_PRECONDITION,
        'WEAK_PASSWORD': grpc.status.INVALID_ARGUMENT,
        'MEMBER_NOT_FOUND': grpc.status.NOT_FOUND,
        'LAST_ADMIN': grpc.status.FAILED_PRECONDITION,
        'SELF_ACTION': grpc.status.INVALID_ARGUMENT,
        'INVITATION_NOT_FOUND': grpc.status.NOT_FOUND,
        'ALREADY_ACCEPTED': grpc.status.FAILED_PRECONDITION,
    };

    const grpcCode = errorMap[code] || grpc.status.INTERNAL;

    callback({
        code: grpcCode,
        details: JSON.stringify({ error: code, message: details }),
    });
}

export default createTeamHandlers;
