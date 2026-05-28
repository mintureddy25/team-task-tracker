// Integration test: refresh rotation flow and reuse-detection chain revocation.
// Hits the real DB (configured via DATABASE_URL in .env).

import request from 'supertest';
import { buildApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { disconnectRedis } from '../src/config/redis';

const app = buildApp();

// Each test gets a unique email so suites can run repeatedly without manual cleanup.
const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

afterAll(async () => {
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('POST /auth/refresh — rotation + reuse detection', () => {
  it('rotates the refresh token and lets the new one be used', async () => {
    // Register
    const email = uniqueEmail('rotate');
    const reg = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'R', orgName: 'RotateOrg' });
    expect(reg.status).toBe(201);
    const firstRefresh = reg.body.refreshToken;

    // First rotate — should succeed and return a NEW refresh
    const r1 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).toBeTruthy();
    expect(r1.body.refreshToken).not.toBe(firstRefresh);
    expect(r1.body.accessToken).toBeTruthy();

    // The NEW refresh should itself be valid
    const r2 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: r1.body.refreshToken });
    expect(r2.status).toBe(200);
  });

  it('reuses old refresh → 401 with REUSE message + revokes entire chain', async () => {
    const email = uniqueEmail('reuse');
    const reg = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'R', orgName: 'ReuseOrg' });
    const original = reg.body.refreshToken;

    // First rotation — succeeds (original token is now revoked, new one issued)
    const r1 = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: original });
    expect(r1.status).toBe(200);
    const fresh = r1.body.refreshToken;

    // Reuse the ORIGINAL (now-revoked) token → server detects reuse
    const reuse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: original });
    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe('UNAUTHORIZED');
    expect(reuse.body.message).toMatch(/reuse detected/i);

    // The NEW token issued from the first rotation must now ALSO be revoked
    // (entire chain wiped — OWASP recommendation against stolen tokens)
    const afterChainRevoke = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: fresh });
    expect(afterChainRevoke.status).toBe(401);
  });

  it('rejects a refresh token signed with the wrong secret', async () => {
    const garbage =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmMiLCJqdGkiOiJ4eHgiLCJpYXQiOjF9.bogus';
    const res = await request(app).post('/auth/refresh').send({ refreshToken: garbage });
    expect(res.status).toBe(401);
  });
});
