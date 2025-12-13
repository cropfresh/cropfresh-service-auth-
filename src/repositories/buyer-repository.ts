import { prisma, BusinessType, User, BuyerProfile } from '../lib/prisma';


/**
 * Buyer Repository
 * Story 2.3 - Buyer Business Account Creation
 * 
 * Handles CRUD operations for buyer accounts and profiles
 */
export interface CreateBuyerData {
    phone: string;
    email: string;
    passwordHash: string;
    businessName: string;
    businessType: BusinessType;
    gstNumber?: string;
    address: {
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
        latitude?: number;
        longitude?: number;
    };
}

// User with BuyerProfile included
export type BuyerWithProfile = User & {
    buyerProfile: BuyerProfile | null;
};

export class BuyerRepository {
    /**
     * Check if email already exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user !== null;
    }

    /**
     * Check if phone number already exists
     */
    async phoneExists(phone: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { phone },
        });
        return user !== null;
    }

    /**
     * Create buyer account with profile
     */
    async createBuyer(data: CreateBuyerData): Promise<BuyerWithProfile> {
        const result = await prisma.user.create({
            data: {
                phone: data.phone,
                email: data.email.toLowerCase(),
                passwordHash: data.passwordHash,
                role: 'BUYER',
                isActive: true,
                emailVerified: false,
                buyerProfile: {
                    create: {
                        businessName: data.businessName,
                        businessType: data.businessType,
                        gstNumber: data.gstNumber,
                        addressLine1: data.address.addressLine1,
                        addressLine2: data.address.addressLine2,
                        city: data.address.city,
                        state: data.address.state,
                        pincode: data.address.pincode,
                        latitude: data.address.latitude,
                        longitude: data.address.longitude,
                    },
                },
            },
            include: {
                buyerProfile: true,
            },
        });
        return result as unknown as BuyerWithProfile;
    }

    /**
     * Find buyer by ID with profile
     */
    async findById(id: number): Promise<BuyerWithProfile | null> {
        const result = await prisma.user.findUnique({
            where: { id, role: 'BUYER' },
            include: { buyerProfile: true },
        });
        return result as unknown as BuyerWithProfile | null;
    }

    /**
     * Find buyer by phone with profile
     */
    async findByPhone(phone: string): Promise<BuyerWithProfile | null> {
        const result = await prisma.user.findUnique({
            where: { phone },
            include: { buyerProfile: true },
        });
        return result as unknown as BuyerWithProfile | null;
    }

    /**
     * Find buyer by email with profile
     */
    async findByEmail(email: string): Promise<BuyerWithProfile | null> {
        const result = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { buyerProfile: true },
        });
        return result as unknown as BuyerWithProfile | null;
    }

    /**
     * Update buyer profile
     */
    async updateProfile(
        userId: number,
        data: Partial<{
            businessName: string;
            businessType: BusinessType;
            gstNumber: string;
            addressLine1: string;
            addressLine2: string;
            city: string;
            state: string;
            pincode: string;
            latitude: number;
            longitude: number;
        }>
    ): Promise<BuyerProfile> {
        return prisma.buyerProfile.update({
            where: { userId },
            data,
        });
    }

    /**
     * Mark email as verified
     */
    async verifyEmail(userId: number): Promise<User> {
        return prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),
            },
        });
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId: number): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }
}

export const buyerRepository = new BuyerRepository();
