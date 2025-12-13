/**
 * PIN Validator Service - Story 2.6 (AC4, AC9)
 * 
 * Validates PIN format for field agents:
 * - 4)digit numeric PIN
 * - No sequential patterns (1234, 4321, 2345)
 * - No repeated digits (1111, 2222)
 * 
 * @module validators/pin-validator
 */

import { logger } from '../utils/logger';

// Sequential patterns to reject (ascending and descending)
const SEQUENTIAL_PATTERNS = [
    '0123', '1234', '2345', '3456', '4567', '5678', '6789',
    '9876', '8765', '7654', '6543', '5432', '4321', '3210'
];

// Interface for validation result
export interface PinValidationResult {
    valid: boolean;
    error?: string;
    errorCode?: 'INVALID_FORMAT' | 'SEQUENTIAL' | 'REPEATED' | 'MISMATCH';
}

/**
 * Validates a 4-digit PIN against security rules
 * 
 * @param pin - The PIN to validate
 * @returns Validation result with error details if invalid
 */
export function validatePin(pin: string): PinValidationResult {
    // Rule 1: Must be exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
        logger.debug({ pin: '****' }, 'PIN validation failed: invalid format');
        return {
            valid: false,
            error: 'PIN must be exactly 4 digits',
            errorCode: 'INVALID_FORMAT'
        };
    }

    // Rule 2: No sequential patterns
    if (isSequential(pin)) {
        logger.debug('PIN validation failed: sequential pattern');
        return {
            valid: false,
            error: 'Avoid sequential numbers like 1234 or 4321',
            errorCode: 'SEQUENTIAL'
        };
    }

    // Rule 3: No repeated digits
    if (isRepeated(pin)) {
        logger.debug('PIN validation failed: repeated digits');
        return {
            valid: false,
            error: 'Avoid repeated digits like 1111 or 2222',
            errorCode: 'REPEATED'
        };
    }

    return { valid: true };
}

/**
 * Validates that two PINs match (for confirmation)
 * 
 * @param pin - The original PIN
 * @param confirmPin - The confirmation PIN
 * @returns Validation result
 */
export function validatePinMatch(pin: string, confirmPin: string): PinValidationResult {
    if (pin !== confirmPin) {
        return {
            valid: false,
            error: 'PINs do not match. Try again.',
            errorCode: 'MISMATCH'
        };
    }
    return { valid: true };
}

/**
 * Validates a 6-digit temporary PIN (for first-time login)
 * 
 * @param pin - The temporary PIN to validate
 * @returns Validation result
 */
export function validateTemporaryPin(pin: string): PinValidationResult {
    if (!/^\d{6}$/.test(pin)) {
        return {
            valid: false,
            error: 'Temporary PIN must be exactly 6 digits',
            errorCode: 'INVALID_FORMAT'
        };
    }
    return { valid: true };
}

/**
 * Checks if PIN contains sequential digits
 * Covers both ascending (1234) and descending (4321) sequences
 */
function isSequential(pin: string): boolean {
    return SEQUENTIAL_PATTERNS.includes(pin);
}

/**
 * Checks if all digits in PIN are the same
 */
function isRepeated(pin: string): boolean {
    return /^(\d)\1{3}$/.test(pin);
}

/**
 * Generates a cryptographically secure 6-digit temporary PIN
 * Used for agent first-time login credentials
 * 
 * @returns 6-digit numeric string
 */
export function generateTemporaryPin(): string {
    // Use crypto for secure random number generation
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);

    // Map to 6-digit range (100000-999999)
    const pin = 100000 + (randomNumber % 900000);

    logger.debug('Generated temporary PIN');
    return pin.toString();
}
