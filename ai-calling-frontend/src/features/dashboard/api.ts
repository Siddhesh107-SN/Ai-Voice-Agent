import type {
  Appointment,
  AppointmentHistoryItem,
  Call,
  Agent,
  Business,
  AccessRequest,
  ContactMessage,
  LogEntry,
  MockData,
  Plan,
  AdminAppointment,
  AdminHealthDetails,
  AdminMonitoringRow,
  AdminPage,
  AdminToolCall,
  AdminWebhookEvent,
  AdminWebhookEventDetail,
} from './types';
import { http, setElevationToken, getUserRole } from '@/lib/http';

export function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_API_MODE === 'mock') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock mode is strictly forbidden in production.');
    }
    return true;
  }
  return false;
}

async function loadMockData(): Promise<MockData> {
  if (!isMockMode()) {
    throw new Error('Mock data cannot be loaded outside mock mode.');
  }
  return (await import('./mock')).MOCK;
}

// ---------------- ADAPTERS ----------------

function adaptPlan(planStr?: string): Plan {
  const p = (planStr || 'Growth').toLowerCase();
  if (p === 'starter') return 'Starter';
  if (p === 'business') return 'Business';
  return 'Growth';
}

function adaptAppointment(b: any): Appointment {
  const d = b.appointment_date || b.date || '';
  let dayOfWeek = b.day_of_week;
  if (!dayOfWeek && d) {
    try {
      dayOfWeek = new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      dayOfWeek = 'Monday';
    }
  }

  return {
    id: String(b.id),
    customer_id: String(b.customer_id || (b.customer && b.customer.id) || ''),
    customer_name: b.customer?.name || b.customer_name || 'Customer',
    customer_phone: b.customer?.phone || b.customer_phone || '',
    customer_email: b.customer?.email || b.customer_email || undefined,
    date: d,
    time: b.appointment_time || b.time || '10:00:00',
    day_of_week: dayOfWeek || 'Monday',
    service: b.service || 'Consultation',
    status: b.status || 'scheduled',
    staff_name: b.staff_name || undefined,
    agent_name: b.agent_name || undefined,
    notes: b.notes || undefined,
    image: b.image || undefined,
    cancel_reason: b.cancel_reason || undefined,
    cancelled_by: b.cancelled_by || undefined,
    created_at: String(b.created_at || new Date().toISOString()),
    updated_at: String(b.updated_at || new Date().toISOString()),
  };
}

function adaptCall(b: any): Call {
  const transcript = Array.isArray(b.transcript)
    ? b.transcript
    : typeof b.transcript === 'string' && b.transcript.trim()
      ? [{ speaker: 'Transcript', text: b.transcript, time: '' }]
      : undefined;

  return {
    id: String(b.id),
    customer_name: b.customer?.name || b.customer_name || 'Customer',
    customer_phone: b.customer?.phone || b.phone_number || b.customer_phone || '',
    agent_name: b.agent?.name || b.agent_name || 'Talkaor AI',
    duration_seconds: b.duration != null ? b.duration : (b.duration_seconds || 0),
    status: b.status === 'in-progress' ? 'in_progress' : (b.status || 'completed'),
    outcome: b.outcome || undefined,
    summary: b.summary || undefined,
    has_recording: Boolean(b.has_recording),
    recording_url: b.recording_url || undefined,
    transcript,
  };
}

function adaptAgent(b: any): Agent {
  const online = b.online !== undefined
    ? Boolean(b.online)
    : (b.is_active !== undefined ? Boolean(b.is_active) : b.status === 'active');

  return {
    id: String(b.id),
    name: b.name || 'Assistant',
    languages: Array.isArray(b.languages) ? b.languages.join(', ') : (b.languages || 'English'),
    phone: b.phone_number || b.phone || '',
    online,
    calls_today: b.calls_today || 0,
    business_id: String(b.client_id || b.business_id || ''),
  };
}

