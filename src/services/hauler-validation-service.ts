/**
 * HaulerValidationService
 * -----------------------
 * Story 2.5: Hauler Account Creation with Vehicle Verification
 * 
 * Provides validation methods for:
 * - Vehicle number format (AC3, AC9)
 * - Driving License number format (AC4, AC9)
 * - DL expiry date (AC4)
 * - Payload capacity limits (AC3, AC8)
 * - UPI ID format (AC5)
 * 
 * @author Dev Agent
 * @created 2025-12-12
 */

import pino from 'pino';

const logger = pino({ name: 'hauler-validation-service' });

// ============ Type Definitions ============

/** Vehicle types with their capacity/radius limits */
export type VehicleType = 'BIKE' | 'AUTO' | 'PICKUP_VAN' | 'SMALL_TRUCK';

/** Validation result structure */
export interface ValidationResult {
    valid: boolean;
    message: string;
    normalizedValue?: string; // Cleaned/formatted value if valid
}

/** Vehicle eligibility rules per type */
export interface VehicleEligibilityRule {
    type: VehicleType;
    maxCapacityKg: number;
    maxRadiusKm: number;
    description: string;
}

// ============ Constants ============

/**
 * Vehicle number regex pattern
 * Format: XX-00-XX-0000 (e.g., KA-01-AB-1234)
 * - 2 letters (state code)
 * - 2 digits (RTO code)
 * - 1-2 letters (series)
 * - 4 digits (number)
 */
const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/;

/**
 * Driving License number regex patterns (India)
 * Supports multiple state formats:
 * - Old format: SS-RRYYYYNNNNNNN (e.g., KA01-2020-1234567)
 * - New format: DL-RRYYYYNNNNNNN (e.g., DL-0420200123456)
 */
const DL_NUMBER_PATTERNS = [
    /^[A-Z]{2}\d{2}-\d{4}-\d{7}$/,     // KA01-2020-1234567
    /^[A-Z]{2}-\d{13}$/,                // DL-0420200123456
    /^[A-Z]{2}\d{2}\s?\d{11}$/,         // MH01 20200123456
    /^[A-Z]{2}\d{2}-\d{4}-\d{6,7}$/,    // KA01-2020-123456
];

/**
 * UPI ID regex pattern
 * Format: name@bank (e.g., rajesh@upi, name.surname@paytm)
 */
const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

/**
 * Vehicle eligibility rules (AC8)
 * Maps vehicle types to capacity/radius limits
 */
export const VEHICLE_ELIGIBILITY_RULES: VehicleEligibilityRule[] = [
    { type: 'BIKE', maxCapacityKg: 20, maxRadiusKm: 10, description: 'Motorcycle/Scooter' },
    { type: 'AUTO', maxCapacityKg: 100, maxRadiusKm: 30, description: 'Auto-rickshaw/Three-wheeler' },
    { type: 'PICKUP_VAN', maxCapacityKg: 500, maxRadiusKm: 80, description: 'Pickup Van/Tempo' },
    { type: 'SMALL_TRUCK', maxCapacityKg: 2000, maxRadiusKm: 150, description: 'Small Truck/Mini Lorry' },
];

// ============ Validation Class ============

export class HaulerValidationService {

    // ============ Vehicle Number Validation ============

    /**
     * Validates Indian vehicle registration number format
     * @param vehicleNumber - Raw vehicle number input
     * @returns Validation result with normalized value if valid
     * 
     * Valid formats:
     * - KA-01-AB-1234
     * - MH-12-CD-5678
     */
    validateVehicleNumber(vehicleNumber: string): ValidationResult {
        if (!vehicleNumber || vehicleNumber.trim().length === 0) {
            return { valid: false, message: 'Vehicle number is required' };
        }

        // Normalize: uppercase and replace spaces/dots with hyphens
        const normalized = this.normalizeVehicleNumber(vehicleNumber);

        if (!VEHICLE_NUMBER_REGEX.test(normalized)) {
            logger.debug({ input: vehicleNumber, normalized }, 'Invalid vehicle number format');
            return {
                valid: false,
                message: 'Enter valid format: KA-01-AB-1234'
            };
        }

        return { valid: true, message: 'Valid vehicle number', normalizedValue: normalized };
    }

    /**
     * Normalizes vehicle number to standard format
     * Converts to uppercase, replaces various separators with hyphens
     */
    private normalizeVehicleNumber(input: string): string {
        return input
            .toUpperCase()
            .replace(/\s+/g, '-')  // spaces to hyphens
            .replace(/\./g, '-')   // dots to hyphens
            .replace(/-+/g, '-')   // multiple hyphens to single
            .trim();
    }

    // ============ DL Number Validation ============

    /**
     * Validates Indian Driving License number format
     * @param dlNumber - Raw DL number input
     * @returns Validation result with normalized value if valid
     * 
     * Supports multiple state-specific formats
     */
    validateDLNumber(dlNumber: string): ValidationResult {
        if (!dlNumber || dlNumber.trim().length === 0) {
            return { valid: false, message: 'Driving License number is required' };
        }

        // Normalize: uppercase and clean
        const normalized = this.normalizeDLNumber(dlNumber);

        // Check against all supported patterns
        const isValid = DL_NUMBER_PATTERNS.some(pattern => pattern.test(normalized));

        if (!isValid) {
            logger.debug({ input: dlNumber, normalized }, 'Invalid DL number format');
            return {
                valid: false,
                message: 'Enter valid Driving License number'
            };
        }

        return { valid: true, message: 'Valid DL number', normalizedValue: normalized };
    }

