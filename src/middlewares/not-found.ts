import { Request, Response } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    message: 'The requested route does not exist',
  });
}
