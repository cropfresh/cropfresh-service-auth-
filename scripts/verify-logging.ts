import { logger, asyncLocalStorage } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

console.log('--- Starting Logging Verification ---');

// Test 1: Standard Log
logger.info('Test 1: Standard log message');

// Test 2: Redaction
const sensitiveData = {
    user: {
        id: '123',
        password: 'supersecretpassword',
        email: 'test@example.com'
    },
    token: 'eyJh...',
    creditCard: '4111111111111111'
};
logger.info(sensitiveData, 'Test 2: Sensitive data log');

// Test 3: Trace ID Context
const traceId = uuidv4();
asyncLocalStorage.run({ traceId }, () => {
    logger.info('Test 3: Log with Trace ID');
    logger.warn('Test 3: Warning with Trace ID');
});

console.log('--- Verification Complete ---');
