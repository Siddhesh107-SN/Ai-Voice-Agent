import { apiClient, isMockMode } from './client';
import { mockAdminService } from '@/lib/mock/admin';
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

export const adminApi = {
  async getAppointments(params: {
    status?: string;
    customer?: string;
    date?: string;
    page?: number;
    limit?: number;
  } = {}) {
    if (isMockMode()) {
      return mockAdminService.getAppointments(params);
    }
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.customer) query.set('customer', params.customer);
    if (params.date) query.set('date', params.date);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return apiClient<{ data: Appointment[]; pagination: any }>(
      `/api/v1/admin/appointments?${query.toString()}`,
      { method: 'GET' }
    );
  },

  async updateAppointment(id: string, input: AppointmentUpdateInput) {
    if (isMockMode()) {
      return mockAdminService.updateAppointment(id, input);
    }
    return apiClient<Appointment>(`/api/v1/admin/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async rescheduleAppointment(id: string, input: AppointmentRescheduleInput) {
    if (isMockMode()) {
      return mockAdminService.rescheduleAppointment(id, input);
    }
    return apiClient<{ message: string; appointment: Appointment }>(
      `/api/v1/admin/appointments/${id}/reschedule`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async cancelAppointment(id: string, input: AppointmentCancelInput) {
    if (isMockMode()) {
      return mockAdminService.cancelAppointment(id, input);
    }
    return apiClient<{ message: string; appointment: Appointment }>(
      `/api/v1/admin/appointments/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async restoreAppointment(id: string) {
    if (isMockMode()) {
      return mockAdminService.restoreAppointment(id);
    }
    return apiClient<{ message: string; appointment: Appointment }>(
      `/api/v1/admin/appointments/${id}/restore`,
      {
        method: 'POST',
      }
    );
  },

  async getCalls(params: {
    customer?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    if (isMockMode()) {
      return mockAdminService.getCalls(params);
    }
    const query = new URLSearchParams();
    if (params.customer) query.set('customer', params.customer);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return apiClient<{ data: Call[]; pagination: any }>(
      `/api/v1/admin/calls?${query.toString()}`,
      { method: 'GET' }
    );
  },

  async getCallRecording(id: string) {
    if (isMockMode()) {
      return mockAdminService.getCallRecording(id);
    }
    return apiClient<{
      call_id: string;
      recording_url: string;
      duration_seconds: number;
      customer_name: string;
      authorized: boolean;
    }>(`/api/v1/admin/calls/${id}/recording`, { method: 'GET' });
  },

  async getAgents() {
    if (isMockMode()) {
      return mockAdminService.getAgents();
    }
    return apiClient<{ data: AIAgent[] }>('/api/v1/admin/agents', {
      method: 'GET',
    });
  },

  async toggleAgentStatus(id: string, status: 'active' | 'inactive' | 'offline') {
    if (isMockMode()) {
      return mockAdminService.toggleAgentStatus(id, status);
    }
    return apiClient<{ success: boolean; message: string; agent: AIAgent }>(
      `/api/v1/admin/agents/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  async getBusiness() {
    if (isMockMode()) {
      return mockAdminService.getBusiness();
    }
    return apiClient<BusinessProfile>('/api/v1/admin/business', {
      method: 'GET',
    });
  },

  async updateBusiness(input: BusinessProfileUpdateInput) {
    if (isMockMode()) {
      return mockAdminService.updateBusiness(input);
    }
    return apiClient<BusinessProfile>('/api/v1/admin/business', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
