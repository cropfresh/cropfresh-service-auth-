import { valkey } from '../utils/valkey';
import { logger } from '../utils/logger';

const LOGIN_ATTEMPT_TTL_SECONDS = 1800; // 30 minutes lockout
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_SECONDS = 1800; // 30 minutes

export interface LockoutStatus {
    isLocked: boolean;
    lockedUntil?: Date;
    remainingAttempts: number;
}

export class LoginLockoutService {
    /**
     * Gets the current lockout status for a phone number
     */
    async getLockoutStatus(phoneNumber: string): Promise<LockoutStatus> {
        const lockoutKey = `login:lockout:${phoneNumber}`;
        const attemptsKey = `login:attempts:${phoneNumber}`;

        // Check if account is locked
        const lockedUntilStr = await valkey.get(lockoutKey);
        if (lockedUntilStr) {
            const lockedUntil = new Date(lockedUntilStr);
            if (lockedUntil > new Date()) {
                return {
                    isLocked: true,
                    lockedUntil,
                    remainingAttempts: 0,
                };
            }
            // Lockout expired, clean up
            await valkey.del(lockoutKey);
            await valkey.del(attemptsKey);
        }

        // Get current attempt count
        const attemptsStr = await valkey.get(attemptsKey);
        const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

        return {
            isLocked: false,
            remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
        };
    }

    /**
     * Records a failed login attempt and potentially locks the account
     * @returns LockoutStatus after recording the attempt
     */
    async recordFailedAttempt(phoneNumber: string): Promise<LockoutStatus> {
        const attemptsKey = `login:attempts:${phoneNumber}`;
        const lockoutKey = `login:lockout:${phoneNumber}`;

        // Increment attempt counter
        const attempts = await valkey.incr(attemptsKey);

        // Set TTL on first attempt
        if (attempts === 1) {
            await valkey.expire(attemptsKey, LOGIN_ATTEMPT_TTL_SECONDS);
        }

        logger.warn({ phoneNumber, attempts }, 'Failed login attempt recorded');

        // Check if we need to lock the account
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_SECONDS * 1000);
            await valkey.setex(lockoutKey, LOCKOUT_DURATION_SECONDS, lockedUntil.toISOString());

            logger.warn({ phoneNumber, lockedUntil }, 'Account locked due to failed attempts');

            return {
                isLocked: true,
                lockedUntil,
                remainingAttempts: 0,
            };
        }

        return {
            isLocked: false,
            remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
        };
    }

    /**
     * Clears failed attempts on successful login
     */
    async clearFailedAttempts(phoneNumber: string): Promise<void> {
        const attemptsKey = `login:attempts:${phoneNumber}`;
        const lockoutKey = `login:lockout:${phoneNumber}`;

        await valkey.del(attemptsKey);
        await valkey.del(lockoutKey);

        logger.info({ phoneNumber }, 'Cleared failed login attempts');
    }
}
