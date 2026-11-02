import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  CircleDollarSign,
  Handshake,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import { formatDate } from '../../utils/format.js';

const REFRESH_INTERVAL = 5 * 60 * 1000;

const notificationTypes = {
  collaboration_deadline: {
    label: 'Collaboration',
    icon: Handshake,
    destination: '/collaborations',
  },
  deliverable_overdue: {
    label: 'Deliverable',
    icon: CalendarClock,
    destination: '/collaborations',
  },
  invoice_overdue: {
    label: 'Invoice',
    icon: CircleDollarSign,
    destination: '/finance',
  },
  content_upcoming: {
    label: 'Content',
    icon: CalendarDays,
    destination: '/planner',
  },
};

function storageKey(userId) {
  return `byteforge:notifications:read:${userId}`;
}

function loadReadIds(userId) {
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (!stored) return { ids: [], error: null };
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return { ids: [], error: 'Saved notification read status is invalid; notifications are shown as unread.' };
    }
    return { ids: parsed, error: null };
  } catch {
    return { ids: [], error: 'Saved notification read status could not be loaded; notifications are shown as unread.' };
  }
}

function getNotificationItems(alerts) {
  const today = new Date().toISOString().slice(0, 10);
  return alerts.filter(
    (alert) =>
      notificationTypes[alert.type] &&
      (alert.type !== 'content_upcoming' || alert.date === today),
  );
}

export function NotificationCenter({ userId }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [readState, setReadState] = useState(() => loadReadIds(userId));

  const query = useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      const response = await api.get('/api/alerts');
      if (!Array.isArray(response?.data)) {
        throw new Error('The alerts response was not in the expected format.');
      }
      return response.data;
    },
    enabled: Boolean(userId),
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const items = getNotificationItems(query.data || []);
  const readIds = new Set(readState.ids);
  const unreadCount = items.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0);

  useEffect(() => {
    if (!isOpen) return undefined;
    panelRef.current?.focus();
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function saveReadIds(nextIds) {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(nextIds));
      setReadState({ ids: nextIds, error: null });
    } catch {
      setReadState((current) => ({
        ...current,
        error: 'Read status could not be saved in this browser.',
      }));
    }
  }

  function markAsRead(notificationId) {
    if (readIds.has(notificationId)) return;
    saveReadIds([...readState.ids, notificationId]);
  }

  function markAllAsRead() {
    saveReadIds([...new Set([...readState.ids, ...items.map((item) => item.id)])]);
  }

  function openNotification(notification) {
    markAsRead(notification.id);
    setIsOpen(false);
    navigate(notificationTypes[notification.type].destination);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-slate-500 transition hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-controls="notification-center-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-accent px-1 text-[10px] font-bold leading-none text-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          id="notification-center-panel"
          ref={panelRef}
          tabIndex="-1"
          aria-label="Notification Center"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Notifications</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-accent transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={() => query.refetch()}
                disabled={query.isRefetching}
                aria-label="Refresh notifications"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-panel hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={15} className={query.isRefetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {readState.error ? (
            <p role="status" className="border-b border-line px-4 py-2 text-xs text-amber-600">
              {readState.error}
            </p>
          ) : null}

          {query.isPending ? (
            <div role="status" className="space-y-3 px-4 py-6">
              <p className="text-sm font-medium text-ink">Loading notifications…</p>
              <div className="h-14 animate-pulse rounded-xl bg-panel" />
              <div className="h-14 animate-pulse rounded-xl bg-panel" />
            </div>
          ) : query.isError ? (
            <div className="px-4 py-6 text-center">
              <p role="alert" className="text-sm text-[var(--danger)]">
                {query.error.message || 'Unable to load notifications.'}
              </p>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-accent transition hover:bg-panel"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-9 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-panel text-slate-500">
                <CheckCheck size={19} aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">No notifications right now</p>
              <p className="mt-1 text-xs text-slate-500">New reminders will appear here as your work gets closer.</p>
            </div>
          ) : (
            <ul className="max-h-[min(28rem,70vh)] divide-y divide-line overflow-y-auto">
              {items.map((notification) => {
                const presentation = notificationTypes[notification.type];
                const Icon = presentation.icon;
                const isRead = readIds.has(notification.id);
                return (
                  <li key={notification.id} className="flex items-start gap-2 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 text-left transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                            {notification.title}
                          </span>
                          {!isRead ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{notification.message}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-400">{presentation.label}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={notification.date}>{formatDate(notification.date)}</time>
                        </span>
                      </span>
                    </button>
                    {!isRead ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        aria-label={`Mark as read: ${notification.title}`}
                        title="Mark as read"
                        className="mt-1 shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-panel hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <Check size={15} aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-line px-4 py-2 text-[10px] text-slate-500">
            Read status is saved in this browser.
          </p>
        </section>
      ) : null}
    </div>
  );
}
