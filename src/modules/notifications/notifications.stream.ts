import type { Request, Response } from 'express';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { verifyAccessToken } from '../../utils/tokens';
import { UnauthorizedError } from '../../utils/errors';

/**
 * SSE endpoint for real-time notifications.
 *
 *   GET /notifications/stream?token=<jwt>
 *
 * Why SSE (not WebSocket):
 *   Notifications are server-push only. SSE gives us auto-reconnect (built into
 *   browser EventSource), works through standard HTTP proxies, and avoids the
 *   socket.io dependency. WebSocket would be needed if the client also pushed
 *   messages back — chat, presence, collab — which we don't.
 *
 * JWT delivery:
 *   EventSource cannot set custom headers, so we accept the token via:
 *     1. ?token=...  query param  (browser EventSource)
 *     2. Authorization: Bearer ...  header (curl / SSE clients that allow it)
 *
 * Backplane:
 *   Each connection creates its OWN Redis subscriber, subscribed to
 *   `notifications:{userId}`. The API publishes there when a notification is
 *   persisted. This horizontally scales — any API instance can publish, any
 *   instance holding the socket forwards to the user.
 */
export async function streamNotifications(req: Request, res: Response) {
  const token =
    (typeof req.query.token === 'string' ? req.query.token : null) ||
    extractBearer(req);

  if (!token) throw new UnauthorizedError('Missing token (use ?token=... or Authorization header)');

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx response buffering
  res.flushHeaders();

  // Initial hello so the client knows we're connected (EventSource fires onopen)
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, ts: Date.now() })}\n\n`);

  // Per-connection subscriber — ioredis doesn't allow regular commands on a
  // subscribed connection, so we can't reuse the shared redisSub here.
  const sub = new Redis(env.REDIS_URL);
  const channel = `notifications:${userId}`;
  await sub.subscribe(channel);

  sub.on('message', (_ch, message) => {
    res.write(`event: notification\ndata: ${message}\n\n`);
  });

  // Heartbeat every 25s — keeps proxies from closing the idle connection
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25_000);

  const cleanup = async () => {
    clearInterval(heartbeat);
    await sub.quit().catch(() => undefined);
    logger.debug({ userId }, 'sse client disconnected');
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  logger.debug({ userId }, 'sse client connected');
}

function extractBearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}
