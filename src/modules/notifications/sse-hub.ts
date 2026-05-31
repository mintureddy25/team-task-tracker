import type { Response } from 'express';
import { redisSub } from '../../config/redis';
import { logger } from '../../config/logger';

/**
 * SSE fan-out hub.
 *
 * One process-wide Redis subscriber connection (`redisSub`) serves EVERY
 * connected SSE client. We keep an in-memory map of channel → open responses
 * and route each pub/sub message to the right streams. This keeps the Redis
 * connection count constant (it does NOT grow per client/tab), which matters
 * on small/free Redis plans with a low connection cap.
 *
 * We subscribe to a channel on Redis only for its FIRST local client, and
 * unsubscribe when its LAST client disconnects.
 */
const channels = new Map<string, Set<Response>>();

let wired = false;
function ensureWired() {
  if (wired) return;
  wired = true;
  redisSub.on('message', (channel, message) => {
    const set = channels.get(channel);
    if (!set) return;
    for (const res of set) {
      res.write(`event: notification\ndata: ${message}\n\n`);
    }
  });
}

export async function addClient(channel: string, res: Response): Promise<void> {
  ensureWired();
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
    await redisSub.subscribe(channel);
  }
  set.add(res);
  logger.debug({ channel, clients: set.size }, 'sse client added');
}

export async function removeClient(channel: string, res: Response): Promise<void> {
  const set = channels.get(channel);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    channels.delete(channel);
    await redisSub.unsubscribe(channel).catch(() => undefined);
  }
  logger.debug({ channel, clients: set.size }, 'sse client removed');
}
