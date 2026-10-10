import { apiClient, isMockMode } from './client';
import { mockSuperAdminService } from '@/lib/mock/super-admin';
import {
  SuperAdminDashboardData,
  PlatformBusiness,
  PlatformAuditLog,
  PlatformRevenueData,
  PlatformAgent,
  SystemHealthData,
} from '@/lib/types';

export const superAdminApi = {
  async getDashboard(): Promise<SuperAdminDashboardData> {
    if (isMockMode()) {
      return mockSuperAdminService.getDashboard();
    }
    return apiClient<SuperAdminDashboardData>('/api/v1/super-admin/dashboard', {
      method: 'GET',
    });
  },

  async getBusinesses(params: {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
  } = {}) {
    if (isMockMode()) {
      return mockSuperAdminService.getBusinesses(params);
    }
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.plan) query.set('plan', params.plan);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return apiClient<{ data: PlatformBusiness[]; pagination: any }>(
      `/api/v1/super-admin/businesses?${query.toString()}`,
      { method: 'GET' }
    );
  },

  async getBusiness(id: string) {
    if (isMockMode()) {
      return mockSuperAdminService.getBusiness(id);
    }
    return apiClient<PlatformBusiness & { users?: any[]; agents?: any[] }>(
      `/api/v1/super-admin/businesses/${id}`,
      { method: 'GET' }
    );
  },

  async updateBusinessStatus(id: string, status: 'active' | 'inactive' | 'suspended' | 'trial') {
    if (isMockMode()) {
      return mockSuperAdminService.updateBusinessStatus(id, status);
    }
    return apiClient<{ success: boolean; message: string; business: PlatformBusiness }>(
      `/api/v1/super-admin/businesses/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  async getLogs(params: {
    search?: string;
    level?: string;
    service?: string;
    business?: string;
    page?: number;
    limit?: number;
  } = {}) {
    if (isMockMode()) {
      return mockSuperAdminService.getLogs(params);
    }
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.level) query.set('level', params.level);
    if (params.service) query.set('service', params.service);
    if (params.business) query.set('business', params.business);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return apiClient<{ data: PlatformAuditLog[]; pagination: any }>(
      `/api/v1/super-admin/logs?${query.toString()}`,
      { method: 'GET' }
    );
  },

  async getRevenue(timeframe?: string): Promise<PlatformRevenueData> {
    if (isMockMode()) {
      return mockSuperAdminService.getRevenue(timeframe);
    }
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    return apiClient<PlatformRevenueData>(`/api/v1/super-admin/revenue${query}`, {
      method: 'GET',
    });
  },

  async getAgents(params: {
    business?: string;
    status?: string;
    health?: string;
    language?: string;
  } = {}) {
    if (isMockMode()) {
      return mockSuperAdminService.getAgents(params);
    }
    const query = new URLSearchParams();
    if (params.business) query.set('business', params.business);
    if (params.status) query.set('status', params.status);
    if (params.health) query.set('health', params.health);
    if (params.language) query.set('language', params.language);

    return apiClient<{
      summary: { total_agents: number; active: number; inactive: number; error: number; offline: number };
      data: PlatformAgent[];
    }>(`/api/v1/super-admin/agents?${query.toString()}`, { method: 'GET' });
  },

  async getSystemHealth(): Promise<SystemHealthData> {
    if (isMockMode()) {
      return mockSuperAdminService.getSystemHealth();
    }
    return apiClient<SystemHealthData>('/api/v1/super-admin/system-health', {
      method: 'GET',
    });
  },

  async getSettings(): Promise<Record<string, any>> {
    if (isMockMode()) {
      return mockSuperAdminService.getSettings();
    }
    return apiClient<Record<string, any>>('/api/v1/super-admin/settings', {
      method: 'GET',
    });
  },

  async updateSettings(data: Record<string, any>) {
    if (isMockMode()) {
      return mockSuperAdminService.updateSettings(data);
    }
    return apiClient<{ success: boolean; message: string; settings: any }>(
      '/api/v1/super-admin/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },
};
