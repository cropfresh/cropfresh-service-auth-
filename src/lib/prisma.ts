/**
 * Centralized PrismaClient singleton for Auth Service
 * Uses the new Prisma 7 driver adapter pattern
 */
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Create the PostgreSQL adapter with connection string
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Export singleton PrismaClient instance
export const prisma = new PrismaClient({ adapter });

// Re-export all types and enum values from generated client
export {
    PrismaClient,
    Prisma,
} from '../generated/prisma/client';

// Re-export types (using type-only export for model types)
export type {
    User,
    Session,
    FarmerProfile,
    BuyerProfile,
    HaulerProfile,
    HaulerDocument,
    VehicleEligibility,
    PaymentDetails,
    TeamMembership,
    TeamInvitation,
    TeamRoleChange,
    PasswordResetToken,
    // Story 2.6 - Field Agent types
    AgentProfile,
    Zone,
    AgentZoneAssignment,
} from '../generated/prisma/client';

// Re-export enums as values (not type-only) so they can be used at runtime
export {
    UserRole,
    FarmSize,
    PaymentType,
    BusinessType,
    BuyerTeamRole,
    TeamMemberStatus,
    HaulerStatus,
    VehicleType,
    HaulerDocumentType,
    // Story 2.6 - Field Agent enums
    AgentStatus,
    EmploymentType,
    ZoneType,
} from '../generated/prisma/client';

