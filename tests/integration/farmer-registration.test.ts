import { authServiceHandlers } from '../../src/grpc/services/auth';
import { logger } from '../../src/utils/logger';
import * as grpc from '@grpc/grpc-js';

// Mock dependencies
const mockVerifyOTP = jest.fn();
const mockFindByPhoneNumber = jest.fn();
const mockCreateFarmer = jest.fn();

jest.mock('../../src/services/otp-service', () => ({
    OtpService: jest.fn().mockImplementation(() => ({
        verifyOTP: mockVerifyOTP,
    })),
}));

jest.mock('../../src/repositories/user-repository', () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findByPhoneNumber: mockFindByPhoneNumber,
        createFarmer: mockCreateFarmer,
    })),
}));

jest.mock('../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('../../src/generated/prisma', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    })),
}));

describe('Farmer Registration Integration', () => {
    let handlers: any;
    let mockCall: any;
    let mockCallback: any;

    beforeEach(() => {
        handlers = authServiceHandlers(logger);
        mockCall = {
            request: {
                phoneNumber: '1234567890',
                otp: '123456',
                languagePreference: 'en',
            },
        };
        mockCallback = jest.fn();
        jest.clearAllMocks();
    });

    it('should create a farmer account with valid OTP', async () => {
        // Setup mocks
        mockVerifyOTP.mockResolvedValue(true);
        mockFindByPhoneNumber.mockResolvedValue(null);
        mockCreateFarmer.mockResolvedValue({
            id: 1,
            phoneNumber: '1234567890',
            role: 'FARMER',
        });

        // Execute
        await handlers.CreateFarmerAccount(mockCall, mockCallback);

        // Verify
        expect(mockVerifyOTP).toHaveBeenCalledWith('1234567890', '123456');
        expect(mockCreateFarmer).toHaveBeenCalledWith('1234567890', 'en');
        expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String),
            userId: '1',
            userType: 'FARMER',
        }));
    });

    it('should return UNAUTHENTICATED for invalid OTP', async () => {
        mockVerifyOTP.mockResolvedValue(false);

        await handlers.CreateFarmerAccount(mockCall, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
            code: grpc.status.UNAUTHENTICATED,
        }));
        expect(mockCreateFarmer).not.toHaveBeenCalled();
    });

    it('should return ALREADY_EXISTS if user exists', async () => {
        mockVerifyOTP.mockResolvedValue(true);
        mockFindByPhoneNumber.mockResolvedValue({ id: 1 });

        await handlers.CreateFarmerAccount(mockCall, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
            code: grpc.status.ALREADY_EXISTS,
        }));
        expect(mockCreateFarmer).not.toHaveBeenCalled();
    });
});
