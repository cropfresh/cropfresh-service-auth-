import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for tracing context
export const asyncLocalStorage = new AsyncLocalStorage<{ traceId: string }>();

const isProduction = process.env.NODE_ENV === 'production';

const transport = isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    };

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport,
    base: {
        service: process.env.SERVICE_NAME || 'cropfresh-service-auth',
        env: process.env.NODE_ENV || 'development',
    },
    redact: {
        paths: ['password', 'token', 'authorization', 'headers.authorization'],
        censor: '[REDACTED]',
    },
    mixin() {
        const store = asyncLocalStorage.getStore();
        return store ? { trace_id: store.traceId } : {};
    },
});
