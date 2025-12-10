import { logger } from '../utils/logger';

/**
 * RazorpayService - Handles UPI VPA validation using Razorpay API
 * 
 * API Documentation: https://razorpay.com/docs/api/payments/upi/validate-vpa/
 * 
 * Environment Variables Required:
 * - RAZORPAY_KEY_ID: Your Razorpay Key ID
 * - RAZORPAY_KEY_SECRET: Your Razorpay Key Secret
 * - RAZORPAY_ENABLED: Set to 'true' to enable real verification (default: false for dev)
 * 
 * Note: VPA validation requires RazorpayX Lite and is not available in test mode.
 * For development, we use a mock mode that validates UPI format only.
 */

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

interface VpaValidationResponse {
    success: boolean;
    customer_name?: string;
    vpa?: string;
}

export class RazorpayService {
    private keyId: string;
    private keySecret: string;
    private enabled: boolean;

    constructor() {
        this.keyId = process.env.RAZORPAY_KEY_ID || '';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
        this.enabled = process.env.RAZORPAY_ENABLED === 'true';

        if (this.enabled && (!this.keyId || !this.keySecret)) {
            logger.warn('Razorpay is enabled but credentials are missing');
        }
    }

    /**
     * Check if Razorpay is enabled
     */
    isEnabled(): boolean {
        return this.enabled && !!this.keyId && !!this.keySecret;
    }

    /**
     * Validate UPI VPA format (basic validation)
     * @param vpa UPI VPA (e.g., user@upi)
     * @returns Whether format is valid
     */
    private isValidVpaFormat(vpa: string): boolean {
        // UPI VPA format: <username>@<bank_handle>
        const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
        return vpaRegex.test(vpa);
    }

    /**
     * Validate UPI VPA using Razorpay
     * In dev mode, just validates format
     * In prod mode, uses Razorpay API
     * 
     * @param vpa UPI VPA to validate
     * @returns Validation result with customer name if available
     */
    async validateVpa(vpa: string): Promise<{
        valid: boolean;
        customerName?: string;
        message: string;
    }> {
        // Basic format validation first
        if (!this.isValidVpaFormat(vpa)) {
            return {
                valid: false,
                message: 'Invalid UPI ID format. Use format: yourname@bankhandle',
            };
        }

        // If Razorpay is not enabled, just return format validation
        if (!this.isEnabled()) {
            logger.info({ vpa }, 'Razorpay disabled, using format validation only');
            return {
                valid: true,
                message: 'UPI ID format is valid (verification in dev mode)',
            };
        }

        // Use Razorpay API for real validation
        try {
            const response = await fetch(`${RAZORPAY_BASE_URL}/payments/validate/vpa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
                },
                body: JSON.stringify({ vpa }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error({ vpa, error: errorData }, 'Razorpay VPA validation failed');

                // Handle specific error codes
                if (response.status === 400) {
                    return { valid: false, message: 'Invalid UPI ID' };
                }
                return { valid: false, message: 'UPI validation failed' };
            }

            const data = await response.json() as VpaValidationResponse;

            if (data.success) {
                logger.info({ vpa, customerName: data.customer_name }, 'Razorpay VPA validated');
                return {
                    valid: true,
                    customerName: data.customer_name,
                    message: 'UPI ID verified successfully',
                };
            } else {
                return { valid: false, message: 'Invalid UPI ID' };
            }
        } catch (error) {
            logger.error({ error, vpa }, 'Error validating VPA via Razorpay');
            // Fall back to format validation on error
            return {
                valid: true,
                message: 'UPI ID format is valid (API verification unavailable)',
            };
        }
    }

    /**
     * Validate IFSC code format (basic validation)
     * @param ifsc IFSC code
     * @returns Whether format is valid
     */
    isValidIfscFormat(ifsc: string): boolean {
        // IFSC format: 4 letters (bank code) + 0 + 6 alphanumeric (branch code)
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        return ifscRegex.test(ifsc.toUpperCase());
    }

    /**
     * Get bank name from IFSC code
     * Uses Razorpay's IFSC lookup API
     * 
     * @param ifsc IFSC code
     * @returns Bank name and branch details
     */
    async getBankFromIfsc(ifsc: string): Promise<{
        valid: boolean;
        bankName?: string;
        branchName?: string;
        address?: string;
        message: string;
    }> {
        if (!this.isValidIfscFormat(ifsc)) {
            return {
                valid: false,
                message: 'Invalid IFSC code format',
            };
        }

        try {
            // Using public IFSC API (razorpay-ifsc.herokuapp.com is public)
            const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);

            if (!response.ok) {
                return {
                    valid: false,
                    message: 'Invalid IFSC code',
                };
            }

            const data = await response.json() as { BANK: string; BRANCH: string; ADDRESS: string };

            return {
                valid: true,
                bankName: data.BANK,
                branchName: data.BRANCH,
                address: data.ADDRESS,
                message: 'IFSC code verified',
            };
        } catch (error) {
            logger.error({ error, ifsc }, 'Error looking up IFSC');
            return {
                valid: false,
                message: 'Could not verify IFSC code',
            };
        }
    }
}
