import { PrismaClient } from '@prisma/client';

async function main() {
    try {
        const prisma = new PrismaClient();
        console.log('Prisma initialized successfully');
        await prisma.$disconnect();
    } catch (e) {
        console.error('Prisma initialization failed:', e);
    }
}

main();
