import type { ApptStatus, Plan } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');

export const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Real current date
export const TODAY = getTodayDateString();
export const TENANT_ID = 'b1';
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const PLAN_LIMIT: Record<Plan, number> = { Starter: 100, Growth: 300, Business: 700 };
export const PLAN_PRICE: Record<Plan, number> = { Starter: 1499, Growth: 3499, Business: 6999 };
export const ACTIVE_STATUSES: ApptStatus[] = ['scheduled', 'confirmed', 'rescheduled'];
export const WEEKLY = [[5, 3], [7, 5], [6, 4], [9, 6], [8, 7], [4, 2], [3, 1]] as const; // [calls, booked] Mon..Sun

export const dow = (date: string) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(date + 'T00:00:00').getDay()];
export const fmtTime = (t: string) => { const [h, m] = t.split(':').map(Number); return `${pad(h % 12 || 12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
export const nowLabel = () => { const d = new Date(); return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const statusClass = (s: string) => ({ cancelled: 'cancelled', missed: 'cancelled', failed: 'cancelled', completed: 'completed', rescheduled: 'rescheduled', in_progress: 'rescheduled' } as Record<string, string>)[s] ?? '';
export const canEditUser = (user?: { is_protected?: boolean }) => !user?.is_protected;
