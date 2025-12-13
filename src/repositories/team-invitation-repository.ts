import { PrismaClient, TeamInvitation, BuyerTeamRole, Prisma } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * TeamInvitationRepository - Data access for team invitations
 * Story 2.4 - AC2, AC3, AC9
 */
export class TeamInvitationRepository {
    constructor(private prisma: PrismaClient) { }

    /**
     * Create a new invitation with hashed token (AC3)
     */
    async create(data: {
        buyerOrgId: number;
        email: string;
        mobile: string;
        role: BuyerTeamRole;
        note?: string;
        invitedById: number;
    }): Promise<{ invitation: TeamInvitation; rawToken: string }> {
        // Generate 32-byte cryptographically random token
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Hash token with bcrypt for storage
        const tokenHash = await bcrypt.hash(rawToken, 10);

        // Set 24-hour expiry
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const invitation = await this.prisma.teamInvitation.create({
            data: {
                buyerOrgId: data.buyerOrgId,
                email: data.email,
                mobile: data.mobile,
                role: data.role,
                note: data.note,
                tokenHash,
                expiresAt,
                invitedById: data.invitedById
            }
        });

        return { invitation, rawToken };
    }

    /**
     * Find invitation by ID
     */
    async findById(id: number): Promise<TeamInvitation | null> {
        return this.prisma.teamInvitation.findUnique({
            where: { id },
            include: { buyerOrg: true, invitedBy: true }
        });
    }

    /**
     * Find invitation by email within organization
     */
    async findByEmail(buyerOrgId: number, email: string): Promise<TeamInvitation | null> {
        return this.prisma.teamInvitation.findFirst({
            where: {
                buyerOrgId,
                email,
                accepted: false
            }
        });
    }

    /**
     * Validate invitation token and return invitation if valid (AC3, AC9)
     */
    async validateToken(rawToken: string): Promise<TeamInvitation | null> {
        // Find all non-expired, non-accepted invitations
        const invitations = await this.prisma.teamInvitation.findMany({
            where: {
                accepted: false,
                expiresAt: { gt: new Date() }
            },
            include: { buyerOrg: true }
        });

        // Check each invitation's token hash
        for (const invitation of invitations) {
            const isValid = await bcrypt.compare(rawToken, invitation.tokenHash);
            if (isValid) {
                return invitation;
            }
        }

        return null;
    }

    /**
     * Mark invitation as accepted (AC4)
     */
    async markAccepted(id: number): Promise<TeamInvitation> {
        return this.prisma.teamInvitation.update({
            where: { id },
            data: {
                accepted: true,
                acceptedAt: new Date()
            }
        });
    }

    /**
     * Check if invitation is expired (AC9)
     */
    isExpired(invitation: TeamInvitation): boolean {
        return new Date() > invitation.expiresAt;
    }

    /**
     * Regenerate invitation token for resend (AC9)
     */
    async resend(id: number): Promise<{ invitation: TeamInvitation; rawToken: string }> {
        // Generate new token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        // Reset expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const invitation = await this.prisma.teamInvitation.update({
            where: { id },
            data: {
                tokenHash,
                expiresAt,
                accepted: false,
                acceptedAt: null
            }
        });

        return { invitation, rawToken };
    }

    /**
     * List pending invitations for an organization
     */
    async listPending(buyerOrgId: number): Promise<TeamInvitation[]> {
        return this.prisma.teamInvitation.findMany({
            where: {
                buyerOrgId,
                accepted: false
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Delete invitation
     */
    async delete(id: number): Promise<void> {
        await this.prisma.teamInvitation.delete({
            where: { id }
        });
    }

    /**
     * Check for duplicate email in organization (AC3)
     */
    async isDuplicateEmail(buyerOrgId: number, email: string): Promise<boolean> {
        // Check if user already exists in organization
        const existingMember = await this.prisma.teamMembership.findFirst({
            where: {
                buyerOrgId,
                user: { email }
            }
        });

        if (existingMember) {
            return true;
        }

        // Check if there's a pending invitation
        const pendingInvite = await this.findByEmail(buyerOrgId, email);
        return pendingInvite !== null;
    }
}
