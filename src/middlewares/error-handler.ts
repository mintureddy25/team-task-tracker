import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

/**
 * Global error handler. Every error response uses the same shape:
 *   { status, code, message, details? }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1. Known domain errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // 2. Prisma known request errors → map to friendly codes
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    return res.status(mapped.status).json(mapped);
  }

  // 3. Anything else → 500, log full stack server-side, hide internals from client
  logger.error({ err }, 'unhandled error');
  return res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError) {
  switch (err.code) {
    case 'P2002': // unique constraint
      return {
        status: 409,
        code: 'CONFLICT',
        message: 'A record with these values already exists',
        details: { target: err.meta?.target },
      };
    case 'P2003': // FK violation
      return {
        status: 400,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Referenced record does not exist',
        details: { field: err.meta?.field_name },
      };
    case 'P2025': // record not found
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'Record not found',
      };
    default:
      return {
        status: 400,
        code: `PRISMA_${err.code}`,
        message: err.message.split('\n').pop() || 'Database error',
      };
  }
}
