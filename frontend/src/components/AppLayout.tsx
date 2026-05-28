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
  icon: React.ReactNode;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { to: '/app/board',     label: 'Board',     icon: <IconBoard /> },
  { to: '/app/projects',  label: 'Projects',  icon: <IconFolder /> },
  { to: '/app/users',     label: 'Users',     icon: <IconUsers />, roles: ['ADMIN'] },
  { to: '/app/analytics', label: 'Analytics', icon: <IconChart />, roles: ['ADMIN', 'MANAGER'] },
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
    <div className="h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 grid place-items-center">
            <span className="text-brand-400 font-bold">T</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Task Tracker</div>
            <div className="text-xs text-slate-500 truncate">{user.orgId.slice(0, 8)}…</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {visible.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-brand-500/15 text-brand-300'
                    : 'text-slate-300 hover:bg-slate-800',
                )
              }
            >
              {n.icon}
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Signed in as <span className="text-slate-200">{user.name}</span>
            <span className={clsx('chip ml-2', roleChip(user.role))}>{user.role}</span>
          </div>
          <div className="flex items-center gap-2">
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
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function roleChip(role: Role) {
  return role === 'ADMIN'
    ? 'bg-purple-500/20 text-purple-300'
    : role === 'MANAGER'
      ? 'bg-amber-500/20 text-amber-300'
      : 'bg-slate-700/50 text-slate-300';
}

function IconBoard()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>; }
function IconFolder() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function IconUsers()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChart()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>; }
