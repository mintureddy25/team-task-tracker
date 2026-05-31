import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAppSelector } from '../app/hooks';
import { useLogoutMutation } from '../app/api';
import { useSSE } from '../features/notifications/useSSE';
import NotificationBell from './NotificationBell';
import type { Role } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  index: string;
  icon: React.ReactNode;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { to: '/app/board',     label: 'Board',     index: '01', icon: <IconBoard /> },
  { to: '/app/projects',  label: 'Projects',  index: '02', icon: <IconFolder /> },
  { to: '/app/users',     label: 'Users',     index: '03', icon: <IconUsers />, roles: ['ADMIN'] },
  { to: '/app/analytics', label: 'Analytics', index: '04', icon: <IconChart />, roles: ['ADMIN', 'MANAGER'] },
];

export default function AppLayout() {
  const user = useAppSelector(s => s.auth.user);
  const navigate = useNavigate();
  const [doLogout] = useLogoutMutation();

  // Subscribe to SSE while authenticated
  useSSE();

  if (!user) return null;

  const visible = NAV.filter(n => !n.roles || n.roles.includes(user.role));

  return (
    <div className="h-screen flex bg-paper text-ink">
      {/* Sidebar — ink rail */}
      <aside className="w-64 bg-ink text-paper flex flex-col shrink-0">
        <div className="px-6 pt-7 pb-6">
          <div className="eyebrow text-paper/40">Task&nbsp;Tracker</div>
          <div className="mt-1 font-display text-2xl leading-none tracking-tight text-paper">
            Ledger<span className="text-signal-ochre">.</span>
          </div>
          <div className="mt-3 font-mono text-[10px] text-paper/35 tracking-wider">
            ORG&nbsp;·&nbsp;{user.orgId.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <div className="mx-6 border-t border-paper/10" />

        <nav className="flex-1 px-3 py-5 space-y-1">
          {visible.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-card text-sm transition-all duration-150',
                  isActive
                    ? 'bg-paper text-ink font-medium shadow-card'
                    : 'text-paper/55 hover:text-paper hover:bg-paper/[0.07]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('shrink-0', isActive ? 'text-ink' : 'text-paper/45 group-hover:text-paper')}>
                    {n.icon}
                  </span>
                  <span className="flex-1">{n.label}</span>
                  <span className={clsx('font-mono text-[10px] tracking-widest',
                    isActive ? 'text-muted' : 'text-paper/25')}>
                    {n.index}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-paper/10">
          <div className="font-mono text-[10px] text-paper/30 tracking-wider leading-relaxed">
            v1.0 — REST · JWT · RBAC<br />REDIS · SSE
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header / masthead */}
        <header className="relative z-40 h-16 bg-paper/80 backdrop-blur-sm border-b border-line px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-sm text-muted">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Signed in</span>
            <span className="font-medium text-ink">{user.name}</span>
            <span className={clsx('chip', roleChip(user.role))}>{user.role}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              onClick={async () => {
                await doLogout();
                navigate('/login');
              }}
              className="btn-ghost text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function roleChip(role: Role) {
  return role === 'ADMIN'
    ? 'chip-ink'
    : role === 'MANAGER'
      ? 'chip-ochre'
      : 'chip-stone';
}

function IconBoard()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>; }
function IconFolder() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function IconUsers()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChart()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>; }
