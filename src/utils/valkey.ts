import Redis from 'ioredis';
import { logger } from './logger';

const VALKEY_HOST = process.env.VALKEY_HOST || 'localhost';
const VALKEY_PORT = parseInt(process.env.VALKEY_PORT || '6379', 10);

export const valkey = new Redis({
  host: VALKEY_HOST,
  port: VALKEY_PORT,
  lazyConnect: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

valkey.on('connect', () => {
  logger.info('Successfully connected to Valkey');
});

valkey.on('error', (err) => {
  logger.error({ err }, 'Valkey connection error');
});
