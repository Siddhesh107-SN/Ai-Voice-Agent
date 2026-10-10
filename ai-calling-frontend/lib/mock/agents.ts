import { MockStorage, simulateLatency } from './storage';
import { AIAgent, AIAgentCreateInput, AIAgentUpdateInput, PaginatedResponse } from '@/lib/types';

export const mockAgentsService = {
  async getAgents(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AIAgent>> {
    await simulateLatency(200);

    let items = [...MockStorage.getAgents()];

    if (params?.status && params.status !== 'all') {
      items = items.filter((a) => a.status === params.status);
    }

    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const startIndex = (page - 1) * limit;
    const data = items.slice(startIndex, startIndex + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getAgentById(id: string): Promise<AIAgent> {
    await simulateLatency(150);
    const item = MockStorage.getAgents().find((a) => a.id === id);
    if (!item) {
      throw {
        success: false,
        message: `Agent with ID ${id} was not found.`,
        error_code: 'AGENT_NOT_FOUND',
      };
    }
    return item;
  },

  async createAgent(input: AIAgentCreateInput): Promise<AIAgent> {
    await simulateLatency(300);

    const agents = MockStorage.getAgents();
    const newAgent: AIAgent = {
      id: `agent-${Date.now().toString().slice(-4)}`,
      name: input.name.trim(),
      description: input.description.trim(),
      phone_number: input.phone_number.trim(),
      provider: input.provider.trim(),
      status: input.status,
      configuration: input.configuration || {
        temperature: 0.3,
        recording_enabled: true,
      },
      created_at: new Date().toISOString(),
    };

    agents.unshift(newAgent);
    MockStorage.setAgents(agents);

    return newAgent;
  },

  async updateAgent(id: string, input: AIAgentUpdateInput): Promise<AIAgent> {
    await simulateLatency(250);

    const agents = MockStorage.getAgents();
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Agent with ID ${id} was not found.`,
        error_code: 'AGENT_NOT_FOUND',
      };
    }

    const current = agents[index];
    const updated: AIAgent = {
      ...current,
      name: input.name ? input.name.trim() : current.name,
      description: input.description ? input.description.trim() : current.description,
      phone_number: input.phone_number ? input.phone_number.trim() : current.phone_number,
      provider: input.provider ? input.provider.trim() : current.provider,
      status: input.status ? input.status : current.status,
      configuration: input.configuration ? input.configuration : current.configuration,
    };

    agents[index] = updated;
    MockStorage.setAgents(agents);

    return updated;
  },

  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    await simulateLatency(300);

    const agents = MockStorage.getAgents();
    const agent = agents.find((a) => a.id === id);
    if (!agent) {
      throw {
        success: false,
        message: `Agent with ID ${id} was not found.`,
        error_code: 'AGENT_NOT_FOUND',
      };
    }

    const remaining = agents.filter((a) => a.id !== id);
    MockStorage.setAgents(remaining);

    return {
      success: true,
      message: `AI Agent "${agent.name}" has been deleted successfully.`,
    };
  },
};