function adaptBusiness(b: any): Business {
  let renewsOn = '';
  if (b.renews_on) {
    try {
      renewsOn = new Date(b.renews_on).toISOString().split('T')[0];
    } catch {
      renewsOn = String(b.renews_on);
    }
  }

  let lastLogin = 'Never';
  if (b.last_login) {
    try {
      lastLogin = new Date(b.last_login).toLocaleString();
    } catch {
      lastLogin = String(b.last_login);
    }
  }

  return {
    id: String(b.id),
    name: b.name || 'Business',
    plan: adaptPlan(b.plan),
    minutes_used: b.minutes_used || 0,
    minutes_limit: b.minutes_limit || 0,
    status: b.status === 'Suspended' ? 'Suspended' : 'Active',
    renews_on: renewsOn,
    last_login: lastLogin,
    staff_pin: b.has_pin ? '••••' : '',
  };
}

function adaptAccessRequest(b: any): AccessRequest {
  return {
    id: String(b.id),
    business: b.business || 'Client',
    plan: adaptPlan(b.plan),
    billing: (b.billing || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly',
    amount: b.amount || 0,
    status: b.status || 'Payment submitted',
  };
}

function adaptHistoryItem(b: any): AppointmentHistoryItem {
  return {
    id: String(b.id),
    appointment_id: String(b.appointment_id),
    event: b.action || b.event || 'updated',
    old_value: b.old_value || (b.old_status ? b.old_status : undefined),
    new_value: b.new_value || (b.new_status ? b.new_status : undefined),
    actor: b.actor_user_id ? String(b.actor_user_id) : (b.actor || b.source || 'system'),
    actor_type: b.source === 'ai_agent' ? 'ai_agent' : 'staff',
    timestamp: String(b.created_at || b.timestamp || new Date().toISOString()),
  };
}

// ---------------- DASHBOARD DATA FETCH ----------------

export async function fetchInitialDashboardData(): Promise<MockData> {
  if (isMockMode()) {
    return structuredClone(await loadMockData());
  }

  const role = getUserRole();
  const isSuperAdmin = role === 'super_admin';

  // Base endpoints for active client member / admin
  const apptsPromise = http<any[]>('/api/v1/appointments?limit=100&order=desc');
  const agentsPromise = isSuperAdmin
    ? http<any[]>('/api/v1/admin/agents')
    : http<any[]>('/api/v1/agents');
  const callsPromise = http<any[]>('/api/v1/calls');
  const bizPromise = http<any>('/api/v1/business').catch(() => null);

  // Super admin exclusive endpoints
  const businessesPromise = isSuperAdmin
    ? http<any[]>('/api/v1/admin/businesses')
    : Promise.resolve([]);
  const requestsPromise = isSuperAdmin
    ? http<any[]>('/api/v1/admin/access-requests')
    : Promise.resolve([]);
  const messagesPromise = isSuperAdmin
    ? http<any[]>('/api/v1/admin/messages')
    : Promise.resolve([]);
  const logsPromise = isSuperAdmin
    ? http<any[]>('/api/v1/admin/logs')
    : Promise.resolve([]);

  const [rawAppts, rawAgents, rawCalls, rawBiz, rawBusinesses, rawRequests, rawMessages, rawLogs] =
    await Promise.all([
      apptsPromise,
      agentsPromise,
      callsPromise,
      bizPromise,
      businessesPromise,
      requestsPromise,
      messagesPromise,
      logsPromise,
    ]);

  const appts: Appointment[] = (rawAppts || []).map(adaptAppointment);
  const agents: Agent[] = (rawAgents || []).map(adaptAgent);
  const calls: Call[] = (rawCalls || []).map(adaptCall);
  const businesses: Business[] = (rawBusinesses || []).map(adaptBusiness);
  const requests: AccessRequest[] = (rawRequests || []).map(adaptAccessRequest);

  const hours = rawBiz?.hours || [];
  const services = rawBiz?.services || [];
  const staff = (rawBiz?.staff || []).map((s: any) => ({
    id: String(s.id || s.name),
    name: s.name,
    title: s.title || '',
    days: s.days || [true, true, true, true, true, false, false],
  }));

  const messages: ContactMessage[] = (rawMessages || []).map((m: any) => ({
    id: String(m.id),
    name: m.name || '',
    email: m.email || '',
    phone: m.phone || '',
    message: m.message || '',
    received_at: String(m.received_at || ''),
    read: Boolean(m.read),
    handled: Boolean(m.handled),
  }));

  const logs: LogEntry[] = (rawLogs || []).map((l: any) => ({
    at: String(l.at || ''),
    text: l.text || '',
    level: (l.level || 'info').toLowerCase() as any,
  }));

  return {
    appts,
    history: {},
    agents,
    calls,
    staff,
    services,
    hours,
    businesses,
    requests,
    messages,
    logs,
  };
}

export async function fetchAppointments(): Promise<Appointment[]> {
  if (isMockMode()) {
    const mock = await loadMockData();
    return structuredClone(mock.appts);
  }

  const rawAppts = await http<any[]>('/api/v1/appointments?limit=100&order=desc');
  return (rawAppts || []).map(adaptAppointment);
}

// ---------------- APPOINTMENTS ----------------

export async function createAppointment(payload: Partial<Appointment> & { actor?: string }): Promise<Appointment> {
  if (isMockMode()) {
    const newAppt: Appointment = {
      id: `a${Date.now()}`,
      customer_id: payload.customer_id || 'c1',
      customer_name: payload.customer_name || 'Customer',
      customer_phone: payload.customer_phone || '',
      customer_email: payload.customer_email,
      date: payload.date || new Date().toISOString().split('T')[0],
      time: payload.time || '10:00:00',
      day_of_week: payload.day_of_week || 'Monday',
      service: payload.service || 'Consultation',
      status: payload.status || 'scheduled',
      notes: payload.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return newAppt;
  }

  const customerId = Number(payload.customer_id);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error('Select a valid customer before booking the appointment.');
  }

  const body = {
    customer_id: customerId,
    appointment_date: payload.date,
    appointment_time: payload.time ? payload.time.slice(0, 5) : '10:00',
    status: payload.status || 'scheduled',
    notes: payload.notes || undefined,
  };

  const res = await http<any>('/api/v1/appointments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return adaptAppointment(res);
}

export async function updateAppointment(id: string, payload: Partial<Appointment> & { actor?: string }): Promise<Appointment> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const existing = MOCK.appts.find((a) => a.id === id);
    return { ...(existing || MOCK.appts[0]), ...payload } as Appointment;
  }

  const body: Record<string, any> = {};
  if (payload.customer_id) body.customer_id = Number(payload.customer_id);
  if (payload.status) body.status = payload.status;
  if (payload.notes !== undefined) body.notes = payload.notes;

  const res = await http<any>(`/api/v1/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return adaptAppointment(res);
}

export async function rescheduleAppointment(
  id: string,
  payload: { date: string; time: string; reason?: string; actor?: string }
): Promise<Appointment> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const existing = MOCK.appts.find((a) => a.id === id);
    return { ...(existing || MOCK.appts[0]), date: payload.date, time: payload.time } as Appointment;
  }

  const body = {
    new_date: payload.date,
    new_time: payload.time ? payload.time.slice(0, 5) : '10:00',
    reason: payload.reason || undefined,
  };

  const res = await http<any>(`/api/v1/appointments/${id}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return adaptAppointment(res);
}

export async function cancelAppointment(
  id: string,
  payload: { reason?: string; source?: 'ai_agent' | 'staff'; actor?: string }
): Promise<Appointment> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const existing = MOCK.appts.find((a) => a.id === id);
    return { ...(existing || MOCK.appts[0]), status: 'cancelled', cancel_reason: payload.reason } as Appointment;
  }

  const body = {
    reason: payload.reason || undefined,
  };

  const res = await http<any>(`/api/v1/appointments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return adaptAppointment(res);
}

export async function fetchAppointmentHistory(id: string): Promise<AppointmentHistoryItem[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.history[id] || [];
  }

  const res = await http<any[]>(`/api/v1/appointments/${id}/history`);
  return (res || []).map(adaptHistoryItem);
}

// ---------------- CALLS & AGENTS ----------------

export async function fetchCalls(): Promise<Call[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.calls;
  }
  const res = await http<any[]>('/api/v1/calls');
  return (res || []).map(adaptCall);
}

export async function fetchCallDetails(id: string): Promise<Call> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const call = MOCK.calls.find((item) => item.id === id);
    if (!call) throw new Error('Call details not found.');
    return call;
  }

  const res = await http<any>(`/api/v1/calls/${encodeURIComponent(id)}`);
  return adaptCall(res);
}

export async function fetchAgents(): Promise<Agent[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.agents;
  }
  const role = getUserRole();
  const endpoint = role === 'super_admin' ? '/api/v1/admin/agents' : '/api/v1/agents';
  const res = await http<any[]>(endpoint);
  return (res || []).map(adaptAgent);
}

export async function toggleAgentPower(id: string, online?: boolean, actor?: string): Promise<Agent> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const agent = MOCK.agents.find((a) => a.id === id) || MOCK.agents[0];
    return { ...agent, online: online ?? !agent.online };
  }

  const role = getUserRole();
  const isSuperAdmin = role === 'super_admin';

  if (isSuperAdmin) {
    const res = await http<any>(`/api/v1/admin/agents/${id}/power`, {
      method: 'PATCH',
      body: JSON.stringify({ online: Boolean(online) }),
    });
    return adaptAgent(res);
  }

  const status = online ? 'active' : 'inactive';
  const res = await http<any>(`/api/v1/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return adaptAgent(res);
}

