import { valkey } from '../utils/valkey';
import { logger } from '../utils/logger';
import { ExotelService } from './exotel-service';
import crypto from 'crypto';

const OTP_TTL_SECONDS = 600; // 10 minutes
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes
const MAX_ATTEMPTS_PER_WINDOW = 3;

export class OtpService {
    private exotelService: ExotelService;

    constructor() {
        this.exotelService = new ExotelService();
    }

    /**
     * Generates a 6-digit OTP
     */
    private generateNumericOTP(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Generates and stores an OTP for a given phone number.
     * If Exotel is enabled, sends OTP via SMS.
     * Checks rate limits before generating.
     * @param phoneNumber The phone number to generate OTP for
     * @returns Object with OTP (for dev logging) and success status
     */
    async generateOTP(phoneNumber: string): Promise<{ otp: string | null; smsSent: boolean; message: string }> {
        const rateLimitKey = `otp:rate:${phoneNumber}`;
        const attempts = await valkey.incr(rateLimitKey);

        if (attempts === 1) {
            await valkey.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
        }

        if (attempts > MAX_ATTEMPTS_PER_WINDOW) {
            logger.warn({ phoneNumber }, 'OTP rate limit exceeded');
            return { otp: null, smsSent: false, message: 'Rate limit exceeded. Try again in 10 minutes.' };
        }

        const otp = this.generateNumericOTP();
        const otpKey = `otp:farmer:${phoneNumber}`;

        // Store OTP hash in Valkey
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        await valkey.setex(otpKey, OTP_TTL_SECONDS, otpHash);
        logger.info({ phoneNumber }, 'OTP generated and stored');

        // Try to send via Exotel if enabled
        if (this.exotelService.isEnabled()) {
            const smsResult = await this.exotelService.sendOTP(phoneNumber);
            if (smsResult.success) {
                logger.info({ phoneNumber, verificationId: smsResult.verificationId }, 'OTP sent via Exotel');
                return { otp, smsSent: true, message: 'OTP sent successfully' };
            } else {
                logger.warn({ phoneNumber, error: smsResult.message }, 'Exotel SMS failed, OTP stored locally');
                // Still return the OTP for dev testing even if SMS fails
                return { otp, smsSent: false, message: `SMS failed: ${smsResult.message}. OTP stored locally.` };
            }
        } else {
            // Dev mode - just log the OTP
            logger.info({ phoneNumber, otp }, 'OTP Generated (DEV MODE - Exotel disabled)');
            return { otp, smsSent: false, message: 'OTP generated (dev mode - check logs)' };
        }
    }

    /**
     * Simplified generateOTP for backward compatibility
     * Returns just the OTP string or null if rate limited
     */
    async generateOTPSimple(phoneNumber: string): Promise<string | null> {
        const result = await this.generateOTP(phoneNumber);
        return result.otp;
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
            logger.info({ phoneNumber }, 'OTP verified successfully');
            return true;
        }

        logger.warn({ phoneNumber }, 'OTP verification failed: Invalid OTP');
        return false;
    }

    /**
     * Check if SMS is enabled (Exotel configured)
     */
    isSmsEnabled(): boolean {
        return this.exotelService.isEnabled();
    }
}

