import { Response } from 'express';
import * as service from './analytics.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function perUser(req: AuthRequest, res: Response) {
  const rows = await service.perUser(req.user!.orgId);
  res.json({ items: rows });
}
