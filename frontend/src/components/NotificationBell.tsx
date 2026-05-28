import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../app/api';
import type { Notification } from '../lib/types';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useListNotificationsQuery({ limit: 10 }, { pollingInterval: 60_000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost relative"
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] grid place-items-center
                           rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] card shadow-2xl z-30 p-0">
          <div className="flex items-center justify-between p-3 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={() => markAll()} className="text-xs text-brand-400 hover:text-brand-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                You're all caught up
              </div>
            )}
            {items.map(n => (
              <NotificationRow key={n.id} notif={n} onClick={() => !n.readAt && markRead(n.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notif, onClick }: { notif: Notification; onClick: () => void }) {
  const p = notif.payload as { taskTitle?: string; from?: string; to?: string };
  const text =
    notif.type === 'TASK_ASSIGNED'
      ? <>Assigned to you: <strong>{p.taskTitle}</strong></>
      : notif.type === 'TASK_STATUS_CHANGED'
        ? <><strong>{p.taskTitle}</strong> moved {p.from} → {p.to}</>
        : <><strong>{p.taskTitle}</strong> due soon</>;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors
                 ${notif.readAt ? 'opacity-60' : 'bg-slate-900/50'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                          ${notif.readAt ? 'bg-slate-600' : 'bg-brand-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200">{text}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
