import { apiClient, isMockMode } from './client';
import { mockCancellationsService } from '@/lib/mock/cancellations';
import { Cancellation, PaginatedResponse } from '@/lib/types';

export const cancellationsApi = {
  async getCancellations(params?: {
    customer?: string;
    source?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Cancellation>> {
    if (isMockMode()) {
      return mockCancellationsService.getCancellations(params);
    }
    const query = new URLSearchParams();
    if (params?.customer) query.append('customer', params.customer);
    if (params?.source) query.append('source', params.source);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<Cancellation>>(
      `/api/v1/cancellations?${query.toString()}`
    );
  },
};
