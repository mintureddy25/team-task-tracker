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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Overdue" value={totals.overdue} tone="red" />
        <StatCard label="Open" value={totals.open} tone="amber" />
        <StatCard label="Completed" value={totals.done} tone="emerald" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="font-semibold">Per-user performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sorted by overdue desc, then completed desc</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="text-left px-4 py-2">User</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-right px-4 py-2">Overdue</th>
              <th className="text-right px-4 py-2">Open</th>
              <th className="text-right px-4 py-2">Done</th>
              <th className="text-right px-4 py-2">Avg. completion</th>
              <th className="text-right px-4 py-2">Rank</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.userId} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-4 py-2 font-medium">{r.name}<span className="ml-2 text-xs text-slate-500">{r.email}</span></td>
                <td className="px-4 py-2"><span className={clsx('chip', roleChip(r.role))}>{r.role}</span></td>
                <td className={clsx('px-4 py-2 text-right font-mono', r.overdueCount > 0 && 'text-red-400')}>{r.overdueCount}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">{r.openCount}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-400">{r.doneCount}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">
                  {r.avgCompletionHours == null ? '—' : `${r.avgCompletionHours.toFixed(1)}h`}
                </td>
                <td className="px-4 py-2 text-right font-mono">#{r.completionRankInOrg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'emerald' }) {
  const colors = {
    red:     'from-red-500/20  to-red-500/5  text-red-300',
    amber:   'from-amber-500/20 to-amber-500/5 text-amber-300',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  };
  return (
    <div className={clsx('card bg-gradient-to-br', colors[tone])}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function roleChip(role: string) {
  return role === 'ADMIN'
    ? 'bg-purple-500/20 text-purple-300'
    : role === 'MANAGER'
      ? 'bg-amber-500/20 text-amber-300'
      : 'bg-slate-700/50 text-slate-300';
}
