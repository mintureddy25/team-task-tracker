import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../utils/errors';
import { canTransition, allowedNextStates } from './status-transitions';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
  UpdateStatusInput,
} from './tasks.schemas';

interface ActingUser {
  id: string;
  orgId: string;
  role: Role;
}

// ─────────────────────── CREATE ───────────────────────

export async function create(user: ActingUser, input: CreateTaskInput) {
  // Project must belong to the user's org
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: user.orgId },
  });
  if (!project) throw new NotFoundError('Project');

  if (input.assigneeId) {
    await assertUserInOrg(input.assigneeId, user.orgId);
  }

  return prisma.task.create({
    data: {
      projectId: project.id,
      title: input.title,
      description: input.description,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      createdById: user.id,
    },
  });
}

// ─────────────────────── LIST ───────────────────────

export async function list(user: ActingUser, q: ListTasksQuery) {
  const where: Prisma.TaskWhereInput = {
    project: { orgId: user.orgId },
  };

  if (q.projectId) where.projectId = q.projectId;
  if (q.status)    where.status = q.status;
  if (q.priority)  where.priority = q.priority;

  if (q.assigneeId === 'me')          where.assigneeId = user.id;
  else if (q.assigneeId === 'unassigned') where.assigneeId = null;
  else if (q.assigneeId)              where.assigneeId = q.assigneeId;

  // MEMBER can only see tasks assigned to them (per spec).
  if (user.role === 'MEMBER') {
    where.assigneeId = user.id;
  }

  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: q.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

// ─────────────────────── READ ONE ───────────────────────

export async function getById(user: ActingUser, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, project: { orgId: user.orgId } },
  });
  if (!task) throw new NotFoundError('Task');

  // MEMBER can only view tasks assigned to them
  if (user.role === 'MEMBER' && task.assigneeId !== user.id) {
    throw new NotFoundError('Task');
  }

  return task;
}

// ─────────────────────── UPDATE (fields, not status) ───────────────────────

export async function update(user: ActingUser, id: string, input: UpdateTaskInput) {
  const existing = await getById(user, id);

  // MEMBER may update only tasks assigned to them, AND only the fields they need
  // for execution (description, dueDate? — keep tight). Spec: "view and update
  // only tasks assigned to them". We allow MEMBER to edit anything on their own
  // task EXCEPT changing the assignee (re-assignment = manager-level action).
  if (user.role === 'MEMBER') {
    if (existing.assigneeId !== user.id) {
      throw new ForbiddenError('You can only update tasks assigned to you');
    }
    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      throw new ForbiddenError('MEMBER cannot reassign tasks');
    }
  }

  if (input.assigneeId) {
    await assertUserInOrg(input.assigneeId, user.orgId);
  }

  return prisma.task.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
    },
  });
}

// ─────────────────────── DELETE ───────────────────────

export async function remove(user: ActingUser, id: string) {
  const existing = await getById(user, id);

  // MEMBER cannot delete tasks (only ADMIN/MANAGER)
  if (user.role === 'MEMBER') {
    throw new ForbiddenError('Only ADMIN or MANAGER can delete tasks');
  }

  await prisma.task.delete({ where: { id: existing.id } });
}

// ─────────────────────── STATUS TRANSITION ───────────────────────

export async function changeStatus(
  user: ActingUser,
  id: string,
  input: UpdateStatusInput,
) {
  const existing = await getById(user, id);

  // Only the assignee or a MANAGER (and ADMIN, which is a superset of MANAGER
  // for project management) can advance status. Spec line for this is exact.
  const isAssignee = existing.assigneeId === user.id;
  const isMgrOrAdmin = user.role === 'MANAGER' || user.role === 'ADMIN';
  if (!isAssignee && !isMgrOrAdmin) {
    throw new ForbiddenError('Only the assignee or a MANAGER can change task status');
  }

  if (!canTransition(existing.status, input.status)) {
    throw new UnprocessableError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition ${existing.status} → ${input.status}. ` +
      `Allowed next: ${allowedNextStates(existing.status).join(', ') || '(none — terminal)'}`,
    );
  }

  // Stamp completedAt on entry to DONE (used by analytics for avg completion time).
  const completedAt =
    input.status === 'DONE' && existing.status !== 'DONE' ? new Date() : existing.completedAt;

  return prisma.task.update({
    where: { id },
    data: { status: input.status, completedAt },
  });
}

// ─────────────────────── INTERNAL ───────────────────────

async function assertUserInOrg(userId: string, orgId: string) {
  const exists = await prisma.user.findFirst({
    where: { id: userId, orgId },
    select: { id: true },
  });
  if (!exists) {
    throw new UnprocessableError(
      'ASSIGNEE_NOT_IN_ORG',
      'Assignee must be a user in the same organization',
    );
  }
}