    /**
     * Normalizes DL number to standard format
     */
    private normalizeDLNumber(input: string): string {
        return input
            .toUpperCase()
            .replace(/\s+/g, '')   // remove spaces
            .trim();
    }

    // ============ DL Expiry Validation ============

    /**
   * Validates DL expiry date is in the future
   * @param expiryDate - Expiry date string (ISO format YYYY-MM-DD)
   * @returns Validation result
   * 
   * Rules:
   * - Must be a valid date
   * - Must be in the future (> today)
   */
    validateDLExpiry(expiryDate: string): ValidationResult {
        if (!expiryDate || expiryDate.trim().length === 0) {
            return { valid: false, message: 'License expiry date is required' };
        }

        // Parse as local date to avoid timezone issues
        // Split YYYY-MM-DD and create date with local timezone
        const parts = expiryDate.trim().split('-');
        if (parts.length !== 3) {
            return { valid: false, message: 'Invalid date format. Use YYYY-MM-DD' };
        }

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);

        // Check if parsed values are valid
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            return { valid: false, message: 'Invalid date format' };
        }

        const expiry = new Date(year, month, day);

        // Check if valid date (handles cases like Feb 30)
        if (expiry.getFullYear() !== year || expiry.getMonth() !== month || expiry.getDate() !== day) {
            return { valid: false, message: 'Invalid date' };
        }

        // Compare with today (date only, no time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        if (expiry <= today) {
            logger.debug({ expiryDate, today: today.toISOString() }, 'DL expired');
            return {
                valid: false,
                message: 'License expired. Please renew before registration.'
            };
        }

        return { valid: true, message: 'Valid expiry date', normalizedValue: expiryDate };
    }

    // ============ Payload Capacity Validation ============

    /**
     * Validates payload capacity against vehicle type limits
     * @param vehicleType - Type of vehicle
     * @param capacityKg - Claimed payload capacity in kg
     * @returns Validation result
     */
    validatePayloadCapacity(vehicleType: VehicleType, capacityKg: number): ValidationResult {
        if (capacityKg <= 0) {
            return { valid: false, message: 'Payload capacity must be greater than 0' };
        }

        const rule = VEHICLE_ELIGIBILITY_RULES.find(r => r.type === vehicleType);

        if (!rule) {
            return { valid: false, message: 'Invalid vehicle type' };
        }

        if (capacityKg > rule.maxCapacityKg) {
            logger.debug({ vehicleType, capacityKg, maxAllowed: rule.maxCapacityKg }, 'Capacity exceeds limit');
            return {
                valid: false,
                message: `${vehicleType} max capacity is ${rule.maxCapacityKg}kg`
            };
        }

        return { valid: true, message: 'Valid capacity' };
    }

    // ============ UPI ID Validation ============

    /**
     * Validates UPI ID format
     * @param upiId - Raw UPI ID input
     * @returns Validation result with normalized value
     * 
     * Format: name@bank (e.g., rajesh@upi)
     */
    validateUpiId(upiId: string): ValidationResult {
        if (!upiId || upiId.trim().length === 0) {
            return { valid: false, message: 'UPI ID is required' };
        }

        const normalized = upiId.toLowerCase().trim();

        if (!UPI_ID_REGEX.test(normalized)) {
            logger.debug({ input: upiId }, 'Invalid UPI format');
            return {
                valid: false,
                message: 'Enter valid UPI ID (e.g., name@upi)'
            };
        }

        return { valid: true, message: 'Valid UPI format', normalizedValue: normalized };
    }

    // ============ Vehicle Type Validation ============

    /**
     * Validates vehicle type is one of the allowed types
     * @param vehicleType - Vehicle type string
     * @returns Validation result with typed value
     */
    validateVehicleType(vehicleType: string): ValidationResult & { typedValue?: VehicleType } {
        const normalized = vehicleType?.toUpperCase().trim();
        const validTypes: VehicleType[] = ['BIKE', 'AUTO', 'PICKUP_VAN', 'SMALL_TRUCK'];

        if (!validTypes.includes(normalized as VehicleType)) {
            return {
                valid: false,
                message: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`
            };
        }

        return {
            valid: true,
            message: 'Valid vehicle type',
            normalizedValue: normalized,
            typedValue: normalized as VehicleType
        };
    }

    // ============ Utility Methods ============

    /**
     * Gets eligibility rules for a specific vehicle type
     * @param vehicleType - Vehicle type to lookup
     * @returns Eligibility rule or undefined
     */
    getEligibilityRule(vehicleType: VehicleType): VehicleEligibilityRule | undefined {
        return VEHICLE_ELIGIBILITY_RULES.find(r => r.type === vehicleType);
    }

    /**
     * Gets all vehicle eligibility rules
     * @returns Array of all eligibility rules
     */
    getAllEligibilityRules(): VehicleEligibilityRule[] {
        return VEHICLE_ELIGIBILITY_RULES;
    }
}

// Export singleton instance
export const haulerValidationService = new HaulerValidationService();
