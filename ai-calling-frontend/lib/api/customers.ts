import { apiClient, isMockMode } from './client';
import { mockCustomersService } from '@/lib/mock/customers';
import { Customer, CustomerCreateInput, CustomerUpdateInput, PaginatedResponse } from '@/lib/types';

export const customersApi = {
  async getCustomers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Customer>> {
    if (isMockMode()) {
      return mockCustomersService.getCustomers(params);
    }
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<Customer>>(`/api/v1/customers?${query.toString()}`);
  },

  async getCustomerById(id: string): Promise<Customer> {
    if (isMockMode()) {
      return mockCustomersService.getCustomerById(id);
    }
    return apiClient<Customer>(`/api/v1/customers/${id}`);
  },

  async createCustomer(input: CustomerCreateInput): Promise<Customer> {
    if (isMockMode()) {
      return mockCustomersService.createCustomer(input);
    }
    return apiClient<Customer>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer> {
    if (isMockMode()) {
      return mockCustomersService.updateCustomer(id, input);
    }
    return apiClient<Customer>(`/api/v1/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    if (isMockMode()) {
      return mockCustomersService.deleteCustomer(id);
    }
    return apiClient<{ success: boolean; message: string }>(`/api/v1/customers/${id}`, {
      method: 'DELETE',
    });
  },
};
