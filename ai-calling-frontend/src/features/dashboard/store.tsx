'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { LogLevel, MockData, Role } from './types';
import { nowLabel, TODAY } from './util';
import { fetchAppointments, fetchInitialDashboardData, verifyStaffPin, changeStaffPin } from './api';
import { logoutUser } from '@/lib/http';
import { AUTH_CHANNEL, AUTH_LOGOUT_KEY } from '@/lib/auth-channel';

export type Theme = 'dark' | 'light';
export type ToastKind = 'info' | 'error';

type Toast = { id: number; text: string; kind: ToastKind };
type ToastTimer = {
  timer: ReturnType<typeof setTimeout> | null;
  expiresAt: number;
  remaining: number;
};

function emptyDashboardData(): MockData {
  return {
    appts: [],
    history: {},
    agents: [],
    calls: [],
    staff: [],
    services: [],
    hours: [],
    businesses: [],
    requests: [],
    messages: [],
    logs: [],
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessName?: string;
}

export interface State extends MockData {
  theme: Theme;
  role: Role;
  elevated: boolean;
  pin: string;
  pinChangedAt: string;
  tries: number;
  lockUntil: number;
  day: string;
  user?: UserProfile;
}

const mockRoleSwitchingEnabled =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_API_MODE === 'mock';

interface Ctx {
  s: State;
  set: (fn: (p: State) => State) => void;
  simulate: boolean;
  dashboardError: boolean;
  dashboardLoaded: boolean;
  can: boolean;
  isSA: boolean;
  actor: string;
  toast: (t: string, kind?: ToastKind) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  pauseToast: (id: number) => void;
  resumeToast: (id: number) => void;
  log: (t: string, l?: LogLevel) => void;
  modal: ReactNode;
  openModal: (n: ReactNode) => void;
  closeModal: () => void;
  setRole: (r: Role) => void;
  setTheme: (t: Theme) => void;
  tryPin: (p: string) => Promise<{ ok: boolean; msg?: string }>;
  changePin: (cur: string, next: string, confirm: string) => Promise<string | null>;
  reload: () => Promise<void>;
  logout: (reason?: 'manual' | 'expired', broadcast?: boolean) => Promise<void>;
}

const C = createContext<Ctx | null>(null);
export const useDash = () => {
  const c = useContext(C);
  if (!c) throw new Error('useDash must be used inside DashboardProvider');
  return c;
};

export function DashboardProvider({
  children,
  initialRole = 'admin',
  simulate = false,
  initialUser,
}: {
  children: ReactNode;
  initialRole?: Role;
  simulate?: boolean;
  initialUser?: UserProfile;
}) {
  const router = useRouter();
  const [s, setS] = useState<State>(() => ({
    ...emptyDashboardData(),
    theme: 'dark',
    role: initialRole,
    elevated: false,
    pin: '••••',
    pinChangedAt: '12 Oct 2026',
    tries: 0,
    lockUntil: 0,
    day: TODAY,
    user: initialUser || {
      id: initialRole === 'super_admin' ? 'u_superadmin' : initialRole === 'staff' ? 'u_staff' : 'u_admin',
      name: initialRole === 'super_admin' ? 'Platform Owner' : initialRole === 'staff' ? 'Staff' : 'Admin',
      email: '',
      role: initialRole,
      businessName: 'Your Business',
    },
  }));

  const [modal, setModal] = useState<ReactNode>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef(new Map<number, ToastTimer>());
  const [dashboardError, setDashboardError] = useState(false);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const logoutStartedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const closeModal = useCallback(() => setModal(null), []);

  // Sync initial data from backend API
  const reload = useCallback(async () => {
    if (logoutStartedRef.current) return;
    setDashboardError(false);
    try {
      const data = await fetchInitialDashboardData();
      if (logoutStartedRef.current) return;
      setS((prev) => ({
        ...prev,
        ...data,
      }));
      setDashboardLoaded(true);
    } catch {
      if (!logoutStartedRef.current) setDashboardError(true);
    }
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem('tk-theme');
      if (t === 'light' || t === 'dark') setS((p) => ({ ...p, theme: t }));
    } catch {
      /* storage blocked */
    }
  }, []);

  const set = useCallback((fn: (p: State) => State) => setS((prev) => {
    const next = fn(prev);
    if (mockRoleSwitchingEnabled || next.role === prev.role) return next;
    return {
      ...next,
      role: prev.role,
      user: next.user ? { ...next.user, role: prev.role } : next.user,
    };
  }), []);
  const dismissToast = useCallback((id: number) => {
    const entry = toastTimers.current.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    const duration = kind === 'error' ? 8000 : 2500;
    const timer = setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    }, duration);
    toastTimers.current.set(id, {
      timer,
      expiresAt: Date.now() + duration,
      remaining: duration,
    });
    setToasts((current) => [...current, { id, text, kind }]);
  }, []);

  const pauseToast = useCallback((id: number) => {
    const entry = toastTimers.current.get(id);
    if (!entry?.timer) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    entry.remaining = Math.max(0, entry.expiresAt - Date.now());
  }, []);

  const resumeToast = useCallback((id: number) => {
    const entry = toastTimers.current.get(id);
    if (!entry || entry.timer) return;
    entry.expiresAt = Date.now() + entry.remaining;
    entry.timer = setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    }, entry.remaining);
  }, []);

  const log = useCallback(
    (text: string, level: LogLevel = 'info') =>
      setS((p) => ({ ...p, logs: [{ at: nowLabel(), text, level }, ...p.logs] })),
    []
  );

  const logout = useCallback(async (reason: 'manual' | 'expired' = 'manual', broadcast = true) => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;

    setModal(null);
    setS((prev) => ({
      ...prev,
      ...emptyDashboardData(),
      elevated: false,
      user: undefined,
      logs: [{ at: nowLabel(), text: 'signed out', level: 'info' }],
    }));

    await logoutUser(broadcast);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channelRef.current = new BroadcastChannel(AUTH_CHANNEL);
        channelRef.current.onmessage = (event: MessageEvent<{ type?: string; reason?: 'manual' | 'expired' }>) => {
          if (event.data?.type === 'logout') void logout('manual', false);
        };
      } catch {
        channelRef.current = null;
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_LOGOUT_KEY || !event.newValue) return;
      try {
        const message: unknown = JSON.parse(event.newValue);
        if (
          typeof message === 'object' &&
          message !== null &&
          'type' in message &&
          message.type === 'logout'
        ) {
          void logout('manual', false);
        }
      } catch {
        // Ignore malformed cross-tab logout messages.
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      channelRef.current?.close();
      channelRef.current = null;
      toastTimers.current.forEach(({ timer }) => {
        if (timer) clearTimeout(timer);
      });
      toastTimers.current.clear();
    };
  }, [logout]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (simulate || s.role === 'super_admin') return;

    const refreshAppointments = async () => {
      if (document.hidden || logoutStartedRef.current) return;
      try {
        const appts = await fetchAppointments();
        if (logoutStartedRef.current) return;
        setS((prev) => ({ ...prev, appts }));
      } catch {
        if (!logoutStartedRef.current) setDashboardError(true);
      }
    };

    const handleVisibilityChange = () => {
      void refreshAppointments();
    };

    const interval = window.setInterval(() => {
      void refreshAppointments();
    }, 8000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [simulate, s.role]);

  const setTheme = useCallback((theme: Theme) => {
    try {
      localStorage.setItem('tk-theme', theme);
    } catch {
      /* storage blocked */
    }
    setS((p) => ({ ...p, theme }));
  }, []);

  const setRole = useCallback((role: Role) => {
    if (!mockRoleSwitchingEnabled) return;
    document.cookie = `tk_role=${role}; path=/; max-age=86400`;
    setS((p) => ({ ...p, role, elevated: false }));
  }, []);

  const can = s.role === 'admin' || (s.role === 'staff' && s.elevated);
  const actor =
    s.role === 'admin'
      ? s.user?.name || 'Admin'
      : s.role === 'staff'
      ? `${s.user?.name || 'Staff'}${s.elevated ? ' (admin session)' : ''}`
      : 'Super Admin';

  // Server-side verified PIN check (stores hash, rate limits, locks for 15 mins after 5 wrong tries)
  const tryPin = async (p: string) => {
    const res = await verifyStaffPin(p, 'b1');
    if (res.ok) {
      setS((x) => ({ ...x, elevated: true, tries: 0 }));
      return { ok: true };
    }
    return { ok: false, msg: res.msg };
  };

  const changePin = async (cur: string, next: string, confirm: string) => {
    if (!/^\d{4}$/.test(next)) return 'New PIN must be 4 digits';
    if (next !== confirm) return 'The two new PINs do not match';
    const err = await changeStaffPin(cur, next, confirm, 'b1');
    if (err) return err;
    setS((p) => ({ ...p, pinChangedAt: nowLabel() }));
    reload();
    return null;
  };

  return (
    <C.Provider
      value={{
        s,
        set,
        simulate,
        dashboardError,
        dashboardLoaded,
        can,
        isSA: s.role === 'super_admin',
        actor,
        toast,
        toasts,
        dismissToast,
        pauseToast,
        resumeToast,
        log,
        modal,
        openModal: setModal,
        closeModal,
        setRole,
        setTheme,
        tryPin,
        changePin,
        reload,
        logout,
      }}
    >
      {children}
    </C.Provider>
  );
}
