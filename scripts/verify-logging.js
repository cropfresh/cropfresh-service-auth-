"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../src/utils/logger");
const uuid_1 = require("uuid");
console.log('--- Starting Logging Verification ---');
// Test 1: Standard Log
logger_1.logger.info('Test 1: Standard log message');
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
logger_1.logger.info(sensitiveData, 'Test 2: Sensitive data log');
// Test 3: Trace ID Context
const traceId = (0, uuid_1.v4)();
logger_1.asyncLocalStorage.run({ traceId }, () => {
    logger_1.logger.info('Test 3: Log with Trace ID');
    logger_1.logger.warn('Test 3: Warning with Trace ID');
});
console.log('--- Verification Complete ---');
