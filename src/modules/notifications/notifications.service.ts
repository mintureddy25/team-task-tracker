import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { NotFoundError } from '../../utils/errors';
import type { ListNotificationsQuery } from './notifications.schemas';

export const NOTIFICATION_CHANNEL = (userId: string) => `notifications:${userId}`;

interface EmitParams {
  userId: string;
  type: NotificationType;
  taskId?: string | null;
  payload: Prisma.JsonObject;
}

/**
 * Persist a notification AND publish it to the user's Redis channel.
 * The WebSocket gateway subscribes to these channels and pushes to connected sockets.
 */
export async function emit({ userId, type, taskId, payload }: EmitParams) {
  const notif = await prisma.notification.create({
    data: { userId, type, taskId: taskId ?? null, payload },
  });

  await redis.publish(NOTIFICATION_CHANNEL(userId), JSON.stringify(notif));
  return notif;
}

export async function list(userId: string, q: ListNotificationsQuery) {
  const where: Prisma.NotificationWhereInput = { userId };
  if (q.unreadOnly) where.readAt = null;

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items,
    unreadCount,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) throw new NotFoundError('Notification');
  if (notif.readAt) return notif;
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
