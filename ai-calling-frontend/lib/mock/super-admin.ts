import { MockStorage, simulateLatency } from './storage';
import {
  SuperAdminDashboardData,
  PlatformBusiness,
  PlatformAuditLog,
  PlatformRevenueData,
  PlatformAgent,
  SystemHealthData,
} from '@/lib/types';

export const mockSuperAdminService = {
  async getDashboard(): Promise<SuperAdminDashboardData> {
    await simulateLatency(150);
    const businesses = MockStorage.getPlatformBusinesses();
    const logs = MockStorage.getAuditLogs();
    const revenue = MockStorage.getRevenueData();
    const agents = MockStorage.getPlatformAgents();

    const activeBiz = businesses.filter((b) => b.status === 'active').length;
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const totalCalls = businesses.reduce((acc, b) => acc + (b.total_calls || 0), 0);

    return {
      total_businesses: businesses.length,
      active_businesses: activeBiz,
      total_users: 48,
      active_agents: activeAgents,
      total_calls: totalCalls,
      total_revenue: revenue.total_revenue,
      monthly_revenue: revenue.this_month,
      system_status: 'Operational',
      recent_logs: logs.slice(0, 10),
      top_businesses: businesses.slice(0, 5),
    };
  },

  async getBusinesses(params: {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: PlatformBusiness[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
    await simulateLatency(150);
    const { search, status = 'all', plan = 'all', page = 1, limit = 50 } = params;
    let list = MockStorage.getPlatformBusinesses();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.business_name.toLowerCase().includes(q) ||
          b.owner_name.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          b.phone.includes(q)
      );
    }

    if (status !== 'all') {
      list = list.filter((b) => b.status === status);
    }

    if (plan !== 'all') {
      list = list.filter((b) => b.plan === plan);
    }

    const total = list.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const data = list.slice(offset, offset + limit);

    return {
      data,
      pagination: { page, limit, total, total_pages },
    };
  },

  async getBusiness(id: string): Promise<PlatformBusiness & { users?: any[]; agents?: any[] }> {
    await simulateLatency(100);
    const list = MockStorage.getPlatformBusinesses();
    const biz = list.find((b) => b.id === id);
    if (!biz) throw new Error('Business not found');

    const agents = MockStorage.getPlatformAgents().filter((a) => a.business_id === id);
    const users = MockStorage.getUsers().filter((u) => u.client_id === id);

    return {
      ...biz,
      agents,
      users,
    };
  },

  async updateBusinessStatus(id: string, status: 'active' | 'inactive' | 'suspended' | 'trial'): Promise<PlatformBusiness> {
    await simulateLatency(200);
    const list = MockStorage.getPlatformBusinesses();
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Business not found');

    const updated: PlatformBusiness = {
      ...list[idx],
      status,
    };
    list[idx] = updated;
    MockStorage.setPlatformBusinesses(list);

    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: status === 'inactive' || status === 'suspended' ? 'WARNING' : 'INFO',
      service: 'Platform Admin',
      business_id: id,
      business_name: updated.business_name,
      user_id: 'user-super-1',
      user_name: 'Alexander Wright',
      role: 'SUPER_ADMIN',
      event: 'Business Status Modified',
      status: 'SUCCESS',
      details: `Super Admin set business '${updated.business_name}' status to ${status.toUpperCase()}.`,
      endpoint: `/api/v1/super-admin/businesses/${id}/status`,
      http_method: 'PATCH',
      status_code: 200,
    });

    return updated;
  },

  async getLogs(params: {
    search?: string;
    level?: string;
    service?: string;
    business?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: PlatformAuditLog[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
    await simulateLatency(150);
    const { search, level = 'all', service = 'all', business = 'all', page = 1, limit = 50 } = params;
    let logs = MockStorage.getAuditLogs();

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.event.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.user_name.toLowerCase().includes(q) ||
          l.business_name.toLowerCase().includes(q)
      );
    }

    if (level !== 'all') {
      logs = logs.filter((l) => l.level === level);
    }

    if (service !== 'all') {
      logs = logs.filter((l) => l.service.toLowerCase().includes(service.toLowerCase()));
    }

    if (business !== 'all') {
      logs = logs.filter(
        (l) => l.business_id === business || l.business_name.toLowerCase().includes(business.toLowerCase())
      );
    }

    const total = logs.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const data = logs.slice(offset, offset + limit);

    return {
      data,
      pagination: { page, limit, total, total_pages },
    };
  },

  async getRevenue(timeframe?: string): Promise<PlatformRevenueData> {
    await simulateLatency(150);
    return MockStorage.getRevenueData();
  },

  async getAgents(params: {
    business?: string;
    status?: string;
    health?: string;
    language?: string;
  } = {}): Promise<{ summary: { total_agents: number; active: number; inactive: number; error: number; offline: number }; data: PlatformAgent[] }> {
    await simulateLatency(150);
    const { business = 'all', status = 'all', health = 'all', language = 'all' } = params;
    let agents = MockStorage.getPlatformAgents();

    if (business !== 'all') {
      agents = agents.filter(
        (a) => a.business_id === business || a.business_name.toLowerCase().includes(business.toLowerCase())
      );
    }

    if (status !== 'all') {
      agents = agents.filter((a) => a.status === status);
    }

    if (health !== 'all') {
      agents = agents.filter((a) => a.health === health);
    }

    if (language !== 'all') {
      agents = agents.filter((a) => a.language.toLowerCase().includes(language.toLowerCase()));
    }

    const allAgents = MockStorage.getPlatformAgents();
    const summary = {
      total_agents: allAgents.length,
      active: allAgents.filter((a) => a.status === 'active').length,
      inactive: allAgents.filter((a) => a.status === 'inactive').length,
      error: allAgents.filter((a) => a.health === 'UNHEALTHY').length,
      offline: allAgents.filter((a) => a.status === 'offline' || a.health === 'DEGRADED').length,
    };

    return { summary, data: agents };
  },

  async getSystemHealth(): Promise<SystemHealthData> {
    await simulateLatency(100);
    return MockStorage.getSystemHealth();
  },

  async getSettings(): Promise<Record<string, any>> {
    await simulateLatency(100);
    return {
      platform_name: 'TalkAor AI Voice Calling SaaS',
      maintenance_mode: false,
      default_currency: 'INR',
      currency_symbol: '₹',
      max_concurrent_calls_per_agent: 10,
      api_rate_limit_per_minute: 600,
      recording_retention_days: 180,
      allow_new_registrations: true,
      telephony_provider: 'TalkAor Neural SIP Bridge',
      admin_access_code_enforced: true,
    };
  },

  async updateSettings(data: Record<string, any>): Promise<{ success: boolean; message: string; settings: any }> {
    await simulateLatency(200);
    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'WARNING',
      service: 'Platform Settings',
      business_id: 'platform-system',
      business_name: 'TalkAor Platform',
      user_id: 'user-super-1',
      user_name: 'Alexander Wright',
      role: 'SUPER_ADMIN',
      event: 'Platform Settings Changed',
      status: 'SUCCESS',
      details: 'Super Admin updated platform configuration settings.',
      endpoint: '/api/v1/super-admin/settings',
      http_method: 'PATCH',
      status_code: 200,
      metadata: data,
    });
    return {
      success: true,
      message: 'Platform settings saved successfully.',
      settings: data,
    };
  },
};
