import { Router } from 'express';
import * as controller from './users.controller';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/async-handler';
import {
  listUsersQuerySchema,
  updateRoleSchema,
  userIdParamSchema,
} from './users.schemas';

const router = Router();
router.use(requireAuth);

// Anyone in the org can view the team (needed for task assignment dropdowns)
router.get('/', validate(listUsersQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', validate(userIdParamSchema, 'params'), asyncHandler(controller.getById));

// User management = ADMIN only (per spec)
router.patch(
  '/:id/role',
  requireRole('ADMIN'),
  validate(userIdParamSchema, 'params'),
  validate(updateRoleSchema),
  asyncHandler(controller.updateRole),
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(userIdParamSchema, 'params'),
  asyncHandler(controller.remove),
);

export const usersRoutes = router;
