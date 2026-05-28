// Mirror of the server enums + DTOs.

export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'TASK_DUE_SOON';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
export const ROLES: Role[] = ['ADMIN', 'MANAGER', 'MEMBER'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
  createdAt?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface NotificationsList extends Paginated<Notification> {
  unreadCount: number;
}

export interface AnalyticsRow {
  userId: string;
  name: string;
  email: string;
  role: Role;
  overdueCount: number;
  openCount: number;
  doneCount: number;
  avgCompletionHours: number | null;
  completionRankInOrg: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}
