import { Request, Response } from 'express';
import { livenessHandler, createReadinessHandler } from '../../src/middleware/health';

// Mock dependencies
const mockRequest = {} as Request;
const mockResponse = (): Response => {
    const res = {} as Response;
    res.status = ((code: number) => res) as any;
    res.json = ((body: any) => res) as any;

    // Add Jest spy functionality
    const statusSpy = res.status;
    const jsonSpy = res.json;
    res.status = Object.assign((code: number) => {
        (res.status as any).mock = { calls: [...((res.status as any).mock?.calls || []), [code]] };
        return res;
    }, { mock: { calls: [] as any[] }, toHaveBeenCalledWith: () => { } }) as any;
    res.json = Object.assign((body: any) => {
        (res.json as any).mock = { calls: [...((res.json as any).mock?.calls || []), [body]] };
        return res;
    }, { mock: { calls: [] as any[] } }) as any;

    return res;
};

// Simple test helper without Jest types
function assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

function assertContains(obj: any, subset: any) {
    for (const key in subset) {
        if (typeof subset[key] === 'object') {
            assertContains(obj[key], subset[key]);
        } else if (obj[key] !== subset[key]) {
            throw new Error(`Expected ${key} to be ${subset[key]} but got ${obj[key]}`);
        }
    }
}

// Export test functions for Jest to run
export async function testLivenessReturns200() {
    const res = mockResponse();
    livenessHandler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 200, 'Expected status 200');
}

export async function testReadinessReturns200WhenNoDependencies() {
    const res = mockResponse();
    const handler = createReadinessHandler();
    await handler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 200, 'Expected status 200');
}

export async function testReadinessReturns503WhenDbFails() {
    const mockPrisma = {
        $queryRaw: async () => { throw new Error('Connection refused'); }
    };
    const res = mockResponse();
    const handler = createReadinessHandler(mockPrisma as any);
    await handler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 503, 'Expected status 503');
}

export async function testReadinessReturns200WhenDbHealthy() {
    const mockPrisma = {
        $queryRaw: async () => [{ result: 1 }]
    };
    const res = mockResponse();
    const handler = createReadinessHandler(mockPrisma as any);
    await handler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 200, 'Expected status 200');
}

export async function testReadinessReturns200WhenRedisHealthy() {
    const mockRedis = {
        ping: async () => 'PONG'
    };
    const res = mockResponse();
    const handler = createReadinessHandler(undefined, mockRedis as any);
    await handler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 200, 'Expected status 200');
}

export async function testReadinessReturns503WhenRedisFails() {
    const mockRedis = {
        ping: async () => { throw new Error('Redis connection failed'); }
    };
    const res = mockResponse();
    const handler = createReadinessHandler(undefined, mockRedis as any);
    await handler(mockRequest, res);
    const calls = (res.status as any).mock.calls;
    assertEqual(calls[0][0], 503, 'Expected status 503');
}

// Run all tests if executed directly
if (require.main === module) {
    (async () => {
        console.log('Running health check tests...');
        try {
            await testLivenessReturns200();
            console.log('✓ testLivenessReturns200');

            await testReadinessReturns200WhenNoDependencies();
            console.log('✓ testReadinessReturns200WhenNoDependencies');

            await testReadinessReturns503WhenDbFails();
            console.log('✓ testReadinessReturns503WhenDbFails');

            await testReadinessReturns200WhenDbHealthy();
            console.log('✓ testReadinessReturns200WhenDbHealthy');

            await testReadinessReturns200WhenRedisHealthy();
            console.log('✓ testReadinessReturns200WhenRedisHealthy');

            await testReadinessReturns503WhenRedisFails();
            console.log('✓ testReadinessReturns503WhenRedisFails');

            console.log('\nAll tests passed!');
        } catch (error) {
            console.error('Test failed:', error);
            process.exit(1);
        }
    })();
}
