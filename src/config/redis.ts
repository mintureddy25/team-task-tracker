import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', err => logger.error({ err }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));

// Separate pub/sub clients — ioredis requires distinct connections for subscribe mode.
export const redisPub = new Redis(env.REDIS_URL, { lazyConnect: false });
export const redisSub = new Redis(env.REDIS_URL, { lazyConnect: false });

export async function disconnectRedis() {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit()]);
}
