import { logger } from '../utils/logger';

/**
 * ExotelService - Handles SMS OTP delivery using Exotel ExoVerify API
 * 
 * API Documentation: https://developer.exotel.com/api/exoverify/
 * 
 * Environment Variables Required:
 * - EXOTEL_ACCOUNT_SID: Your Exotel account SID
 * - EXOTEL_APP_ID: SMS OTP Application ID from ExoVerify
 * - EXOTEL_APP_SECRET: SMS OTP Application Secret from ExoVerify
 * - EXOTEL_ENABLED: Set to 'true' to enable real SMS (default: false for dev)
 */

const EXOTEL_BASE_URL = 'https://exoverify.exotel.com/v2/accounts';

interface ExotelSendResponse {
    request_id: string;
    verification: {
        id: string;
        phone_number: string;
        status: string;
        app_id: string;
    };
}

interface ExotelVerifyResponse {
    request_id: string;
    verification: {
        id: string;
        phone_number: string;
        status: string;
        code_verified: boolean;
    };
}

export class ExotelService {
    private accountSid: string;
    private appId: string;
    private appSecret: string;
    private enabled: boolean;

    constructor() {
        this.accountSid = process.env.EXOTEL_ACCOUNT_SID || '';
        this.appId = process.env.EXOTEL_APP_ID || '';
        this.appSecret = process.env.EXOTEL_APP_SECRET || '';
        this.enabled = process.env.EXOTEL_ENABLED === 'true';

        if (this.enabled && (!this.accountSid || !this.appId || !this.appSecret)) {
            logger.warn('Exotel is enabled but credentials are missing');
        }
    }

    /**
     * Check if Exotel SMS is enabled
     */
    isEnabled(): boolean {
        return this.enabled && !!this.accountSid && !!this.appId && !!this.appSecret;
    }

    /**
     * Send OTP to a phone number using Exotel ExoVerify
     * @param phoneNumber Phone number with country code (e.g., +919876543210)
     * @returns Verification ID to use for OTP verification
     */
    async sendOTP(phoneNumber: string): Promise<{ success: boolean; verificationId?: string; message: string }> {
        if (!this.isEnabled()) {
            logger.info({ phoneNumber }, 'Exotel disabled, skipping SMS send');
            return { success: false, message: 'Exotel SMS disabled' };
        }

        // Ensure phone number has +91 prefix
        const formattedPhone = phoneNumber.startsWith('+') 
            ? phoneNumber 
            : `+91${phoneNumber.replace(/^91/, '')}`;

        const url = `${EXOTEL_BASE_URL}/${this.accountSid}/verifications/sms`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64')}`,
                },
                body: JSON.stringify({
                    phone_number: formattedPhone,
                    // Optional: custom template, expiry, etc.
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ phoneNumber, status: response.status, error: errorText }, 'Exotel SMS send failed');
                return { success: false, message: `Exotel API error: ${response.status}` };
            }

            const data = await response.json() as ExotelSendResponse;
            
            logger.info({ 
                phoneNumber, 
                verificationId: data.verification?.id,
                status: data.verification?.status 
            }, 'Exotel OTP sent successfully');

            return {
                success: true,
                verificationId: data.verification?.id,
                message: 'OTP sent successfully',
            };
        } catch (error) {
            logger.error({ error, phoneNumber }, 'Error sending OTP via Exotel');
            return { success: false, message: 'Failed to send OTP' };
        }
    }

    /**
     * Verify OTP using Exotel ExoVerify
     * @param verificationId Verification ID from sendOTP
     * @param otp OTP entered by user
     * @returns Whether OTP is valid
     */
    async verifyOTP(verificationId: string, otp: string): Promise<{ success: boolean; message: string }> {
        if (!this.isEnabled()) {
            logger.info({ verificationId }, 'Exotel disabled, skipping SMS verify');
            return { success: false, message: 'Exotel SMS disabled' };
        }

        const url = `${EXOTEL_BASE_URL}/${this.accountSid}/verifications/sms/${verificationId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64')}`,
                },
                body: JSON.stringify({
                    code: otp,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ verificationId, status: response.status, error: errorText }, 'Exotel OTP verify failed');
                return { success: false, message: 'OTP verification failed' };
            }

            const data = await response.json() as ExotelVerifyResponse;
            
            if (data.verification?.code_verified) {
                logger.info({ verificationId }, 'Exotel OTP verified successfully');
                return { success: true, message: 'OTP verified' };
            } else {
                logger.warn({ verificationId, status: data.verification?.status }, 'Exotel OTP invalid');
                return { success: false, message: 'Invalid OTP' };
            }
        } catch (error) {
            logger.error({ error, verificationId }, 'Error verifying OTP via Exotel');
            return { success: false, message: 'Failed to verify OTP' };
        }
    }
}
