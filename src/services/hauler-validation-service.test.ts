/**
 * HaulerValidationService Unit Tests
 * Story 2.5 - Hauler Account Creation with Vehicle Verification
 * 
 * Tests for:
 * - Vehicle number format validation (AC3, AC9)
 * - DL number format validation (AC4, AC9)
 * - DL expiry date validation (AC4)
 * - Payload capacity limits (AC3, AC8)
 * - UPI ID format validation (AC5)
 * 
 * @author Dev Agent
 * @created 2025-12-12
 */

import { HaulerValidationService, VEHICLE_ELIGIBILITY_RULES } from './hauler-validation-service';

describe('HaulerValidationService', () => {
    let validator: HaulerValidationService;

    beforeEach(() => {
        validator = new HaulerValidationService();
    });

    // ============ Vehicle Number Validation Tests ============

    describe('validateVehicleNumber', () => {
        it('should accept valid vehicle number format', () => {
            const result = validator.validateVehicleNumber('KA-01-AB-1234');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('KA-01-AB-1234');
        });

        it('should accept valid vehicle number with single letter series', () => {
            const result = validator.validateVehicleNumber('MH-12-C-5678');
            expect(result.valid).toBe(true);
        });

        it('should normalize lowercase to uppercase', () => {
            const result = validator.validateVehicleNumber('ka-01-ab-1234');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('KA-01-AB-1234');
        });

        it('should normalize spaces to hyphens', () => {
            const result = validator.validateVehicleNumber('KA 01 AB 1234');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('KA-01-AB-1234');
        });

        it('should reject vehicle number without separators', () => {
            const result = validator.validateVehicleNumber('KA01AB1234');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('format');
        });

        it('should reject invalid state code', () => {
            const result = validator.validateVehicleNumber('ABC-01-AB-1234');
            expect(result.valid).toBe(false);
        });

        it('should reject empty vehicle number', () => {
            const result = validator.validateVehicleNumber('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('required');
        });

        it('should reject partial vehicle number', () => {
            const result = validator.validateVehicleNumber('KA-01');
            expect(result.valid).toBe(false);
        });
    });

    // ============ DL Number Validation Tests ============

    describe('validateDLNumber', () => {
        it('should accept valid DL format: KA01-2020-1234567', () => {
            const result = validator.validateDLNumber('KA01-2020-1234567');
            expect(result.valid).toBe(true);
        });

        it('should accept valid DL format: DL-0420200123456', () => {
            const result = validator.validateDLNumber('DL-0420200123456');
            expect(result.valid).toBe(true);
        });

        it('should normalize lowercase to uppercase', () => {
            const result = validator.validateDLNumber('ka01-2020-1234567');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('KA01-2020-1234567');
        });

        it('should reject empty DL number', () => {
            const result = validator.validateDLNumber('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('required');
        });

        it('should reject completely invalid format', () => {
            const result = validator.validateDLNumber('INVALID123');
            expect(result.valid).toBe(false);
        });
    });

    // ============ DL Expiry Validation Tests ============

    describe('validateDLExpiry', () => {
        it('should accept future expiry date', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 2);
            const result = validator.validateDLExpiry(futureDate.toISOString().split('T')[0]);
            expect(result.valid).toBe(true);
        });

        it('should reject past expiry date', () => {
            const pastDate = new Date();
            pastDate.setFullYear(pastDate.getFullYear() - 1);
            const result = validator.validateDLExpiry(pastDate.toISOString().split('T')[0]);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('expired');
        });

        it('should reject today as expiry date (must be strictly future)', () => {
            // Use explicit local date format to avoid timezone issues
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const result = validator.validateDLExpiry(today);
            expect(result.valid).toBe(false);
        });
        it('should reject empty expiry date', () => {
            const result = validator.validateDLExpiry('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('required');
        });

        it('should reject invalid date format', () => {
            const result = validator.validateDLExpiry('not-a-date');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Invalid');
        });
    });

    // ============ Payload Capacity Validation Tests ============

    describe('validatePayloadCapacity', () => {
        it('should accept valid capacity for BIKE (≤20kg)', () => {
            const result = validator.validatePayloadCapacity('BIKE', 15);
            expect(result.valid).toBe(true);
        });

        it('should accept max capacity for BIKE (20kg)', () => {
            const result = validator.validatePayloadCapacity('BIKE', 20);
            expect(result.valid).toBe(true);
        });

        it('should reject over-capacity for BIKE', () => {
            const result = validator.validatePayloadCapacity('BIKE', 25);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('20kg');
        });

        it('should accept valid capacity for AUTO (≤100kg)', () => {
            const result = validator.validatePayloadCapacity('AUTO', 80);
            expect(result.valid).toBe(true);
        });

        it('should accept valid capacity for PICKUP_VAN (≤500kg)', () => {
            const result = validator.validatePayloadCapacity('PICKUP_VAN', 450);
            expect(result.valid).toBe(true);
        });

        it('should accept valid capacity for SMALL_TRUCK (≤2000kg)', () => {
            const result = validator.validatePayloadCapacity('SMALL_TRUCK', 1500);
            expect(result.valid).toBe(true);
        });

        it('should reject zero capacity', () => {
            const result = validator.validatePayloadCapacity('AUTO', 0);
            expect(result.valid).toBe(false);
        });

        it('should reject negative capacity', () => {
            const result = validator.validatePayloadCapacity('AUTO', -10);
            expect(result.valid).toBe(false);
        });
    });

    // ============ UPI ID Validation Tests ============

    describe('validateUpiId', () => {
        it('should accept valid UPI format: user@upi', () => {
            const result = validator.validateUpiId('rajesh@upi');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('rajesh@upi');
        });

        it('should accept valid UPI format: name.surname@paytm', () => {
            const result = validator.validateUpiId('name.surname@paytm');
            expect(result.valid).toBe(true);
        });

        it('should accept UPI with numbers: user123@ybl', () => {
            const result = validator.validateUpiId('user123@ybl');
            expect(result.valid).toBe(true);
        });

        it('should normalize uppercase to lowercase', () => {
            const result = validator.validateUpiId('Rajesh@UPI');
            expect(result.valid).toBe(true);
            expect(result.normalizedValue).toBe('rajesh@upi');
        });

        it('should reject UPI without @', () => {
            const result = validator.validateUpiId('rajeshupi');
            expect(result.valid).toBe(false);
        });

        it('should reject UPI with only @', () => {
            const result = validator.validateUpiId('@only');
            expect(result.valid).toBe(false);
        });

        it('should reject empty UPI', () => {
            const result = validator.validateUpiId('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('required');
        });
    });

    // ============ Vehicle Type Validation Tests ============

    describe('validateVehicleType', () => {
        it('should accept valid type BIKE', () => {
            const result = validator.validateVehicleType('BIKE');
            expect(result.valid).toBe(true);
            expect(result.typedValue).toBe('BIKE');
        });

        it('should accept valid type AUTO', () => {
            const result = validator.validateVehicleType('AUTO');
            expect(result.valid).toBe(true);
        });

        it('should accept valid type PICKUP_VAN', () => {
            const result = validator.validateVehicleType('PICKUP_VAN');
            expect(result.valid).toBe(true);
        });

        it('should accept valid type SMALL_TRUCK', () => {
            const result = validator.validateVehicleType('SMALL_TRUCK');
            expect(result.valid).toBe(true);
        });

        it('should normalize lowercase to uppercase', () => {
            const result = validator.validateVehicleType('bike');
            expect(result.valid).toBe(true);
            expect(result.typedValue).toBe('BIKE');
        });

        it('should reject invalid vehicle type', () => {
            const result = validator.validateVehicleType('BOAT');
            expect(result.valid).toBe(false);
        });
    });

    // ============ Eligibility Rules Tests ============

    describe('getEligibilityRule', () => {
        it('should return correct rules for BIKE', () => {
            const rule = validator.getEligibilityRule('BIKE');
            expect(rule).toBeDefined();
            expect(rule?.maxCapacityKg).toBe(20);
            expect(rule?.maxRadiusKm).toBe(10);
        });

        it('should return correct rules for AUTO', () => {
            const rule = validator.getEligibilityRule('AUTO');
            expect(rule).toBeDefined();
            expect(rule?.maxCapacityKg).toBe(100);
            expect(rule?.maxRadiusKm).toBe(30);
        });

        it('should return correct rules for PICKUP_VAN', () => {
            const rule = validator.getEligibilityRule('PICKUP_VAN');
            expect(rule).toBeDefined();
            expect(rule?.maxCapacityKg).toBe(500);
            expect(rule?.maxRadiusKm).toBe(80);
        });

        it('should return correct rules for SMALL_TRUCK', () => {
            const rule = validator.getEligibilityRule('SMALL_TRUCK');
            expect(rule).toBeDefined();
            expect(rule?.maxCapacityKg).toBe(2000);
            expect(rule?.maxRadiusKm).toBe(150);
        });

        it('should return undefined for invalid type', () => {
            const rule = validator.getEligibilityRule('INVALID' as any);
            expect(rule).toBeUndefined();
        });
    });

    describe('getAllEligibilityRules', () => {
        it('should return all 4 vehicle eligibility rules', () => {
            const rules = validator.getAllEligibilityRules();
            expect(rules.length).toBe(4);
        });

        it('should match VEHICLE_ELIGIBILITY_RULES constant', () => {
            const rules = validator.getAllEligibilityRules();
            expect(rules).toEqual(VEHICLE_ELIGIBILITY_RULES);
        });
    });
});
