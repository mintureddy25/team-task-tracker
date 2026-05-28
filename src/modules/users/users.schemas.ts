import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});
