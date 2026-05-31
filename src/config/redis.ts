import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', err => logger.error({ err }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));

// Dedicated subscriber connection. ioredis requires a separate connection for
// subscribe mode, but ONE is enough — the SSE hub shares this single connection
// across every client (see modules/notifications/sse-hub.ts). Publishing is a
// normal command, so it runs on the main `redis` client (no separate pub conn).
// Steady-state Redis connections: 2 (commands+publish, subscribe) — constant
// regardless of how many SSE clients/tabs are connected.
export const redisSub = new Redis(env.REDIS_URL, { lazyConnect: false });

export async function disconnectRedis() {
  await Promise.allSettled([redis.quit(), redisSub.quit()]);
}
