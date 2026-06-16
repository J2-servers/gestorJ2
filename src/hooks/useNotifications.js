import { useCallback, useEffect, useRef, useState } from 'react';
import { remoteClient } from '@/api/remoteClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const TOKEN_KEY = 'gestorj2.api_token';
const POLL_INTERVAL_MS = 30_000;
const SSE_RECONNECT_MS = 5_000;

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef(null);
  const pollRef = useRef(null);
  const reconnectRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await remoteClient.notifications.list();
      setNotifications(list ?? []);
      setUnreadCount((list ?? []).filter((n) => !n.isRead).length);
    } catch {
      // Fail silently — SSE may already be delivering updates
    }
  }, [userId]);

  const addNew = useCallback((notif) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 50);
    });
    if (!notif.isRead) setUnreadCount((c) => c + 1);
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await remoteClient.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await remoteClient.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  // SSE connection with polling fallback
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = () => {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => { if (alive) fetchAll(); }, POLL_INTERVAL_MS);
      }
    };

    const connect = () => {
      if (!alive) return;

      // Pass the Bearer token as query param — EventSource cannot set Authorization headers
      const token = localStorage.getItem(TOKEN_KEY) || '';
      const url = `${API_BASE}/notifications/stream${token ? `?auth=${encodeURIComponent(token)}` : ''}`;
      const es = new EventSource(url, { withCredentials: true });
      sseRef.current = es;

      es.onopen = () => {
        if (!alive) return;
        setSseConnected(true);
        stopPolling(); // SSE is live — no need to poll
      };

      es.onmessage = (e) => {
        if (!alive) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'heartbeat') return;
          // SSE só atualiza a UI in-app em tempo real (sino + lista).
          // A notificação no sistema operacional (incl. tela apagada) é
          // entregue pelo Web Push via service worker — nunca pelo
          // construtor Notification(), que é ilegal no Android.
          addNew(data);
        } catch { /* ignore malformed frames */ }
      };

      es.onerror = () => {
        if (!alive) return;
        es.close();
        setSseConnected(false);
        startPolling();
        reconnectRef.current = setTimeout(connect, SSE_RECONNECT_MS);
      };
    };

    fetchAll();
    connect();

    // Safety net: if SSE takes >4 s to connect, start polling in the meantime
    const safetyNet = setTimeout(() => {
      if (alive && !sseConnected) startPolling();
    }, 4000);

    return () => {
      alive = false;
      sseRef.current?.close();
      stopPolling();
      clearTimeout(reconnectRef.current);
      clearTimeout(safetyNet);
    };
  }, [userId]);

  return { notifications, unreadCount, sseConnected, markRead, markAllRead, refetch: fetchAll };
}

