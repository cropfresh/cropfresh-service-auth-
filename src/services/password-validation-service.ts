import bcrypt from 'bcrypt';

/**
 * Password Validation Service
 * Story 2.3 - Buyer Business Account Creation (AC5)
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

export class PasswordValidationService {
    private static readonly MIN_LENGTH = 8;
    private static readonly BCRYPT_ROUNDS = 12;

    /**
     * Validate password strength and return specific errors
     */
    validatePassword(password: string): PasswordValidationResult {
        const errors: string[] = [];

        // Check minimum length
        if (password.length < PasswordValidationService.MIN_LENGTH) {
            errors.push(`Password must be at least ${PasswordValidationService.MIN_LENGTH} characters`);
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        // Check for number
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        // Check for special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character (!@#$%^&*)');
        }

        const isValid = errors.length === 0;
        const strength = this.calculateStrength(password, errors.length);

        return { isValid, errors, strength };
    }

    /**
     * Calculate password strength based on criteria met
     */
    private calculateStrength(password: string, errorCount: number): 'weak' | 'medium' | 'strong' {
        if (errorCount >= 3) return 'weak';
        if (errorCount >= 1) return 'medium';

        // All criteria met - check length for extra strength
        if (password.length >= 12) return 'strong';
        return 'strong';
    }

    /**
     * Hash password using bcrypt with cost factor 12
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, PasswordValidationService.BCRYPT_ROUNDS);
    }

    /**
     * Verify password against hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Validate email format
     */
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate GST number format (15-character alphanumeric)
     * Format: 22AAAAA0000A1Z5
     */
    validateGstNumber(gstNumber: string): boolean {
        if (!gstNumber) return true; // Optional field
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstRegex.test(gstNumber.toUpperCase());
    }

    /**
     * Validate Indian mobile number
     */
    validateMobileNumber(mobile: string): boolean {
        // Remove +91 or 91 prefix if present
        const normalized = mobile.replace(/^\+?91/, '');
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(normalized);
    }
}

export const passwordValidationService = new PasswordValidationService();
