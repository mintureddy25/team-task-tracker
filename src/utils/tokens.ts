import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;       // user id
  orgId: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;       // user id
  jti: string;       // refresh-token row id (rotation chain anchor)
}

export function signAccessToken(claims: Omit<AccessTokenClaims, 'iat' | 'exp'>): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function signRefreshToken(claims: Omit<RefreshTokenClaims, 'iat' | 'exp'>): string {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
}

// Refresh tokens are stored as SHA-256 hashes — never the raw JWT itself.
// This way a DB leak doesn't hand attackers usable tokens.
export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// TTL ("7d", "15m") → seconds — used to set expiresAt on refresh-token rows.
export function ttlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)\s*([smhd])$/);
  if (!m) throw new Error(`Invalid TTL format: ${ttl}`);
  const n = Number(m[1]);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: throw new Error(`Invalid TTL unit: ${m[2]}`);
  }
}
