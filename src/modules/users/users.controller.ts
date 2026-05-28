import { Response } from 'express';
import * as service from './users.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function list(req: AuthRequest, res: Response) {
  const result = await service.list(req.user!.orgId, req.query as never);
  res.json(result);
}

export async function getById(req: AuthRequest, res: Response) {
  const user = await service.getById(req.user!.orgId, req.params.id);
  res.json(user);
}

export async function updateRole(req: AuthRequest, res: Response) {
  const user = await service.updateRole(
    req.user!.orgId,
    req.user!.id,
    req.params.id,
    req.body,
  );
  res.json(user);
}

export async function remove(req: AuthRequest, res: Response) {
  await service.remove(req.user!.orgId, req.user!.id, req.params.id);
  res.status(204).send();
}
