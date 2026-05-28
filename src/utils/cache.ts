import crypto from 'crypto';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Cache strategy (also described in README §Caching):
 *
 * Key shape:  `tasks:assignee:{assigneeId}:{md5(queryString)}`
 *
 * Why per-assignee namespace:
 *   - MEMBER's task board ("my open tasks") is the single hottest query in the API.
 *   - Invalidation when a task changes is bounded — we only need to wipe the
 *     namespace(s) of the affected assignee(s), not the whole tasks cache.
 *   - SCAN by prefix is O(matching keys), not O(all keys).
 *
 * TTL: short (default 60s, env.CACHE_TTL_SECONDS) — cache is a defence-in-depth
 * read-shedder, not the source of truth. Even if invalidation misses, staleness
 * is capped at TTL.
 *
 * Invalidation triggers (in tasks.service.ts):
 *   - createTask   → invalidate the new assignee's namespace
 *   - updateTask   → invalidate OLD and NEW assignee (reassignment)
 *   - changeStatus → invalidate the assignee's namespace
 *   - deleteTask   → invalidate the assignee's namespace
 */

export function tasksByAssigneeKey(assigneeId: string, queryStr: string): string {
  const hash = crypto.createHash('md5').update(queryStr).digest('hex').slice(0, 12);
  return `tasks:assignee:${assigneeId}:${hash}`;
}

export function tasksByAssigneePattern(assigneeId: string): string {
  return `tasks:assignee:${assigneeId}:*`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn({ err, key }, 'cache read failed — falling through to DB');
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds = env.CACHE_TTL_SECONDS) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'cache write failed — ignoring');
  }
}

/**
 * SCAN + UNLINK by pattern. UNLINK is non-blocking (unlike DEL); SCAN avoids
 * the production-killing KEYS command.
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;
  try {
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (batch.length) {
        deleted += batch.length;
        await redis.unlink(...batch);
      }
    } while (cursor !== '0');
    return deleted;
  } catch (err) {
    logger.warn({ err, pattern }, 'cache invalidation failed');
    return deleted;
  }
}
