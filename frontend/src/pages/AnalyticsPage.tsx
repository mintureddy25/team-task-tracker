import clsx from 'clsx';
import { useGetAnalyticsQuery } from '../app/api';

export default function AnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsQuery();

  const rows = data?.items ?? [];
  const totals = rows.reduce(
    (a, r) => ({
      overdue: a.overdue + r.overdueCount,
      open: a.open + r.openCount,
      done: a.done + r.doneCount,
    }),
    { overdue: 0, open: 0, done: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <div className="eyebrow">04 — Insights</div>
        <h1 className="font-display text-4xl text-ink mt-1">Analytics</h1>
        <p className="font-mono text-[11px] uppercase tracking-wider text-faint mt-2">
          Per-user aggregates · live from MySQL window functions
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Overdue" value={totals.overdue} tone="brick" delay={0} />
        <StatCard label="Open" value={totals.open} tone="ochre" delay={60} />
        <StatCard label="Completed" value={totals.done} tone="moss" delay={120} />
      </div>

      <div className="bg-bone border border-line rounded-card shadow-card overflow-hidden animate-fade-up"
           style={{ animationDelay: '180ms' }}>
        <div className="px-5 py-4 border-b border-line-strong">
          <h2 className="font-display text-lg text-ink">Per-user performance</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint mt-1">Sorted by overdue desc, then completed desc</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">User</th>
              <th className="text-left px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Role</th>
              <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Overdue</th>
              <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Open</th>
              <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Done</th>
              <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Avg. completion</th>
              <th className="text-right px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted font-medium">Rank</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center font-display italic text-faint">Loading…</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.userId} className="border-t border-line hover:bg-ink/[0.02] transition-colors">
                <td className="px-5 py-3 font-medium text-ink">{r.name}<span className="ml-2 font-mono text-[11px] text-faint">{r.email}</span></td>
                <td className="px-5 py-3"><span className={clsx('chip', roleChip(r.role))}>{r.role}</span></td>
                <td className={clsx('px-5 py-3 text-right font-mono', r.overdueCount > 0 ? 'text-signal-brick font-semibold' : 'text-faint')}>{r.overdueCount}</td>
                <td className="px-5 py-3 text-right font-mono text-muted">{r.openCount}</td>
                <td className="px-5 py-3 text-right font-mono text-signal-moss">{r.doneCount}</td>
                <td className="px-5 py-3 text-right font-mono text-muted">
                  {r.avgCompletionHours == null ? '—' : `${r.avgCompletionHours.toFixed(1)}h`}
                </td>
                <td className="px-5 py-3 text-right font-mono text-ink">#{r.completionRankInOrg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, delay }: { label: string; value: number; tone: 'brick' | 'ochre' | 'moss'; delay: number }) {
  const accent = {
    brick: 'bg-signal-brick',
    ochre: 'bg-signal-ochre',
    moss: 'bg-signal-moss',
  }[tone];
  return (
    <div className="card relative overflow-hidden animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className={clsx('absolute left-0 top-0 bottom-0 w-1', accent)} />
      <div className="flex items-center gap-2 pl-2">
        <span className={clsx('dot', accent)} />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      </div>
      <p className="font-display text-5xl text-ink mt-3 pl-2 tabular-nums">{value}</p>
    </div>
  );
}

function roleChip(role: string) {
  return role === 'ADMIN'
    ? 'chip-ink'
    : role === 'MANAGER'
      ? 'chip-ochre'
      : 'chip-stone';
}
