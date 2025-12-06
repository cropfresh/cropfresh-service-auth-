import express from 'express';
import { metricsHandler } from '../../src/middleware/monitoring';
import http from 'http';

// Simple test helper
function assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

function assertContains(text: string, substring: string, message?: string) {
    if (!text.includes(substring)) {
        throw new Error(message || `Expected text to contain "${substring}"`);
    }
}

// Test: metrics endpoint returns 200
export async function testMetricsReturns200() {
    const app = express();
    app.get('/metrics', metricsHandler);

    return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = (server.address() as any).port;
            http.get(`http://localhost:${port}/metrics`, (res) => {
                assertEqual(res.statusCode, 200, 'Expected status 200');
                server.close();
                resolve();
            }).on('error', (err) => {
                server.close();
                reject(err);
            });
        });
    });
}

// Test: metrics contains expected metrics
export async function testMetricsContainsExpectedMetrics() {
    const app = express();
    app.get('/metrics', metricsHandler);

    return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = (server.address() as any).port;
            http.get(`http://localhost:${port}/metrics`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        assertContains(data, 'http_request', 'Should contain HTTP request metrics');
                        server.close();
                        resolve();
                    } catch (err) {
                        server.close();
                        reject(err);
                    }
                });
            }).on('error', (err) => {
                server.close();
                reject(err);
            });
        });
    });
}

// Run all tests if executed directly
if (require.main === module) {
    (async () => {
        console.log('Running metrics tests...');
        try {
            await testMetricsReturns200();
            console.log('✓ testMetricsReturns200');

            await testMetricsContainsExpectedMetrics();
            console.log('✓ testMetricsContainsExpectedMetrics');

            console.log('\nAll tests passed!');
        } catch (error) {
            console.error('Test failed:', error);
            process.exit(1);
        }
    })();
}
