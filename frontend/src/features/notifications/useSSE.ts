import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { api } from '../../app/api';
import toast from 'react-hot-toast';
import type { Notification } from '../../lib/types';

/**
 * Subscribes to the server's SSE stream on /notifications/stream.
 * On 'notification' events:
 *   - invalidates the Notifications cache so the bell badge updates
 *   - shows a toast
 *
 * Token is passed via query param because EventSource cannot set headers.
 */
export function useSSE() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(s => s.auth.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    // Vite dev server proxies /notifications/stream → :3000
    const es = new EventSource(
      `/notifications/stream?token=${encodeURIComponent(accessToken)}`,
    );

    es.addEventListener('notification', evt => {
      try {
        const notif = JSON.parse((evt as MessageEvent).data) as Notification;
        dispatch(api.util.invalidateTags(['Notifications', 'Tasks']));
        const payload = notif.payload as { taskTitle?: string; from?: string; to?: string };
        const title =
          notif.type === 'TASK_ASSIGNED'
            ? `Assigned: ${payload.taskTitle ?? 'a task'}`
            : notif.type === 'TASK_STATUS_CHANGED'
              ? `${payload.taskTitle ?? 'Task'} → ${payload.to}`
              : 'Task due soon';
        toast(title, { icon: '🔔' });
      } catch {
        // ignore malformed event
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; just log
      // eslint-disable-next-line no-console
      console.warn('SSE connection lost — auto-reconnecting');
    };

    return () => es.close();
  }, [accessToken, dispatch]);
}