// ---------------- BUSINESS SETTINGS ----------------

export async function updateBusinessSettings(payload: {
  hours?: any[];
  services?: string[];
  staff?: any[];
}): Promise<any> {
  if (isMockMode()) {
    return { success: true };
  }

  const body: Record<string, any> = {};
  if (payload.hours) {
    body.hours = payload.hours.map((h) => ({
      open: h.open ? h.open.slice(0, 5) : '09:00',
      close: h.close ? h.close.slice(0, 5) : '18:00',
      closed: Boolean(h.closed),
    }));
  }
  if (payload.services) {
    body.services = payload.services;
  }
  if (payload.staff) {
    body.staff = payload.staff.map((s) => ({
      name: s.name,
      title: s.title || null,
      days: s.days || [true, true, true, true, true, false, false],
    }));
  }

  return http('/api/v1/business', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ---------------- SUPER ADMIN ----------------

export async function fetchAdminBusinesses(): Promise<Business[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.businesses;
  }
  const res = await http<any[]>('/api/v1/admin/businesses');
  return (res || []).map(adaptBusiness);
}

export async function updateBusinessStatus(id: string, status: 'Active' | 'Suspended', actor?: string): Promise<any> {
  if (isMockMode()) {
    return { success: true };
  }
  return http(`/api/v1/admin/businesses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, actor }),
  });
}

export async function addMinutePack(
  id: string,
  minutes: number = 100,
  actor?: string
): Promise<{ success: boolean; minutes_added: number; client_id: string | number }> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const biz = MOCK.businesses.find((b) => b.id === id) || MOCK.businesses[0];
    biz.minutes_limit += minutes;
    return { success: true, minutes_added: minutes, client_id: id };
  }
  return http<{ success: boolean; minutes_added: number; client_id: string | number }>(`/api/v1/admin/businesses/${id}/minute-pack`, {
    method: 'POST',
    body: JSON.stringify({ minutes, actor }),
  });
}

export async function viewBusinessPin(id: string, actor?: string): Promise<{ pin: string; changedAt: string }> {
  if (isMockMode()) {
    await loadMockData();
    return { pin: '4321', changedAt: new Date().toISOString() };
  }
  return http<{ pin: string; changedAt: string }>(`/api/v1/admin/businesses/${id}/pin-view`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function resetBusinessPin(id: string, actor?: string, pin?: string): Promise<{ pin: string }> {
  if (isMockMode()) {
    await loadMockData();
    return { pin: pin ?? '' };
  }
  return http<{ pin: string }>(`/api/v1/admin/businesses/${id}/pin-reset`, {
    method: 'POST',
    body: JSON.stringify({ actor, pin }),
  });
}

export async function fetchAccessRequests(): Promise<AccessRequest[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.requests;
  }
  const res = await http<any[]>('/api/v1/admin/access-requests');
  return (res || []).map(adaptAccessRequest);
}

export async function approveAccess(
  id: string,
  actor?: string
): Promise<{ id: string; business: string; status: string; reason?: string }> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const request = MOCK.requests.find((item) => item.id === id);
    if (request) request.status = 'Active';
    const business = request?.business || 'Business';
    const biz = MOCK.businesses.find((item) => item.name === business);
    if (biz) biz.status = 'Active';
    return { id, business, status: 'active', reason: 'Access approved' };
  }
  return http<{ id: string; business: string; status: string; reason?: string }>(`/api/v1/admin/access/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function declineAccess(id: string, reason = 'Payment declined', actor?: string): Promise<void> {
  if (isMockMode()) {
    return;
  }
  await http(`/api/v1/admin/access/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason, actor }),
  });
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.messages;
  }
  return http<ContactMessage[]>('/api/v1/admin/messages');
}

export async function updateContactMessage(id: string, patch: Partial<ContactMessage>): Promise<ContactMessage> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    const msg = MOCK.messages.find((m) => m.id === id) || MOCK.messages[0];
    return { ...msg, ...patch };
  }
  return http<ContactMessage>(`/api/v1/admin/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function fetchLogs(): Promise<LogEntry[]> {
  if (isMockMode()) {
    const MOCK = await loadMockData();
    return MOCK.logs;
  }
  return http<LogEntry[]>('/api/v1/admin/logs');
}

export interface AdminListFilters {
  page?: number;
  limit?: number;
  client_id?: number;
  status?: string;
  event_type?: string;
  tool?: string;
  success?: boolean;
  source?: string;
  date_from?: string;
  date_to?: string;
}

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number };
}

function assertAdminAccess(): void {
  if (!isMockMode() && getUserRole() !== 'super_admin') {
    throw new Error('Super Admin access is required.');
  }
}

function buildAdminQuery(filters: AdminListFilters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function pageResult<T>(items: T[], filters: AdminListFilters, total = items.length): AdminPage<T> {
  return {
    items,
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
    total,
  };
}

function localDate(value: string): string {
  return value.slice(0, 10);
}

function sanitizeWebhookPayload(payload: unknown): Record<string, unknown> {
  const sanitized = sanitizeWebhookValue(payload);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}

function sanitizeWebhookValue(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeWebhookValue(item, key));
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (!/token|secret|password|authorization|api_key|signature/i.test(childKey)) {
        sanitized[childKey] = sanitizeWebhookValue(childValue, childKey);
      }
    }
    return sanitized;
  }
  if (typeof value === 'number' && /phone|mobile|telephone|tel/i.test(key)) {
    return `******${String(value).replace(/\D/g, '').slice(-4)}`;
  }
  if (typeof value !== 'string') return value;
  if (/phone|mobile|telephone|tel/i.test(key)) {
    const digits = value.replace(/\D/g, '');
    return `******${digits.slice(-4)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return value;
  return value.replace(/(?:\+?\d[\d\s().-]{5,}\d)/g, (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 ? `******${digits.slice(-4)}` : phone;
  });
}

export async function fetchAdminWebhookEvents(
  filters: AdminListFilters = {},
): Promise<AdminPage<AdminWebhookEvent>> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    let rows = structuredClone(MOCK_LOGWATCH.webhookEvents);
    if (filters.client_id !== undefined) rows = rows.filter((row) => row.client_id === filters.client_id);
    if (filters.status) rows = rows.filter((row) => row.status === filters.status);
    if (filters.event_type) rows = rows.filter((row) => row.event_type === filters.event_type);
    if (filters.date_from) rows = rows.filter((row) => localDate(row.created_at) >= filters.date_from!);
    if (filters.date_to) rows = rows.filter((row) => localDate(row.created_at) <= filters.date_to!);
    return mockPage(rows, filters);
  }
  return fetchAdminPage<AdminWebhookEvent>('/api/v1/admin/webhook-events', filters);
}

export async function fetchAdminWebhookEvent(id: number): Promise<AdminWebhookEventDetail> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    const row = MOCK_LOGWATCH.webhookEventDetails[id];
    if (!row) throw new Error('Webhook event not found.');
    return { ...structuredClone(row), payload: sanitizeWebhookPayload(row.payload) };
  }
  const event = await http<AdminWebhookEventDetail>(`/api/v1/admin/webhook-events/${encodeURIComponent(id)}`);
  return { ...event, payload: sanitizeWebhookPayload(event.payload) };
}

export async function fetchAdminToolCalls(
  filters: AdminListFilters = {},
): Promise<AdminPage<AdminToolCall>> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    let rows = structuredClone(MOCK_LOGWATCH.toolCalls);
    if (filters.client_id !== undefined) rows = rows.filter((row) => row.client_id === filters.client_id);
    if (filters.tool) rows = rows.filter((row) => row.tool === filters.tool);
    if (filters.success !== undefined) rows = rows.filter((row) => row.success === filters.success);
    if (filters.date_from) rows = rows.filter((row) => localDate(row.created_at) >= filters.date_from!);
    if (filters.date_to) rows = rows.filter((row) => localDate(row.created_at) <= filters.date_to!);
    return mockPage(rows, filters);
  }
  return fetchAdminPage<AdminToolCall>('/api/v1/admin/tool-calls', filters);
}

export async function fetchAdminAppointments(
  filters: AdminListFilters = {},
): Promise<AdminPage<AdminAppointment>> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    let rows = structuredClone(MOCK_LOGWATCH.appointments);
    if (filters.client_id !== undefined) rows = rows.filter((row) => row.client_id === filters.client_id);
    if (filters.status) rows = rows.filter((row) => row.status === filters.status);
    if (filters.source) rows = rows.filter((row) => row.source === filters.source);
    if (filters.date_from) rows = rows.filter((row) => row.date >= filters.date_from!);
    if (filters.date_to) rows = rows.filter((row) => row.date <= filters.date_to!);
    return mockPage(rows, filters);
  }
  return fetchAdminPage<AdminAppointment>('/api/v1/admin/appointments', filters);
}

export async function fetchAdminMonitoring(
  filters: Pick<AdminListFilters, 'page' | 'limit'> = {},
): Promise<AdminPage<AdminMonitoringRow>> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    return mockPage(structuredClone(MOCK_LOGWATCH.monitoring), filters);
  }
  return fetchAdminPage<AdminMonitoringRow>('/api/v1/admin/monitoring', filters);
}

export async function fetchAdminHealthDetails(): Promise<AdminHealthDetails> {
  assertAdminAccess();
  if (isMockMode()) {
    const { MOCK_LOGWATCH } = await import('./mock');
    return structuredClone(MOCK_LOGWATCH.health);
  }
  return http<AdminHealthDetails>('/api/v1/admin/health/details');
}

function mockPage<T>(rows: T[], filters: AdminListFilters): AdminPage<T> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const start = (page - 1) * limit;
  return pageResult(rows.slice(start, start + limit), filters, rows.length);
}

async function fetchAdminPage<T>(
  path: string, filters: AdminListFilters,
): Promise<AdminPage<T>> {
  const response = await http<ApiPaginated<T>>(
    `${path}${buildAdminQuery({ page: 1, limit: 10, ...filters })}`,
    { unwrapResponse: false },
  );
  return {
    items: response.data,
    page: response.pagination.page,
    limit: response.pagination.limit,
    total: response.pagination.total,
  };
}

// ---------------- STAFF ADMIN PIN ----------------

export async function verifyStaffPin(pin: string, businessId = 'b1'): Promise<{ ok: boolean; msg?: string }> {
  if (isMockMode()) {
    await loadMockData();
    if (pin === '1234' || pin === '4321') return { ok: true };
    return { ok: false, msg: 'Invalid staff PIN.' };
  }

  try {
    const res = await http<{ ok: boolean; elevation_token: string; expires_in: number }>('/api/v1/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res?.elevation_token) {
      setElevationToken(res.elevation_token);
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, msg: err?.message || 'Verification failed.' };
  }
}

export async function changeStaffPin(
  currentPin: string,
  newPin: string,
  confirmPin: string,
  businessId = 'b1'
): Promise<string | null> {
  if (isMockMode()) {
    await loadMockData();
    if (newPin !== confirmPin) return 'PINs do not match.';
    return null;
  }

  try {
    await http('/api/v1/pin/change', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin, confirmPin }),
    });
    return null;
  } catch (err: any) {
    return err?.message || 'Failed to update PIN.';
  }
}
