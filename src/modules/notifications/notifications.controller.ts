import { Response } from 'express';
import * as service from './notifications.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function list(req: AuthRequest, res: Response) {
  const result = await service.list(req.user!.id, req.query as never);
  res.json(result);
}

export async function markRead(req: AuthRequest, res: Response) {
  const notif = await service.markRead(req.user!.id, req.params.id);
  res.json(notif);
}

export async function markAllRead(req: AuthRequest, res: Response) {
  const result = await service.markAllRead(req.user!.id);
  res.json(result);
}
