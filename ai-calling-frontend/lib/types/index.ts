export type UserRole =
  | 'STAFF'
  | 'BUSINESS_ADMIN'
  | 'SUPER_ADMIN'
  | 'CLIENT_ADMIN'
  | 'CLIENT_STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  client_id: string;
  is_active: boolean;
  avatar?: string;
  created_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'rescheduled';

export interface Appointment {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  day_of_week: string; // e.g. "Monday"
  service: string;
  status: AppointmentStatus;
  staff_id?: string;
  staff_name?: string;
  agent_id?: string;
  agent_name?: string;
  notes?: string;
  image?: string;
  background?: string;
  foreground?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreateInput {
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  service: string;
  notes?: string;
  agent_id?: string;
}

export interface AppointmentUpdateInput {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  service?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AppointmentRescheduleInput {
  new_date: string; // YYYY-MM-DD
  new_time: string; // HH:MM:SS
  reason?: string;
}

export interface AppointmentCancelInput {
  reason?: string;
}

export interface AppointmentHistoryItem {
  id: string;
  appointment_id: string;
  event: string;
  old_value?: string;
  new_value?: string;
  actor: string;
  actor_type: 'staff' | 'ai_agent';
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  total_appointments?: number;
  notes?: string;
}

export interface CustomerCreateInput {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface CustomerUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'completed' | 'missed' | 'failed' | 'in_progress';

export interface CallTranscriptLine {
  speaker: string;
  text: string;
  time: string;
}

export interface Call {
  id: string;
  date_time: string;
  direction: CallDirection;
  status: CallStatus;
  duration_seconds: number;
  agent_id: string;
  agent_name: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  has_recording: boolean;
  recording_url?: string;
  has_transcript: boolean;
  transcript?: CallTranscriptLine[];
  summary?: string;
}

export type CancellationSource = 'user' | 'ai_agent';

export interface Cancellation {
  id: string;
  appointment_id: string;
  original_date: string;
  original_time: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  reason: string;
  cancelled_by: CancellationSource;
  cancelled_by_name: string;
  timestamp: string;
}

export type AgentStatus = 'active' | 'inactive' | 'training' | 'offline';

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  phone_number: string;
  provider: string;
  status: AgentStatus;
  configuration: Record<string, any>;
  created_at: string;
  voice_id?: string;
  accent?: string;
}

export interface AIAgentCreateInput {
  name: string;
  description: string;
  phone_number: string;
  provider: string;
  status: AgentStatus;
  configuration: Record<string, any>;
}

export interface AIAgentUpdateInput {
  name?: string;
  description?: string;
  phone_number?: string;
  provider?: string;
  status?: AgentStatus;
  configuration?: Record<string, any>;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  client_id: string;
  is_active: boolean;
  created_at: string;
}

export interface StaffCreateInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface StaffUpdateInput {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  status: 'active' | 'trial' | 'suspended';
  created_at: string;
  plan?: string;
  description?: string;
  working_hours?: string;
  services?: string[];
  logo?: string;
}

export interface BusinessProfileUpdateInput {
  business_name?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  description?: string;
  working_hours?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error_code?: string;
}

export interface DashboardSummary {
  total_appointments: number;
  today_appointments: number;
  scheduled_appointments: number;
  cancelled_appointments: number;
  completed_appointments: number;
  total_customers: number;
  total_agents: number;
  active_agents: number;
  total_calls: number;
  calls_today: number;
  weekly_stats: {
    day: string;
    calls: number;
    appointments: number;
    completion_rate: number;
  }[];
  recent_calls: Call[];
  upcoming_appointments: Appointment[];
}

// ==========================================
// BUSINESS ADMIN & SUPER ADMIN TYPES
// ==========================================

export interface AdminUnlockRequest {
  access_code: string;
}

export interface AdminUnlockResponse {
  success: boolean;
  message: string;
  unlocked_until?: string;
  user_role?: UserRole;
}

export interface PlatformBusiness {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'trial' | 'suspended';
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  active_agents: number;
  total_calls: number;
  revenue: number;
  last_activity: string;
  created_at: string;
  address?: string;
  timezone?: string;
  description?: string;
  working_hours?: string;
  logo?: string;
}

export type AuditLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  level: AuditLogLevel;
  service: string;
  business_id?: string;
  business_name: string;
  user_id?: string;
  user_name: string;
  role: string;
  event: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  details: string;
  request_id?: string;
  endpoint?: string;
  http_method?: string;
  status_code?: number;
  error_message?: string;
  stack_trace?: string;
  metadata?: Record<string, any>;
}

export interface SuperAdminDashboardData {
  total_businesses: number;
  active_businesses: number;
  total_users: number;
  active_agents: number;
  total_calls: number;
  total_revenue: number;
  monthly_revenue: number;
  system_status: 'Operational' | 'Degraded' | 'Offline';
  recent_logs: PlatformAuditLog[];
  top_businesses: PlatformBusiness[];
}

export interface PlatformRevenueData {
  total_revenue: number;
  this_month: number;
  this_year: number;
  active_subscriptions: number;
  revenue_growth_percentage: number;
  total_transactions: number;
  revenue_over_time: {
    date: string;
    revenue: number;
    subscriptions: number;
  }[];
  revenue_by_plan: {
    plan: string;
    revenue: number;
    count: number;
  }[];
  revenue_by_business: {
    business_id: string;
    business_name: string;
    revenue: number;
    plan: string;
  }[];
}

export interface PlatformAgent extends AIAgent {
  business_id: string;
  business_name: string;
  language: string;
  last_active: string;
  total_calls: number;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
}

export interface ServiceHealth {
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latency_ms: number;
  last_checked: string;
  description: string;
}

export interface SystemHealthData {
  frontend: ServiceHealth;
  fastapi_backend: ServiceHealth;
  database: ServiceHealth;
  ai_voice_service: ServiceHealth;
  agent_service: ServiceHealth;
  authentication: ServiceHealth;
  storage: ServiceHealth;
  overall_status: 'Operational' | 'Degraded' | 'Offline';
}

