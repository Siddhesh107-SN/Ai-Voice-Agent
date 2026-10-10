import { MockStorage, simulateLatency } from './storage';
import { Call, PaginatedResponse, UserRole } from '@/lib/types';

export const mockCallsService = {
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
    await simulateLatency(200);

    let items = [...MockStorage.getCalls()];

    if (params?.status && params.status !== 'all') {
      items = items.filter((c) => c.status.toLowerCase() === params.status?.toLowerCase());
    }

    if (params?.direction && params.direction !== 'all') {
      items = items.filter((c) => c.direction.toLowerCase() === params.direction?.toLowerCase());
    }

    if (params?.agent && params.agent !== 'all') {
      items = items.filter((c) => c.agent_id === params.agent || c.agent_name.toLowerCase().includes(params.agent!.toLowerCase()));
    }

    if (params?.customer) {
      const q = params.customer.toLowerCase();
      items = items.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_phone.includes(q)
      );
    }

    if (params?.date) {
      items = items.filter((c) => c.date_time.startsWith(params.date!));
    }

    if (params?.date_from) {
      items = items.filter((c) => c.date_time >= params.date_from!);
    }

    if (params?.date_to) {
      items = items.filter((c) => c.date_time <= params.date_to!);
    }

    // Newest calls first
    items.sort((a, b) => b.date_time.localeCompare(a.date_time));

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

  async getCallById(id: string, userRole?: UserRole): Promise<Call> {
    await simulateLatency(150);
    const item = MockStorage.getCalls().find((c) => c.id === id);
    if (!item) {
      throw {
        success: false,
        message: `Call with ID ${id} was not found.`,
        error_code: 'CALL_NOT_FOUND',
      };
    }

    // Role check: If staff member, sanitize transcript and recording
    if (userRole === 'CLIENT_STAFF') {
      return {
        ...item,
        has_recording: false,
        recording_url: undefined,
        has_transcript: false,
        transcript: undefined,
      };
    }

    return item;
  },
};
