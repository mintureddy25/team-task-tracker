import { Router } from 'express';
import * as controller from './analytics.controller';
import { requireAuth } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
router.use(requireAuth);

// Performance / overdue dashboard — visible to ADMIN and MANAGER only.
// MEMBERs don't need org-wide visibility into others' completion rates.
router.get('/users', requireRole('ADMIN', 'MANAGER'), asyncHandler(controller.perUser));

export const analyticsRoutes = router;
