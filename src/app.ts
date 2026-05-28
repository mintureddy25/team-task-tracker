import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openapiSpec } from './config/openapi';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { projectsRoutes } from './modules/projects/projects.routes';
import { tasksRoutes } from './modules/tasks/tasks.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';

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

  // ─── API docs ───
  // Postman: File > Import > Link → http://localhost:3000/docs/openapi.json
  app.get('/docs/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/projects', projectsRoutes);
  app.use('/tasks', tasksRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/analytics', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
