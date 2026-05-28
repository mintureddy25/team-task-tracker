import { Router } from 'express';
import * as controller from './notifications.controller';
import { streamNotifications } from './notifications.stream';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/async-handler';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notifications.schemas';

const router = Router();

// SSE stream — own auth (token via ?token=… because EventSource cannot send headers)
router.get('/stream', asyncHandler(streamNotifications));

router.use(requireAuth);

router.get('/', validate(listNotificationsQuerySchema, 'query'), asyncHandler(controller.list));
router.patch('/read-all', asyncHandler(controller.markAllRead));
router.patch(
  '/:id/read',
  validate(notificationIdParamSchema, 'params'),
  asyncHandler(controller.markRead),
);

export const notificationsRoutes = router;
