import { Response } from 'express';
import * as service from './tasks.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function create(req: AuthRequest, res: Response) {
  const task = await service.create(req.user!, req.body);
  res.status(201).json(task);
}

export async function list(req: AuthRequest, res: Response) {
  const result = await service.list(req.user!, req.query as never);
  res.json(result);
}

export async function getById(req: AuthRequest, res: Response) {
  const task = await service.getById(req.user!, req.params.id);
  res.json(task);
}

export async function update(req: AuthRequest, res: Response) {
  const task = await service.update(req.user!, req.params.id, req.body);
  res.json(task);
}

export async function changeStatus(req: AuthRequest, res: Response) {
  const task = await service.changeStatus(req.user!, req.params.id, req.body);
  res.json(task);
}

export async function remove(req: AuthRequest, res: Response) {
  await service.remove(req.user!, req.params.id);
  res.status(204).send();
}
