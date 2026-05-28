import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../utils/errors';
import type { ListUsersQuery, UpdateRoleInput } from './users.schemas';

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

export async function list(orgId: string, q: ListUsersQuery) {
  const where = { orgId, ...(q.role ? { role: q.role } : {}) };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function getById(orgId: string, id: string) {
  const user = await prisma.user.findFirst({
    where: { id, orgId },
    select: USER_PUBLIC_SELECT,
  });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateRole(
  orgId: string,
  actingUserId: string,
  targetId: string,
  input: UpdateRoleInput,
) {
  if (actingUserId === targetId) {
    throw new ForbiddenError('You cannot change your own role');
  }

  const target = await prisma.user.findFirst({ where: { id: targetId, orgId } });
  if (!target) throw new NotFoundError('User');

  // Don't allow demoting the last ADMIN — would orphan the org.
  if (target.role === 'ADMIN' && input.role !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { orgId, role: 'ADMIN' } });
    if (adminCount <= 1) {
      throw new UnprocessableError(
        'LAST_ADMIN',
        'Cannot demote the last ADMIN in the organization',
      );
    }
  }

  return prisma.user.update({
    where: { id: targetId },
    data: { role: input.role },
    select: USER_PUBLIC_SELECT,
  });
}

/**
 * Hard delete with reassign.
 *
 * Why hard delete: see README "Deletion strategy" — no Trash/restore UI in v1,
 * so soft-delete would be dead weight.
 *
 * Cascade safety:
 *   - assignedTasks  → assigneeId set to NULL (configured at DB level)
 *   - createdTasks   → reassigned to the deleting ADMIN before delete
 *   - createdProjects → reassigned to the deleting ADMIN before delete
 *   - refreshTokens  → cascade delete (configured at DB level)
 *   - notifications  → cascade delete (configured at DB level)
 *
 * Guards:
 *   - Cannot delete yourself
 *   - Cannot delete the last ADMIN (would orphan the org)
 */
export async function remove(orgId: string, actingUserId: string, targetId: string) {
  if (actingUserId === targetId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const target = await prisma.user.findFirst({ where: { id: targetId, orgId } });
  if (!target) throw new NotFoundError('User');

  if (target.role === ('ADMIN' as Role)) {
    const adminCount = await prisma.user.count({ where: { orgId, role: 'ADMIN' } });
    if (adminCount <= 1) {
      throw new UnprocessableError(
        'LAST_ADMIN',
        'Cannot delete the last ADMIN in the organization',
      );
    }
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { createdById: targetId },
      data: { createdById: actingUserId },
    }),
    prisma.project.updateMany({
      where: { createdById: targetId },
      data: { createdById: actingUserId },
    }),
    prisma.user.delete({ where: { id: targetId } }),
  ]);
}
