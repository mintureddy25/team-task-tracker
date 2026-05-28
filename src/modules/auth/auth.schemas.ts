import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),     // bcrypt max is 72 bytes
  name: z.string().min(1).max(120),
  orgName: z.string().min(1).max(160),     // first user creates their org and becomes ADMIN
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const inviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(120),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
