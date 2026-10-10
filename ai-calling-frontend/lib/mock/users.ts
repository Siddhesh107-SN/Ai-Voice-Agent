import { MockStorage, simulateLatency } from './storage';
import { PaginatedResponse, StaffCreateInput, StaffUpdateInput, StaffUser } from '@/lib/types';

export const mockUsersService = {
  async getUsers(params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StaffUser>> {
    await simulateLatency(200);

    let items = [...MockStorage.getUsers()];

    if (params?.role && params.role !== 'all') {
      items = items.filter((u) => u.role === params.role);
    }

    if (params?.is_active !== undefined) {
      items = items.filter((u) => u.is_active === params.is_active);
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

  async getUserById(id: string): Promise<StaffUser> {
    await simulateLatency(150);
    const item = MockStorage.getUsers().find((u) => u.id === id);
    if (!item) {
      throw {
        success: false,
        message: `Staff member with ID ${id} was not found.`,
        error_code: 'USER_NOT_FOUND',
      };
    }
    return item;
  },

  async createUser(input: StaffCreateInput): Promise<StaffUser> {
    await simulateLatency(300);

    const users = MockStorage.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase().trim());
    if (existing) {
      throw {
        success: false,
        message: 'A staff member with this email address already exists.',
        error_code: 'EMAIL_ALREADY_EXISTS',
      };
    }

    const newUser: StaffUser = {
      id: `user-${Date.now().toString().slice(-4)}`,
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      role: input.role,
      client_id: 'client-talkaor-01',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    users.unshift(newUser);
    MockStorage.setUsers(users);

    return newUser;
  },

  async updateUser(id: string, input: StaffUpdateInput): Promise<StaffUser> {
    await simulateLatency(250);

    const users = MockStorage.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw {
        success: false,
        message: `Staff member with ID ${id} was not found.`,
        error_code: 'USER_NOT_FOUND',
      };
    }

    const current = users[index];
    const currentUser = MockStorage.getCurrentUser();

    // Check if user is attempting to change their own role or active status
    if (currentUser && currentUser.id === id) {
      if (input.role !== undefined && input.role !== current.role) {
        throw {
          success: false,
          message: 'You cannot change your own role. Another administrator must modify your role.',
          error_code: 'CANNOT_CHANGE_OWN_ROLE',
        };
      }
      if (input.is_active !== undefined && input.is_active !== current.is_active) {
        throw {
          success: false,
          message: 'You cannot deactivate your own account. Another administrator must deactivate you.',
          error_code: 'CANNOT_DEACTIVATE_OWN_ACCOUNT',
        };
      }
    }

    const updated: StaffUser = {
      ...current,
      name: input.name ? input.name.trim() : current.name,
      role: input.role !== undefined ? input.role : current.role,
      is_active: input.is_active !== undefined ? input.is_active : current.is_active,
    };

    users[index] = updated;
    MockStorage.setUsers(users);

    // If updated user is current user, update session
    if (currentUser && currentUser.id === id) {
      MockStorage.setCurrentUser({
        ...currentUser,
        name: updated.name,
        role: updated.role,
        is_active: updated.is_active,
      });
    }

    return updated;
  },
};
