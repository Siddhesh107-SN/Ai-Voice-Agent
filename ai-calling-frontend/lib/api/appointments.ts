import { apiClient, isMockMode } from './client';
import { mockAppointmentsService } from '@/lib/mock/appointments';
import {
  Appointment,
  AppointmentCancelInput,
  AppointmentCreateInput,
  AppointmentHistoryItem,
  AppointmentRescheduleInput,
  AppointmentUpdateInput,
  PaginatedResponse,
} from '@/lib/types';

export const appointmentsApi = {
  async getAppointments(params?: {
    status?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    customer?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    if (isMockMode()) {
      return mockAppointmentsService.getAppointments(params);
    }
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.customer) query.append('customer', params.customer);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<Appointment>>(
      `/api/v1/appointments?${query.toString()}`
    );
  },

  async getAppointmentById(id: string): Promise<Appointment> {
    if (isMockMode()) {
      return mockAppointmentsService.getAppointmentById(id);
    }
    return apiClient<Appointment>(`/api/v1/appointments/${id}`);
  },

  async createAppointment(input: AppointmentCreateInput): Promise<Appointment> {
    if (isMockMode()) {
      return mockAppointmentsService.createAppointment(input);
    }
    return apiClient<Appointment>('/api/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateAppointment(
    id: string,
    input: AppointmentUpdateInput
  ): Promise<Appointment> {
    if (isMockMode()) {
      return mockAppointmentsService.updateAppointment(id, input);
    }
    return apiClient<Appointment>(`/api/v1/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async cancelAppointment(
    id: string,
    input?: AppointmentCancelInput
  ): Promise<{ message: string; appointment: Appointment }> {
    if (isMockMode()) {
      return mockAppointmentsService.cancelAppointment(id, input);
    }
    return apiClient<{ message: string; appointment: Appointment }>(
      `/api/v1/appointments/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify(input || {}),
      }
    );
  },

  async rescheduleAppointment(
    id: string,
    input: AppointmentRescheduleInput
  ): Promise<{ message: string; appointment: Appointment }> {
    if (isMockMode()) {
      return mockAppointmentsService.rescheduleAppointment(id, input);
    }
    return apiClient<{ message: string; appointment: Appointment }>(
      `/api/v1/appointments/${id}/reschedule`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  async getAppointmentHistory(id: string): Promise<AppointmentHistoryItem[]> {
    if (isMockMode()) {
      return mockAppointmentsService.getAppointmentHistory(id);
    }
    return apiClient<AppointmentHistoryItem[]>(
      `/api/v1/appointments/${id}/history`
    );
  },
};
