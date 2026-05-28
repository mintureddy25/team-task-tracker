import { Router } from 'express';
import * as controller from './tasks.controller';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/async-handler';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
} from './tasks.schemas';

const router = Router();
router.use(requireAuth);

router.get('/', validate(listTasksQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', validate(taskIdParamSchema, 'params'), asyncHandler(controller.getById));

// Create — ADMIN, MANAGER
router.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createTaskSchema),
  asyncHandler(controller.create),
);

// Update task fields — assignee-only enforcement happens in service for MEMBER,
// route-level allows any authenticated user, fine-grained check in service.
router.patch(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  validate(updateTaskSchema),
  asyncHandler(controller.update),
);

// Status transition — assignee or MANAGER (enforced in service)
router.patch(
  '/:id/status',
  validate(taskIdParamSchema, 'params'),
  validate(updateStatusSchema),
  asyncHandler(controller.changeStatus),
);

// Delete — ADMIN, MANAGER (MEMBER blocked at service)
router.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(taskIdParamSchema, 'params'),
  asyncHandler(controller.remove),
);

export const tasksRoutes = router;
