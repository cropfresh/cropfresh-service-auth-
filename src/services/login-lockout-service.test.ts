import { LoginLockoutService } from './login-lockout-service';

// Mock valkey
jest.mock('../utils/valkey', () => ({
    valkey: {
        get: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
    },
}));

import { valkey } from '../utils/valkey';

const mockedValkey = valkey as jest.Mocked<typeof valkey>;

describe('LoginLockoutService', () => {
    let service: LoginLockoutService;
    const testPhone = '+919876543210';

    beforeEach(() => {
        service = new LoginLockoutService();
        jest.clearAllMocks();
    });

    describe('getLockoutStatus', () => {
        it('should return not locked when no lockout exists', async () => {
            mockedValkey.get.mockResolvedValueOnce(null); // No lockout
            mockedValkey.get.mockResolvedValueOnce(null); // No attempts

            const status = await service.getLockoutStatus(testPhone);

            expect(status.isLocked).toBe(false);
            expect(status.remainingAttempts).toBe(3);
        });

        it('should return locked when lockout is active', async () => {
            const futureDate = new Date(Date.now() + 1000 * 60 * 15).toISOString();
            mockedValkey.get.mockResolvedValueOnce(futureDate);

            const status = await service.getLockoutStatus(testPhone);

            expect(status.isLocked).toBe(true);
            expect(status.lockedUntil).toBeDefined();
            expect(status.remainingAttempts).toBe(0);
        });

        it('should clear expired lockout and return not locked', async () => {
            const pastDate = new Date(Date.now() - 1000 * 60 * 5).toISOString();
            mockedValkey.get.mockResolvedValueOnce(pastDate); // Expired lockout
            mockedValkey.get.mockResolvedValueOnce(null); // No attempts

            const status = await service.getLockoutStatus(testPhone);

            expect(status.isLocked).toBe(false);
            expect(mockedValkey.del).toHaveBeenCalledTimes(2); // Both keys cleared
        });

        it('should return correct remaining attempts', async () => {
            mockedValkey.get.mockResolvedValueOnce(null); // No lockout
            mockedValkey.get.mockResolvedValueOnce('2'); // 2 attempts made

            const status = await service.getLockoutStatus(testPhone);

            expect(status.isLocked).toBe(false);
            expect(status.remainingAttempts).toBe(1); // 3 - 2 = 1
        });
    });

    describe('recordFailedAttempt', () => {
        it('should increment attempt counter on first failure', async () => {
            mockedValkey.incr.mockResolvedValue(1);

            const status = await service.recordFailedAttempt(testPhone);

            expect(mockedValkey.incr).toHaveBeenCalled();
            expect(mockedValkey.expire).toHaveBeenCalled();
            expect(status.isLocked).toBe(false);
            expect(status.remainingAttempts).toBe(2);
        });

        it('should lock account after 3 failed attempts', async () => {
            mockedValkey.incr.mockResolvedValue(3);

            const status = await service.recordFailedAttempt(testPhone);

            expect(mockedValkey.setex).toHaveBeenCalled();
            expect(status.isLocked).toBe(true);
            expect(status.lockedUntil).toBeDefined();
            expect(status.remainingAttempts).toBe(0);
        });

        it('should not set expire on subsequent failures', async () => {
            mockedValkey.incr.mockResolvedValue(2);

            await service.recordFailedAttempt(testPhone);

            expect(mockedValkey.expire).not.toHaveBeenCalled();
        });
    });

    describe('clearFailedAttempts', () => {
        it('should delete both keys', async () => {
            await service.clearFailedAttempts(testPhone);

            expect(mockedValkey.del).toHaveBeenCalledTimes(2);
        });
    });
});
