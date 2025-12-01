import { OtpService } from '../../src/services/otp-service';
import { valkey } from '../../src/utils/valkey';
import crypto from 'crypto';

// Mock ioredis
jest.mock('../../src/utils/valkey', () => ({
    valkey: {
        incr: jest.fn(),
        expire: jest.fn(),
        setex: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
    },
}));

describe('OtpService', () => {
    let otpService: OtpService;

    beforeEach(() => {
        otpService = new OtpService();
        jest.clearAllMocks();
    });

    describe('generateOTP', () => {
        it('should generate and store an OTP when rate limit is not exceeded', async () => {
            const phoneNumber = '1234567890';
            (valkey.incr as jest.Mock).mockResolvedValue(1);

            const otp = await otpService.generateOTP(phoneNumber);

            expect(otp).toHaveLength(6);
            expect(valkey.incr).toHaveBeenCalledWith(`otp:rate:${phoneNumber}`);
            expect(valkey.expire).toHaveBeenCalledWith(`otp:rate:${phoneNumber}`, 600);
            expect(valkey.setex).toHaveBeenCalledWith(
                `otp:farmer:${phoneNumber}`,
                600,
                expect.any(String) // Hash
            );
        });

        it('should return null when rate limit is exceeded', async () => {
            const phoneNumber = '1234567890';
            (valkey.incr as jest.Mock).mockResolvedValue(4); // > 3

            const otp = await otpService.generateOTP(phoneNumber);

            expect(otp).toBeNull();
            expect(valkey.setex).not.toHaveBeenCalled();
        });
    });

    describe('verifyOTP', () => {
        it('should return true for valid OTP', async () => {
            const phoneNumber = '1234567890';
            const otp = '123456';
            const hash = crypto.createHash('sha256').update(otp).digest('hex');

            (valkey.get as jest.Mock).mockResolvedValue(hash);

            const isValid = await otpService.verifyOTP(phoneNumber, otp);

            expect(isValid).toBe(true);
            expect(valkey.del).toHaveBeenCalledWith(`otp:farmer:${phoneNumber}`);
        });

        it('should return false for invalid OTP', async () => {
            const phoneNumber = '1234567890';
            const otp = '123456';
            const wrongHash = crypto.createHash('sha256').update('654321').digest('hex');

            (valkey.get as jest.Mock).mockResolvedValue(wrongHash);

            const isValid = await otpService.verifyOTP(phoneNumber, otp);

            expect(isValid).toBe(false);
            expect(valkey.del).not.toHaveBeenCalled();
        });

        it('should return false when no OTP is found (expired)', async () => {
            const phoneNumber = '1234567890';
            (valkey.get as jest.Mock).mockResolvedValue(null);

            const isValid = await otpService.verifyOTP(phoneNumber, '123456');

            expect(isValid).toBe(false);
        });
    });
});
