import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { listTickets } from '../api/tickets';
import { useAuth } from '../auth/auth-context';
import { buildTechnicianNotifications, type TicketNotification } from './ticket-notifications';

const POLL_INTERVAL_MS = 20_000;

interface TicketNotificationContextValue {
  notifications: TicketNotification[];
  unreadCount: number;
  loading: boolean;
  visible: boolean;
  open: () => void;
  close: () => void;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isRead: (notificationId: string) => boolean;
}

const TicketNotificationContext = createContext<TicketNotificationContextValue | null>(null);

export function TicketNotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof listTickets>>>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const technicianId = session?.user.userId ?? '';
  const storageKey = `ar-imms:ticket-notifications:read:${technicianId}`;

  const notifications = useMemo(
    () => buildTechnicianNotifications(tickets, technicianId),
    [technicianId, tickets],
  );

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setTickets(await listTickets(session.accessToken));
    } catch {
      // Notification sync is non-blocking; ticket screens surface API errors themselves.
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!technicianId) {
      setTickets([]);
      setReadIds(new Set());
      return;
    }

    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (active) setReadIds(new Set(stored ? (JSON.parse(stored) as string[]) : []));
      })
      .catch(() => {
        if (active) setReadIds(new Set());
      });
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refresh, storageKey, technicianId]);

  const persistRead = useCallback(async (next: Set<string>) => {
    setReadIds(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify([...next].slice(-200)));
  }, [storageKey]);

  const markRead = useCallback(async (notificationId: string) => {
    if (readIds.has(notificationId)) return;
    await persistRead(new Set([...readIds, notificationId]));
  }, [persistRead, readIds]);

  const markAllRead = useCallback(async () => {
    await persistRead(new Set([...readIds, ...notifications.map((item) => item.id)]));
  }, [notifications, persistRead, readIds]);

  const value = useMemo<TicketNotificationContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !readIds.has(item.id)).length,
    loading,
    visible,
    open: () => setVisible(true),
    close: () => setVisible(false),
    refresh,
    markRead,
    markAllRead,
    isRead: (notificationId) => readIds.has(notificationId),
  }), [loading, markAllRead, markRead, notifications, readIds, refresh, visible]);

  return <TicketNotificationContext.Provider value={value}>{children}</TicketNotificationContext.Provider>;
}

export function useTicketNotifications() {
  const context = useContext(TicketNotificationContext);
  if (!context) throw new Error('useTicketNotifications must be used inside TicketNotificationProvider.');
  return context;
}
