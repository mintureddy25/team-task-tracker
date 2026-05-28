import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { authRoutes } from './modules/auth/auth.routes';

export function buildApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length ? env.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req: Request, res: Response) =>
    res.json({ status: 200, service: 'team-task-tracker', uptime: process.uptime() }),
  );

  app.use('/auth', authRoutes);
  // Mounted in subsequent commits:
  //   app.use('/projects', projectRoutes);
  //   app.use('/tasks', taskRoutes);
  //   app.use('/notifications', notificationRoutes);
  //   app.use('/analytics', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
