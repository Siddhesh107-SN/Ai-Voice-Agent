import { apiClient, isMockMode } from './client';
import { mockUsersService } from '@/lib/mock/users';
import { PaginatedResponse, StaffCreateInput, StaffUpdateInput, StaffUser } from '@/lib/types';

export const usersApi = {
  async getUsers(params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StaffUser>> {
    if (isMockMode()) {
      return mockUsersService.getUsers(params);
    }
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return apiClient<PaginatedResponse<StaffUser>>(`/api/v1/users?${query.toString()}`);
  },

  async getUserById(id: string): Promise<StaffUser> {
    if (isMockMode()) {
      return mockUsersService.getUserById(id);
    }
    return apiClient<StaffUser>(`/api/v1/users/${id}`);
  },

  async createUser(input: StaffCreateInput): Promise<StaffUser> {
    if (isMockMode()) {
      return mockUsersService.createUser(input);
    }
    return apiClient<StaffUser>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateUser(id: string, input: StaffUpdateInput): Promise<StaffUser> {
    if (isMockMode()) {
      return mockUsersService.updateUser(id, input);
    }
    return apiClient<StaffUser>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
