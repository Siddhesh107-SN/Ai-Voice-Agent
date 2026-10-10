import { MockStorage, simulateLatency } from './storage';
import { Cancellation, PaginatedResponse } from '@/lib/types';

export const mockCancellationsService = {
  async getCancellations(params?: {
    customer?: string;
    source?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Cancellation>> {
    await simulateLatency(200);

    let items = [...MockStorage.getCancellations()];

    if (params?.source && params.source !== 'all') {
      items = items.filter((c) => c.cancelled_by === params.source);
    }

    if (params?.customer) {
      const q = params.customer.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_phone.includes(q)
      );
    }

    if (params?.date_from) {
      items = items.filter((c) => c.timestamp >= params.date_from!);
    }

    if (params?.date_to) {
      items = items.filter((c) => c.timestamp <= params.date_to!);
    }

    // Newest cancellations first
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

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
};
