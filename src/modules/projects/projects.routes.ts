import { Router } from 'express';
import * as controller from './projects.controller';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/async-handler';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
} from './projects.schemas';

const router = Router();
router.use(requireAuth);

// Anyone in the org can browse projects
router.get('/', validate(listProjectsQuerySchema, 'query'), asyncHandler(controller.list));
router.get('/:id', validate(projectIdParamSchema, 'params'), asyncHandler(controller.getById));

// ADMIN + MANAGER can create / update
router.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate(createProjectSchema),
  asyncHandler(controller.create),
);
router.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(projectIdParamSchema, 'params'),
  validate(updateProjectSchema),
  asyncHandler(controller.update),
);

// ADMIN + MANAGER can delete — "manage projects" per spec includes deletion
router.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate(projectIdParamSchema, 'params'),
  asyncHandler(controller.remove),
);

export const projectsRoutes = router;
