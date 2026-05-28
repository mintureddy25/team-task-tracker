import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

/**
 * Per-user analytics for the acting user's org.
 *
 * Returns one row per user with:
 *   - overdueCount         tasks where due_date < now() AND status NOT IN (DONE, BLOCKED)
 *   - openCount            all non-DONE, non-BLOCKED tasks
 *   - doneCount            completed tasks
 *   - avgCompletionHours   AVG(completedAt - createdAt) over their DONE tasks
 *   - completionRankInOrg  RANK() OVER (ORDER BY doneCount DESC)  ← window function
 *
 * Implementation: single raw query — far more efficient than N+1 round-trips.
 * Uses MySQL 8 window functions (RANK OVER). Ordered by overdue DESC so the
 * users needing attention bubble to the top.
 */
export interface UserAnalyticsRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  overdueCount: number;
  openCount: number;
  doneCount: number;
  avgCompletionHours: number | null;
  completionRankInOrg: number;
}

export async function perUser(orgId: string): Promise<UserAnalyticsRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    overdueCount: bigint;
    openCount: bigint;
    doneCount: bigint;
    avgCompletionHours: number | null;
    completionRankInOrg: bigint;
  }>>(Prisma.sql`
    SELECT
      u.id                                                   AS userId,
      u.name                                                 AS name,
      u.email                                                AS email,
      u.role                                                 AS role,
      COALESCE(SUM(CASE
        WHEN t.dueDate IS NOT NULL
          AND t.dueDate < NOW()
          AND t.status NOT IN ('DONE','BLOCKED')
        THEN 1 ELSE 0 END), 0)                              AS overdueCount,
      COALESCE(SUM(CASE
        WHEN t.status NOT IN ('DONE','BLOCKED')
        THEN 1 ELSE 0 END), 0)                              AS openCount,
      COALESCE(SUM(CASE
        WHEN t.status = 'DONE'
        THEN 1 ELSE 0 END), 0)                              AS doneCount,
      AVG(CASE
        WHEN t.status = 'DONE' AND t.completedAt IS NOT NULL
        THEN TIMESTAMPDIFF(SECOND, t.createdAt, t.completedAt) / 3600.0
        ELSE NULL END)                                      AS avgCompletionHours,
      RANK() OVER (
        ORDER BY SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) DESC
      )                                                     AS completionRankInOrg
    FROM users u
    LEFT JOIN tasks t ON t.assigneeId = u.id
    WHERE u.orgId = ${orgId}
    GROUP BY u.id, u.name, u.email, u.role
    ORDER BY overdueCount DESC, doneCount DESC
  `);

  return rows.map(r => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    role: r.role,
    overdueCount: Number(r.overdueCount),
    openCount: Number(r.openCount),
    doneCount: Number(r.doneCount),
    avgCompletionHours: r.avgCompletionHours == null ? null : Number(r.avgCompletionHours),
    completionRankInOrg: Number(r.completionRankInOrg),
  }));
}
