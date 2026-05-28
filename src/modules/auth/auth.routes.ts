import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/async-handler';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  inviteSchema,
} from './auth.schemas';

const router = Router();

// Public — first signup creates a new org and makes the user ADMIN
router.post('/register', validate(registerSchema), asyncHandler(controller.register));

router.post('/login',   validate(loginSchema),   asyncHandler(controller.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
router.post('/logout',  validate(refreshSchema), asyncHandler(controller.logout));

// Authenticated
router.get('/me', requireAuth, asyncHandler(controller.me));

// ADMIN-only: add a teammate to your org
router.post(
  '/invite',
  requireAuth,
  requireRole('ADMIN'),
  validate(inviteSchema),
  asyncHandler(controller.invite),
);

export const authRoutes = router;
