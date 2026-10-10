import { apiClient, isMockMode } from './client';
import { mockCallsService } from '@/lib/mock/calls';
import { Call, PaginatedResponse, UserRole } from '@/lib/types';

export const callsApi = {
  async getCalls(params?: {
    status?: string;
    agent?: string;
    customer?: string;
    direction?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Call>> {
    if (isMockMode()) {
      return mockCallsService.getCalls(params);
    }
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.agent) query.append('agent', params.agent);
    if (params?.customer) query.append('customer', params.customer);
    if (params?.direction) query.append('direction', params.direction);
    if (params?.date) query.append('date', params.date);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<Call>>(`/api/v1/calls?${query.toString()}`);
  },

  async getCallById(id: string, userRole?: UserRole): Promise<Call> {
    if (isMockMode()) {
      return mockCallsService.getCallById(id, userRole);
    }
    return apiClient<Call>(`/api/v1/calls/${id}`);
  },
};
