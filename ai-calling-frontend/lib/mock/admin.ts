import { MockStorage, simulateLatency } from './storage';
import {
  Appointment,
  AppointmentUpdateInput,
  AppointmentRescheduleInput,
  AppointmentCancelInput,
  Call,
  AIAgent,
  BusinessProfile,
  BusinessProfileUpdateInput,
} from '@/lib/types';

export const mockAdminService = {
  async getAppointments(params: {
    status?: string;
    customer?: string;
    date?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Appointment[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
    await simulateLatency(150);
    const { status = 'all', customer, page = 1, limit = 50 } = params;
    let appointments = MockStorage.getAppointments();

    if (status !== 'all') {
      appointments = appointments.filter((a) => a.status === status);
    }
    if (customer) {
      const q = customer.toLowerCase();
      appointments = appointments.filter(
        (a) => a.customer_name.toLowerCase().includes(q) || a.customer_phone.includes(q)
      );
    }

    const total = appointments.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const data = appointments.slice(offset, offset + limit);

    return {
      data,
      pagination: { page, limit, total, total_pages },
    };
  },

  async updateAppointment(id: string, input: AppointmentUpdateInput): Promise<Appointment> {
    await simulateLatency(200);
    const appointments = MockStorage.getAppointments();
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');

    const updated: Appointment = {
      ...appointments[idx],
      ...input,
      updated_at: new Date().toISOString(),
    };
    appointments[idx] = updated;
    MockStorage.setAppointments(appointments);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Appointment Modified',
      status: 'SUCCESS',
      details: `Admin updated appointment ${id} for ${updated.customer_name}.`,
      endpoint: `/api/v1/admin/appointments/${id}`,
      http_method: 'PATCH',
      status_code: 200,
    });

    return updated;
  },

  async rescheduleAppointment(id: string, input: AppointmentRescheduleInput): Promise<{ message: string; appointment: Appointment }> {
    await simulateLatency(250);
    const appointments = MockStorage.getAppointments();
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');

    const prev = appointments[idx];
    const previousSlot = `${prev.date} at ${prev.time}`;
    const newSlot = `${input.new_date} at ${input.new_time}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(input.new_date);
    const day_of_week = isNaN(d.getDay()) ? prev.day_of_week : days[d.getDay()];

    const updated: Appointment = {
      ...prev,
      date: input.new_date,
      time: input.new_time,
      day_of_week,
      status: 'rescheduled',
      updated_at: new Date().toISOString(),
    };
    appointments[idx] = updated;
    MockStorage.setAppointments(appointments);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Rescheduled Appointment',
      status: 'SUCCESS',
      details: `Rescheduled ${id} from ${previousSlot} to ${newSlot}. Reason: ${input.reason || 'None'}`,
      endpoint: `/api/v1/admin/appointments/${id}/reschedule`,
      http_method: 'POST',
      status_code: 200,
      metadata: { previous_slot: previousSlot, new_slot: newSlot },
    });

    return {
      message: 'Appointment rescheduled successfully.',
      appointment: updated,
    };
  },

  async cancelAppointment(id: string, input: AppointmentCancelInput): Promise<{ message: string; appointment: Appointment }> {
    await simulateLatency(200);
    const appointments = MockStorage.getAppointments();
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');

    const prev = appointments[idx];
    const updated: Appointment = {
      ...prev,
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    appointments[idx] = updated;
    MockStorage.setAppointments(appointments);

    const cancellations = MockStorage.getCancellations();
    cancellations.unshift({
      id: `canc-${Date.now()}`,
      appointment_id: id,
      original_date: prev.date,
      original_time: prev.time,
      customer_id: prev.customer_id,
      customer_name: prev.customer_name,
      customer_phone: prev.customer_phone,
      reason: input.reason || 'Cancelled by Admin',
      cancelled_by: 'user',
      cancelled_by_name: 'Sarah Jenkins (Admin)',
      timestamp: new Date().toISOString(),
    });
    MockStorage.setCancellations(cancellations);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Cancelled Appointment',
      status: 'SUCCESS',
      details: `Admin cancelled appointment ${id}. Reason: ${input.reason || 'None'}`,
      endpoint: `/api/v1/admin/appointments/${id}/cancel`,
      http_method: 'POST',
      status_code: 200,
    });

    return {
      message: 'Appointment cancelled by Admin.',
      appointment: updated,
    };
  },

  async restoreAppointment(id: string): Promise<{ message: string; appointment: Appointment }> {
    await simulateLatency(200);
    const appointments = MockStorage.getAppointments();
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');

    const prev = appointments[idx];
    const updated: Appointment = {
      ...prev,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    };
    appointments[idx] = updated;
    MockStorage.setAppointments(appointments);

    let cancellations = MockStorage.getCancellations();
    cancellations = cancellations.filter((c) => c.appointment_id !== id);
    MockStorage.setCancellations(cancellations);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Restored Appointment',
      status: 'SUCCESS',
      details: `Cancelled appointment ${id} restored back to scheduled by Admin.`,
      endpoint: `/api/v1/admin/appointments/${id}/restore`,
      http_method: 'POST',
      status_code: 200,
    });

    return {
      message: 'Appointment restored successfully.',
      appointment: updated,
    };
  },

  async getCalls(params: {
    customer?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Call[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
    await simulateLatency(150);
    const { status = 'all', customer, page = 1, limit = 50 } = params;
    let calls = MockStorage.getCalls();

    if (status !== 'all') {
      calls = calls.filter((c) => c.status === status);
    }
    if (customer) {
      const q = customer.toLowerCase();
      calls = calls.filter((c) => c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q));
    }

    const total = calls.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const data = calls.slice(offset, offset + limit);

    return {
      data,
      pagination: { page, limit, total, total_pages },
    };
  },

  async getCallRecording(id: string): Promise<{ call_id: string; recording_url: string; duration_seconds: number; customer_name: string; authorized: boolean }> {
    await simulateLatency(100);
    const calls = MockStorage.getCalls();
    const call = calls.find((c) => c.id === id);
    if (!call || !call.has_recording) throw new Error('Recording not found');

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Recording Service',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Recording Stream',
      status: 'SUCCESS',
      details: `Admin accessed private voice recording for call ${id}.`,
      endpoint: `/api/v1/admin/calls/${id}/recording`,
      http_method: 'GET',
      status_code: 200,
    });

    return {
      call_id: id,
      recording_url: call.recording_url || 'https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg',
      duration_seconds: call.duration_seconds,
      customer_name: call.customer_name,
      authorized: true,
    };
  },

  async getAgents(): Promise<{ data: AIAgent[] }> {
    await simulateLatency(100);
    return { data: MockStorage.getAgents() };
  },

  async toggleAgentStatus(id: string, newStatus: 'active' | 'inactive' | 'offline'): Promise<{ success: boolean; message: string; agent: AIAgent }> {
    await simulateLatency(250);
    const agents = MockStorage.getAgents();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('AI Agent not found');

    const agent = agents[idx];
    const updated: AIAgent = {
      ...agent,
      status: newStatus as any,
    };
    agents[idx] = updated;
    MockStorage.setAgents(agents);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: 'client-talkaor-01',
      business_name: 'TalkAor Voice Wellness',
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Toggled Agent Status',
      status: 'SUCCESS',
      details: `Admin switched AI Agent '${agent.name}' to ${newStatus.toUpperCase()}.`,
      endpoint: `/api/v1/admin/agents/${id}/status`,
      http_method: 'PATCH',
      status_code: 200,
      metadata: { agent_id: id, previous_status: agent.status, new_status: newStatus },
    });

    return {
      success: true,
      message: `AI Agent '${agent.name}' status changed to ${newStatus.toUpperCase()}.`,
      agent: updated,
    };
  },

  async getBusiness(): Promise<BusinessProfile> {
    await simulateLatency(100);
    return MockStorage.getBusiness();
  },

  async updateBusiness(input: BusinessProfileUpdateInput): Promise<BusinessProfile> {
    await simulateLatency(250);
    const current = MockStorage.getBusiness();
    const updated: BusinessProfile = {
      ...current,
      ...input,
    };
    MockStorage.setBusiness(updated);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Admin Controls',
      business_id: current.id,
      business_name: updated.business_name,
      user_id: 'user-admin-1',
      user_name: 'Sarah Jenkins',
      role: 'BUSINESS_ADMIN',
      event: 'Admin Business Profile Update',
      status: 'SUCCESS',
      details: `Admin updated business profile settings for ${updated.business_name}.`,
      endpoint: '/api/v1/admin/business',
      http_method: 'PATCH',
      status_code: 200,
    });

    return updated;
  },
};
