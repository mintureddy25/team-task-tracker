import { z } from 'zod';

const PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;
const STATUS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(PRIORITY).default('MEDIUM'),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().optional().refine(
    d => !d || d.getTime() > Date.now(),
    'dueDate must be a future date',
  ),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(PRIORITY).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
}).refine(d => Object.keys(d).length > 0, 'At least one field required');
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(STATUS),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  assigneeId: z.union([
    z.string().uuid(),
    z.literal('me'),
    z.literal('unassigned'),
  ]).optional(),
  projectId: z.string().uuid().optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const taskIdParamSchema = z.object({
  id: z.string().uuid(),
});
