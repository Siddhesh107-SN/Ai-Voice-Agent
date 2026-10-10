import { apiClient, isMockMode } from './client';
import { mockDashboardService } from '@/lib/mock/dashboard';
import { DashboardSummary } from '@/lib/types';

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    if (isMockMode()) {
      return mockDashboardService.getSummary();
    }
    return apiClient<DashboardSummary>('/api/v1/dashboard/summary');
  },
};
