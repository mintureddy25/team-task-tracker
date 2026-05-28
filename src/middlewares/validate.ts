import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

/**
 * Validate `req[source]` against a Zod schema. On success, the parsed (and
 * coerced) value REPLACES the original — so controllers can trust types.
 */
export function validate(schema: ZodSchema, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(toValidationError(result.error));
    }
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}

function toValidationError(err: ZodError): ValidationError {
  const first = err.issues[0];
  const path = first?.path.join('.') || 'input';
  const message = first ? `${path}: ${first.message}` : 'Invalid input';
  const details = err.issues.map(i => ({
    field: i.path.join('.'),
    message: i.message,
  }));
  return new ValidationError(message, details);
}
