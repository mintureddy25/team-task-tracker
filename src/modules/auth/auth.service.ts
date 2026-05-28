import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  ttlToSeconds,
} from '../../utils/tokens';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors';
import type { RegisterInput, InviteInput, LoginInput } from './auth.schemas';
import type { Role, User } from '@prisma/client';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends TokenPair {
  user: { id: string; email: string; name: string; role: Role; orgId: string };
}

// ─────────────────────────── REGISTRATION ───────────────────────────

/**
 * First-time signup: creates a new organization and makes the user its ADMIN.
 * Use this for the very first user — subsequent users join via invite (below).
 */
export async function registerWithNewOrg(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async tx => {
    const org = await tx.organization.create({ data: { name: input.orgName } });

    try {
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.name,
          role: 'ADMIN',
        },
      });
      return { user };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictError('Email already registered in this organization');
      }
      throw err;
    }
  });

  return issueTokens(result.user);
}

/**
 * ADMIN-only: invite a new member into an EXISTING org.
 * RBAC guard is enforced in the route layer.
 */
export async function inviteUser(orgId: string, input: InviteInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        orgId,
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: input.role,
      },
    });
    return issueTokens(user);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError('Email already registered in this organization');
    }
    throw err;
  }
}

// ─────────────────────────── LOGIN ───────────────────────────

export async function login(input: LoginInput): Promise<AuthResult> {
  // We scan all orgs for this email — same email can exist in two orgs.
  const users = await prisma.user.findMany({
    where: { email: input.email.toLowerCase() },
  });

  // Always run bcrypt at least once to avoid email-existence timing oracle.
  const candidate = users[0] ?? null;
  const hashForTiming = candidate?.passwordHash ?? '$2a$12$invalidhashinvalidhashinvalidhashinvalidhash';

  let matched: User | null = null;
  for (const u of users) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyPassword(input.password, u.passwordHash)) {
      matched = u;
      break;
    }
  }
  if (!matched) {
    // Single throw — generic message so attacker can't distinguish "no user" vs "wrong password".
    await verifyPassword(input.password, hashForTiming).catch(() => undefined);
    throw new UnauthorizedError('Invalid email or password');
  }

  return issueTokens(matched);
}

// ─────────────────────────── REFRESH ROTATION ───────────────────────────

/**
 * Refresh token rotation with reuse detection.
 *
 * Each refresh exchanges the old token for a new one. The old row's `revokedAt`
 * is set and `replacedBy` points to the new row → forming an audit chain.
 *
 * If the SAME old token is presented twice (reuse), we assume it was stolen
 * and revoke the entire chain belonging to that user — forcing re-login on
 * every device. Standard OWASP refresh-rotation defence.
 */
export async function refresh(rawRefreshToken: string): Promise<TokenPair> {
  let claims;
  try {
    claims = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  // Token not in DB at all → invalid (or already deleted)
  if (!row) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Token was already revoked → REUSE DETECTED.
  if (row.revokedAt) {
    logger.warn({ userId: row.userId }, 'refresh-token reuse detected, revoking chain');
    await prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected — please log in again');
  }

  if (row.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw new UnauthorizedError('User no longer exists');

  // Rotate: revoke old, issue new
  const newPair = await issueTokensWithoutReturn(user);
  const newHash = hashRefreshToken(newPair.refreshToken);
  const newRow = await prisma.refreshToken.findUnique({ where: { tokenHash: newHash } });

  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), replacedBy: newRow?.id },
  });

  return newPair;
}

// ─────────────────────────── LOGOUT ───────────────────────────

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row) throw new NotFoundError('Refresh token');
  if (!row.revokedAt) {
    await prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
  }
}

// ─────────────────────────── INTERNAL ───────────────────────────

async function issueTokens(user: User): Promise<AuthResult> {
  const pair = await issueTokensWithoutReturn(user);
  return {
    ...pair,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
    },
  };
}

async function issueTokensWithoutReturn(user: User): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, orgId: user.orgId, role: user.role });

  // Pre-create the refresh-token row so we have an id to put in `jti`.
  const placeholder = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: `pending-${user.id}-${Date.now()}-${Math.random()}`,
      expiresAt: new Date(Date.now() + ttlToSeconds(env.JWT_REFRESH_TTL) * 1000),
    },
  });

  const refreshToken = signRefreshToken({ sub: user.id, jti: placeholder.id });
  const tokenHash = hashRefreshToken(refreshToken);

  await prisma.refreshToken.update({
    where: { id: placeholder.id },
    data: { tokenHash },
  });

  return { accessToken, refreshToken };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}
