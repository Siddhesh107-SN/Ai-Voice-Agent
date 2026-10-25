export type Role = 'staff' | 'admin' | 'super_admin';
export type ApptStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';

// Fields follow TalkAor_Dashboard_Specification.pdf (section 5), plus two optional cancellation fields.
export interface Appointment {
  id: string; customer_id: string; customer_name: string; customer_phone: string; customer_email?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  day_of_week: string; service: string; status: ApptStatus;
  staff_name?: string; agent_name?: string; notes?: string; image?: string;
  cancel_reason?: string; cancelled_by?: 'ai_agent' | 'staff';
  created_at: string; updated_at: string;
}
export interface AppointmentHistoryItem {
  id: string; appointment_id: string; event: string; old_value?: string; new_value?: string;
  actor: string; actor_type: 'staff' | 'ai_agent'; timestamp: string;
}
export interface TranscriptLine { speaker: string; text: string; time: string }
export interface Call {
  id: string; customer_name: string; customer_phone: string; agent_name: string; duration_seconds: number;
  status: 'completed' | 'missed' | 'failed' | 'in_progress'; outcome?: 'BOOKED' | 'INQUIRY';
  summary?: string; has_recording: boolean; recording_url?: string; transcript?: TranscriptLine[];
}
export interface Agent { id: string; name: string; languages: string; phone: string; online: boolean; calls_today: number; business_id: string }
export type Plan = 'Starter' | 'Growth' | 'Business';
export interface Business {
  id: string; name: string; plan: Plan; minutes_used: number; minutes_limit: number;
  status: 'Active' | 'Suspended'; renews_on: string; last_login: string; staff_pin: string;
}
export interface AccessRequest { id: string; business: string; plan: Plan; billing: 'monthly' | 'yearly'; amount: number; status: string }
export interface ContactMessage { id: string; name: string; email: string; phone: string; message: string; received_at: string; read: boolean; handled: boolean }
export type LogLevel = 'info' | 'warn' | 'error';
export interface LogEntry { at: string; text: string; level: LogLevel }
export interface StaffMember { id: string; name: string; title: string; days: boolean[] } // Mon..Sun
export interface DayHours { open: string; close: string; closed: boolean } // Mon..Sun
export interface MockData {
  appts: Appointment[]; history: Record<string, AppointmentHistoryItem[]>; agents: Agent[]; calls: Call[];
  staff: StaffMember[]; services: string[]; hours: DayHours[]; businesses: Business[];
  requests: AccessRequest[]; messages: ContactMessage[]; logs: LogEntry[];
}
