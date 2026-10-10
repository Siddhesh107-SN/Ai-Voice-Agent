import {
  INITIAL_AGENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_BUSINESS,
  INITIAL_CALLS,
  INITIAL_CANCELLATIONS,
  INITIAL_CUSTOMERS,
  INITIAL_HISTORY,
  INITIAL_USERS,
  INITIAL_PLATFORM_BUSINESSES,
  INITIAL_AUDIT_LOGS,
  INITIAL_PLATFORM_REVENUE,
  INITIAL_PLATFORM_AGENTS,
  INITIAL_SYSTEM_HEALTH,
} from './db';
import {
  AIAgent,
  Appointment,
  AppointmentHistoryItem,
  BusinessProfile,
  Call,
  Cancellation,
  Customer,
  StaffUser,
  User,
  PlatformBusiness,
  PlatformAuditLog,
  PlatformRevenueData,
  PlatformAgent,
  SystemHealthData,
} from '@/lib/types';

const STORAGE_KEYS = {
  USERS: 'talkaor_users_v1',
  BUSINESS: 'talkaor_business_v1',
  AGENTS: 'talkaor_agents_v1',
  CUSTOMERS: 'talkaor_customers_v1',
  APPOINTMENTS: 'talkaor_appointments_v1',
  HISTORY: 'talkaor_history_v1',
  CANCELLATIONS: 'talkaor_cancellations_v1',
  CALLS: 'talkaor_calls_v1',
  CURRENT_USER: 'talkaor_current_user_v1',
  AUTH_TOKEN: 'talkaor_access_token_v1',
  REFRESH_TOKEN: 'talkaor_refresh_token_v1',
  PLATFORM_BUSINESSES: 'talkaor_platform_businesses_v1',
  AUDIT_LOGS: 'talkaor_audit_logs_v1',
  REVENUE: 'talkaor_revenue_v1',
  PLATFORM_AGENTS: 'talkaor_platform_agents_v1',
  SYSTEM_HEALTH: 'talkaor_system_health_v1',
  ADMIN_UNLOCKED: 'talkaor_admin_unlocked_v1',
};

const isMockEnv = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

// In-memory fallback for SSR
let memoryStore: Record<string, any> = {
  [STORAGE_KEYS.USERS]: INITIAL_USERS,
  [STORAGE_KEYS.BUSINESS]: INITIAL_BUSINESS,
  [STORAGE_KEYS.AGENTS]: INITIAL_AGENTS,
  [STORAGE_KEYS.CUSTOMERS]: INITIAL_CUSTOMERS,
  [STORAGE_KEYS.APPOINTMENTS]: INITIAL_APPOINTMENTS,
  [STORAGE_KEYS.HISTORY]: INITIAL_HISTORY,
  [STORAGE_KEYS.CANCELLATIONS]: INITIAL_CANCELLATIONS,
  [STORAGE_KEYS.CALLS]: INITIAL_CALLS,
  [STORAGE_KEYS.CURRENT_USER]: isMockEnv ? INITIAL_USERS[1] : null,
  [STORAGE_KEYS.AUTH_TOKEN]: isMockEnv ? 'mock-access-token-jwt-admin' : null,
  [STORAGE_KEYS.REFRESH_TOKEN]: isMockEnv ? 'mock-refresh-token-jwt-admin' : null,
  [STORAGE_KEYS.PLATFORM_BUSINESSES]: INITIAL_PLATFORM_BUSINESSES,
  [STORAGE_KEYS.AUDIT_LOGS]: INITIAL_AUDIT_LOGS,
  [STORAGE_KEYS.REVENUE]: INITIAL_PLATFORM_REVENUE,
  [STORAGE_KEYS.PLATFORM_AGENTS]: INITIAL_PLATFORM_AGENTS,
  [STORAGE_KEYS.SYSTEM_HEALTH]: INITIAL_SYSTEM_HEALTH,
  [STORAGE_KEYS.ADMIN_UNLOCKED]: false,
};

