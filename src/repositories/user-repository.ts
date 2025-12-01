import { PrismaClient, User, UserRole } from '../generated/prisma';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class UserRepository {
    async findByPhoneNumber(phone: string): Promise<User | null> {
        try {
            return await prisma.user.findUnique({
                where: { phone },
            });
        } catch (error) {
            logger.error({ error, phone }, 'Error finding user by phone number');
            throw error;
        }
    }

    async createFarmer(phone: string, language: string): Promise<User> {
        try {
            return await prisma.user.create({
                data: {
                    phone,
                    role: UserRole.FARMER,
                    language,
                },
            });
        } catch (error) {
            logger.error({ error, phone }, 'Error creating farmer account');
            throw error;
        }
    }
}
