import { Response, NextFunction, RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from './auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Role-based access control middleware.
 *
 * Usage:
 *   router.post('/projects', requireAuth, requireRole('ADMIN', 'MANAGER'), createProject);
 *
 * RBAC lives at the middleware layer — controllers never inspect `req.user.role`.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowed.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires one of: ${allowed.join(', ')}`));
    }
    next();
  };
}
