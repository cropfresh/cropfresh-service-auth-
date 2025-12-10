import { PasswordValidationService } from './password-validation-service';

describe('PasswordValidationService', () => {
    let service: PasswordValidationService;

    beforeEach(() => {
        service = new PasswordValidationService();
    });

    describe('validatePassword', () => {
        it('should accept a valid strong password', () => {
            const result = service.validatePassword('SecurePass1!');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.strength).toBe('strong');
        });

        it('should reject password shorter than 8 characters', () => {
            const result = service.validatePassword('Short1!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must be at least 8 characters');
        });

        it('should reject password without uppercase letter', () => {
            const result = service.validatePassword('lowercase1!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one uppercase letter');
        });

        it('should reject password without number', () => {
            const result = service.validatePassword('NoNumberHere!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one number');
        });

        it('should reject password without special character', () => {
            const result = service.validatePassword('NoSpecial123');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*)');
        });

        it('should reject password without lowercase letter', () => {
            const result = service.validatePassword('ALLCAPS123!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one lowercase letter');
        });

        it('should return multiple errors for very weak password', () => {
            const result = service.validatePassword('weak');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(2);
            expect(result.strength).toBe('weak');
        });

        it('should identify medium strength password', () => {
            const result = service.validatePassword('Password1'); // missing special char
            expect(result.isValid).toBe(false);
            expect(result.strength).toBe('medium');
        });
    });

    describe('validateEmail', () => {
        it('should accept valid email addresses', () => {
            expect(service.validateEmail('user@example.com')).toBe(true);
            expect(service.validateEmail('user.name@company.co.in')).toBe(true);
            expect(service.validateEmail('user+tag@gmail.com')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(service.validateEmail('invalid')).toBe(false);
            expect(service.validateEmail('no@domain')).toBe(false);
            expect(service.validateEmail('@nodomain.com')).toBe(false);
            expect(service.validateEmail('spaces in@email.com')).toBe(false);
        });
    });

    describe('validateGstNumber', () => {
        it('should accept valid GST numbers', () => {
            expect(service.validateGstNumber('22AAAAA0000A1Z5')).toBe(true);
            expect(service.validateGstNumber('29ABCDE1234F1ZV')).toBe(true);
        });

        it('should accept empty GST (optional field)', () => {
            expect(service.validateGstNumber('')).toBe(true);
        });

        it('should reject invalid GST numbers', () => {
            expect(service.validateGstNumber('123456789')).toBe(false);
            expect(service.validateGstNumber('22AAAAA0000A1Z')).toBe(false); // too short
            expect(service.validateGstNumber('22AAAAA0000A1Z55')).toBe(false); // too long
            expect(service.validateGstNumber('XXAAAAA0000A1Z5')).toBe(false); // invalid state code
        });
    });

    describe('validateMobileNumber', () => {
        it('should accept valid Indian mobile numbers', () => {
            expect(service.validateMobileNumber('9876543210')).toBe(true);
            expect(service.validateMobileNumber('+919876543210')).toBe(true);
            expect(service.validateMobileNumber('919876543210')).toBe(true);
            expect(service.validateMobileNumber('6000000000')).toBe(true);
            expect(service.validateMobileNumber('7000000000')).toBe(true);
            expect(service.validateMobileNumber('8000000000')).toBe(true);
        });

        it('should reject invalid mobile numbers', () => {
            expect(service.validateMobileNumber('5876543210')).toBe(false); // starts with 5
            expect(service.validateMobileNumber('123456789')).toBe(false); // too short
            expect(service.validateMobileNumber('12345678901')).toBe(false); // too long
            expect(service.validateMobileNumber('abcdefghij')).toBe(false); // non-numeric
        });
    });

    describe('hashPassword', () => {
        it('should hash password with bcrypt', async () => {
            const password = 'TestPassword123!';
            const hash = await service.hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
        });

        it('should generate different hashes for same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await service.hashPassword(password);
            const hash2 = await service.hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const password = 'TestPassword123!';
            const hash = await service.hashPassword(password);

            const isValid = await service.verifyPassword(password, hash);
            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'TestPassword123!';
            const hash = await service.hashPassword(password);

            const isValid = await service.verifyPassword('WrongPassword123!', hash);
            expect(isValid).toBe(false);
        });
    });
});
