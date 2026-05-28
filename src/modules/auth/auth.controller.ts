import { Request, Response } from 'express';
import * as service from './auth.service';
import type { AuthRequest } from '../../middlewares/auth';

export async function register(req: Request, res: Response) {
  const result = await service.registerWithNewOrg(req.body);
  res.status(201).json(result);
}

export async function invite(req: AuthRequest, res: Response) {
  const result = await service.inviteUser(req.user!.orgId, req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await service.login(req.body);
  res.json(result);
}

export async function refresh(req: Request, res: Response) {
  const result = await service.refresh(req.body.refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response) {
  await service.logout(req.body.refreshToken);
  res.status(204).send();
}

export async function me(req: AuthRequest, res: Response) {
  res.json({ user: req.user });
}
