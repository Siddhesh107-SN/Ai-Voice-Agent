import { apiClient, isMockMode } from './client';
import { mockAgentsService } from '@/lib/mock/agents';
import { AIAgent, AIAgentCreateInput, AIAgentUpdateInput, PaginatedResponse } from '@/lib/types';

export const agentsApi = {
  async getAgents(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AIAgent>> {
    if (isMockMode()) {
      return mockAgentsService.getAgents(params);
    }
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<AIAgent>>(`/api/v1/agents?${query.toString()}`);
  },

  async getAgentById(id: string): Promise<AIAgent> {
    if (isMockMode()) {
      return mockAgentsService.getAgentById(id);
    }
    return apiClient<AIAgent>(`/api/v1/agents/${id}`);
  },

  async createAgent(input: AIAgentCreateInput): Promise<AIAgent> {
    if (isMockMode()) {
      return mockAgentsService.createAgent(input);
    }
    return apiClient<AIAgent>('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateAgent(id: string, input: AIAgentUpdateInput): Promise<AIAgent> {
    if (isMockMode()) {
      return mockAgentsService.updateAgent(id, input);
    }
    return apiClient<AIAgent>(`/api/v1/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    if (isMockMode()) {
      return mockAgentsService.deleteAgent(id);
    }
    return apiClient<{ success: boolean; message: string }>(`/api/v1/agents/${id}`, {
      method: 'DELETE',
    });
  },
};
