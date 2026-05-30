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
 * Why fetch-streaming instead of the native EventSource API:
 *   EventSource cannot send custom headers, which would force the JWT into the
 *   URL (?token=...) where it leaks into server/proxy logs and browser history.
 *   We stream over fetch + ReadableStream instead, so the access token rides in
 *   an `Authorization: Bearer` header — the same idiom the OpenAI/Anthropic
 *   streaming clients use. fetch doesn't auto-reconnect, so we reconnect here.
 */
export function useSSE() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(s => s.auth.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    let closed = false;

    const handleNotification = (raw: string) => {
      try {
        const notif = JSON.parse(raw) as Notification;
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
    };

    // Parse a raw SSE frame ("event: x\ndata: y") and dispatch on `notification`.
    const dispatchFrame = (frame: string) => {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (event === 'notification' && dataLines.length) {
        handleNotification(dataLines.join('\n'));
      }
    };

    const connect = async () => {
      try {
        // Vite dev server proxies /notifications/stream → :3000
        const res = await fetch('/notifications/stream', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`SSE failed: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line (\n\n).
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            if (frame.trim()) dispatchFrame(frame);
          }
        }
      } catch (err) {
        if (closed) return; // aborted on cleanup — expected
        console.warn('SSE connection lost — reconnecting in 3s', err);
        setTimeout(() => {
          if (!closed) void connect();
        }, 3000);
      }
    };

    void connect();

    return () => {
      closed = true;
      controller.abort();
    };
  }, [accessToken, dispatch]);
}
