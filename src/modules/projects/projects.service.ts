import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from './projects.schemas';

export async function create(orgId: string, createdById: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      orgId,
      createdById,
      name: input.name,
      description: input.description,
    },
  });
}

export async function list(orgId: string, q: ListProjectsQuery) {
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: q.limit,
    }),
    prisma.project.count({ where: { orgId } }),
  ]);
  return {
    items,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function getById(orgId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, orgId } });
  if (!project) throw new NotFoundError('Project');
  return project;
}

export async function update(orgId: string, id: string, input: UpdateProjectInput) {
  // Ensure org-scoping first — never let cross-org IDs slip through
  await getById(orgId, id);
  return prisma.project.update({
    where: { id },
    data: input,
  });
}

export async function remove(orgId: string, id: string) {
  await getById(orgId, id);
  await prisma.project.delete({ where: { id } });
}
