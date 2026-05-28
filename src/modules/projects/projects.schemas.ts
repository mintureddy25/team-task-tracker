import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});
