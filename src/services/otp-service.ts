import { valkey } from '../utils/valkey';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const OTP_TTL_SECONDS = 600; // 10 minutes
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes
const MAX_ATTEMPTS_PER_WINDOW = 3;

export class OtpService {
    /**
     * Generates a 6-digit OTP
     */
    private generateNumericOTP(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Generates and stores an OTP for a given phone number.
     * Checks rate limits before generating.
     * @param phoneNumber The phone number to generate OTP for
     * @returns The generated OTP or null if rate limit exceeded
     */
    async generateOTP(phoneNumber: string): Promise<string | null> {
        const rateLimitKey = `otp:rate:${phoneNumber}`;
        const attempts = await valkey.incr(rateLimitKey);

        if (attempts === 1) {
            await valkey.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
        }

        if (attempts > MAX_ATTEMPTS_PER_WINDOW) {
            logger.warn({ phoneNumber }, 'OTP rate limit exceeded');
            return null;
        }

        const otp = this.generateNumericOTP();
        const otpKey = `otp:farmer:${phoneNumber}`;

        // Store OTP with hash for security (simple hash for now, can be enhanced)
        // For this implementation, we'll store the plain OTP but in a real prod env, consider hashing
        // However, since we need to send it, we usually store the plain one briefly or generate, send, then hash.
        // Given the requirement "Verify entered OTP against stored hash", we will store a hash.
        // But wait, if we store a hash, we can't retrieve it to send it via SMS if the SMS sending is async/decoupled?
        // Usually, you generate -> send -> store hash.
        // Let's assume the caller will handle sending immediately after generation.

        // Using simple sha256 for storage
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        await valkey.setex(otpKey, OTP_TTL_SECONDS, otpHash);
        logger.info({ phoneNumber }, 'OTP generated and stored');

        return otp;
    }

    /**
     * Verifies the provided OTP against the stored hash.
     * @param phoneNumber The phone number to verify
     * @param otp The OTP provided by the user
     * @returns true if valid, false otherwise
     */
    async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
        const otpKey = `otp:farmer:${phoneNumber}`;
        const storedHash = await valkey.get(otpKey);

        if (!storedHash) {
            logger.warn({ phoneNumber }, 'OTP verification failed: No OTP found or expired');
            return false;
        }

        const providedHash = crypto.createHash('sha256').update(otp).digest('hex');

        if (storedHash === providedHash) {
            // OTP matched, consume it (delete it) so it can't be reused
            await valkey.del(otpKey);
            // Also clear rate limit on successful verification?
            // Usually better to keep rate limit to prevent spamming even if successful,
            // but for login/registration, maybe we want to allow fresh start.
            // Let's keep rate limit for now to be safe against abuse.
            logger.info({ phoneNumber }, 'OTP verified successfully');
            return true;
        }

        logger.warn({ phoneNumber }, 'OTP verification failed: Invalid OTP');
        return false;
    }
}