function getStore<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') {
    return (memoryStore[key] as T) ?? defaultVal;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) {
      window.localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error reading localStorage for ${key}`, err);
    return defaultVal;
  }
}

function setStore<T>(key: string, val: T): void {
  if (typeof window === 'undefined') {
    memoryStore[key] = val;
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
    memoryStore[key] = val;
  } catch (err) {
    console.warn(`Error setting localStorage for ${key}`, err);
  }
}

// Simulates network latency
export async function simulateLatency(ms: number = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const MockStorage = {
  getUsers: (): StaffUser[] => getStore(STORAGE_KEYS.USERS, INITIAL_USERS),
  setUsers: (users: StaffUser[]) => setStore(STORAGE_KEYS.USERS, users),

  getBusiness: (): BusinessProfile => getStore(STORAGE_KEYS.BUSINESS, INITIAL_BUSINESS),
  setBusiness: (biz: BusinessProfile) => setStore(STORAGE_KEYS.BUSINESS, biz),

  getAgents: (): AIAgent[] => getStore(STORAGE_KEYS.AGENTS, INITIAL_AGENTS),
  setAgents: (agents: AIAgent[]) => setStore(STORAGE_KEYS.AGENTS, agents),

  getCustomers: (): Customer[] => getStore(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  setCustomers: (custs: Customer[]) => setStore(STORAGE_KEYS.CUSTOMERS, custs),

  getAppointments: (): Appointment[] => getStore(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS),
  setAppointments: (apts: Appointment[]) => setStore(STORAGE_KEYS.APPOINTMENTS, apts),

  getHistory: (): Record<string, AppointmentHistoryItem[]> => getStore(STORAGE_KEYS.HISTORY, INITIAL_HISTORY),
  setHistory: (hist: Record<string, AppointmentHistoryItem[]>) => setStore(STORAGE_KEYS.HISTORY, hist),

  getCancellations: (): Cancellation[] => getStore(STORAGE_KEYS.CANCELLATIONS, INITIAL_CANCELLATIONS),
  setCancellations: (canc: Cancellation[]) => setStore(STORAGE_KEYS.CANCELLATIONS, canc),

  getCalls: (): Call[] => getStore(STORAGE_KEYS.CALLS, INITIAL_CALLS),
  setCalls: (calls: Call[]) => setStore(STORAGE_KEYS.CALLS, calls),

  getCurrentUser: (): User | null => getStore(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]),
  setCurrentUser: (u: User | null) => setStore(STORAGE_KEYS.CURRENT_USER, u),

  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return memoryStore[STORAGE_KEYS.AUTH_TOKEN] || null;
    return window.localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  setAccessToken: (token: string | null) => {
    if (typeof window === 'undefined') {
      memoryStore[STORAGE_KEYS.AUTH_TOKEN] = token;
      return;
    }
    if (token) window.localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    else window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return memoryStore[STORAGE_KEYS.REFRESH_TOKEN] || null;
    return window.localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  setRefreshToken: (token: string | null) => {
    if (typeof window === 'undefined') {
      memoryStore[STORAGE_KEYS.REFRESH_TOKEN] = token;
      return;
    }
    if (token) window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    else window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  getPlatformBusinesses: (): PlatformBusiness[] =>
    getStore(STORAGE_KEYS.PLATFORM_BUSINESSES, INITIAL_PLATFORM_BUSINESSES),
  setPlatformBusinesses: (biz: PlatformBusiness[]) =>
    setStore(STORAGE_KEYS.PLATFORM_BUSINESSES, biz),

  getAuditLogs: (): PlatformAuditLog[] =>
    getStore(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
  setAuditLogs: (logs: PlatformAuditLog[]) =>
    setStore(STORAGE_KEYS.AUDIT_LOGS, logs),
  addAuditLog: (log: PlatformAuditLog) => {
    const logs = MockStorage.getAuditLogs();
    MockStorage.setAuditLogs([log, ...logs]);
  },

  getRevenueData: (): PlatformRevenueData =>
    getStore(STORAGE_KEYS.REVENUE, INITIAL_PLATFORM_REVENUE),
  setRevenueData: (rev: PlatformRevenueData) =>
    setStore(STORAGE_KEYS.REVENUE, rev),

  getPlatformAgents: (): PlatformAgent[] =>
    getStore(STORAGE_KEYS.PLATFORM_AGENTS, INITIAL_PLATFORM_AGENTS),
  setPlatformAgents: (agents: PlatformAgent[]) =>
    setStore(STORAGE_KEYS.PLATFORM_AGENTS, agents),

  getSystemHealth: (): SystemHealthData =>
    getStore(STORAGE_KEYS.SYSTEM_HEALTH, INITIAL_SYSTEM_HEALTH),
  setSystemHealth: (health: SystemHealthData) =>
    setStore(STORAGE_KEYS.SYSTEM_HEALTH, health),

  getAdminUnlocked: (): boolean =>
    getStore(STORAGE_KEYS.ADMIN_UNLOCKED, false),
  setAdminUnlocked: (unlocked: boolean) =>
    setStore(STORAGE_KEYS.ADMIN_UNLOCKED, unlocked),

  resetDefaults: () => {
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
    }
    memoryStore = {
      [STORAGE_KEYS.USERS]: INITIAL_USERS,
      [STORAGE_KEYS.BUSINESS]: INITIAL_BUSINESS,
      [STORAGE_KEYS.AGENTS]: INITIAL_AGENTS,
      [STORAGE_KEYS.CUSTOMERS]: INITIAL_CUSTOMERS,
      [STORAGE_KEYS.APPOINTMENTS]: INITIAL_APPOINTMENTS,
      [STORAGE_KEYS.HISTORY]: INITIAL_HISTORY,
      [STORAGE_KEYS.CANCELLATIONS]: INITIAL_CANCELLATIONS,
      [STORAGE_KEYS.CALLS]: INITIAL_CALLS,
      [STORAGE_KEYS.CURRENT_USER]: INITIAL_USERS[0],
      [STORAGE_KEYS.AUTH_TOKEN]: 'mock-access-token-jwt-admin',
      [STORAGE_KEYS.REFRESH_TOKEN]: 'mock-refresh-token-jwt-admin',
    };
  }
};
