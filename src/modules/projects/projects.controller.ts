import { Response } from 'express';
import * as service from './projects.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function create(req: AuthRequest, res: Response) {
  const project = await service.create(req.user!.orgId, req.user!.id, req.body);
  res.status(201).json(project);
}

export async function list(req: AuthRequest, res: Response) {
  const result = await service.list(req.user!.orgId, req.query as never);
  res.json(result);
}

export async function getById(req: AuthRequest, res: Response) {
  const project = await service.getById(req.user!.orgId, req.params.id);
  res.json(project);
}

export async function update(req: AuthRequest, res: Response) {
  const project = await service.update(req.user!.orgId, req.params.id, req.body);
  res.json(project);
}

export async function remove(req: AuthRequest, res: Response) {
  await service.remove(req.user!.orgId, req.params.id);
  res.status(204).send();
}
