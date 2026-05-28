import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/tokens';
import { UnauthorizedError } from '../utils/errors';

export interface AuthUser {
  id: string;
  orgId: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Verifies the Bearer token and attaches `req.user`.
 * Throw-on-failure; downstream handlers can assume `req.user` exists.
 */
export const requireAuth: RequestHandler = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing Bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, orgId: claims.orgId, role: claims.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
