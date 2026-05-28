import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma } from './config/prisma';
import { disconnectRedis } from './config/redis';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  logger.info(`SSE stream  at http://localhost:${env.PORT}/notifications/stream?token=...`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await disconnectPrisma();
    await disconnectRedis();
    process.exit(0);
  });

  // Force exit if graceful shutdown hangs past 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
