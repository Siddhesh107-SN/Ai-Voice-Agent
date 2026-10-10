import { MockStorage, simulateLatency } from './storage';
import { Customer, CustomerCreateInput, CustomerUpdateInput, PaginatedResponse } from '@/lib/types';

export const mockCustomersService = {
  async getCustomers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Customer>> {
    await simulateLatency(200);

    let items = [...MockStorage.getCustomers()];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
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

  async getCustomerById(id: string): Promise<Customer> {
    await simulateLatency(150);
    const item = MockStorage.getCustomers().find((c) => c.id === id);
    if (!item) {
      throw {
        success: false,
        message: `Customer with ID ${id} was not found.`,
        error_code: 'CUSTOMER_NOT_FOUND',
      };
    }
    return item;
  },

  async createCustomer(input: CustomerCreateInput): Promise<Customer> {
    await simulateLatency(300);

    const customers = MockStorage.getCustomers();
    const existing = customers.find((c) => c.email.toLowerCase() === input.email.toLowerCase() || c.phone === input.phone);
    if (existing) {
      throw {
        success: false,
        message: 'A customer with this email or phone number already exists.',
        error_code: 'CUSTOMER_DUPLICATE',
      };
    }

    const newCust: Customer = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      notes: input.notes?.trim() || '',
      total_appointments: 0,
      created_at: new Date().toISOString(),
    };

    customers.unshift(newCust);
    MockStorage.setCustomers(customers);

    return newCust;
  },

  async updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer> {
    await simulateLatency(250);

    const customers = MockStorage.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Customer with ID ${id} was not found.`,
        error_code: 'CUSTOMER_NOT_FOUND',
      };
    }

    const current = customers[index];
    const updated: Customer = {
      ...current,
      name: input.name ? input.name.trim() : current.name,
      phone: input.phone ? input.phone.trim() : current.phone,
      email: input.email ? input.email.trim() : current.email,
      notes: input.notes !== undefined ? input.notes.trim() : current.notes,
    };

    customers[index] = updated;
    MockStorage.setCustomers(customers);

    return updated;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    await simulateLatency(300);

    const customers = MockStorage.getCustomers();
    const cust = customers.find((c) => c.id === id);
    if (!cust) {
      throw {
        success: false,
        message: `Customer with ID ${id} was not found.`,
        error_code: 'CUSTOMER_NOT_FOUND',
      };
    }

    // Check for associated records (appointments or calls)
    const appointments = MockStorage.getAppointments();
    const hasAppointments = appointments.some((a) => a.customer_id === id || a.customer_name === cust.name);

    const calls = MockStorage.getCalls();
    const hasCalls = calls.some((c) => c.customer_id === id);

    if (hasAppointments || hasCalls || (cust.total_appointments && cust.total_appointments > 0)) {
      throw {
        success: false,
        message: `Cannot delete customer "${cust.name}" because they have existing appointment bookings or voice call records associated with their account.`,
        error_code: 'CUSTOMER_HAS_RECORDS',
      };
    }

    const remaining = customers.filter((c) => c.id !== id);
    MockStorage.setCustomers(remaining);

    return {
      success: true,
      message: `Customer "${cust.name}" has been deleted successfully.`,
    };
  },
};
