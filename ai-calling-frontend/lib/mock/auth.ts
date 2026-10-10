import { MockStorage, simulateLatency } from './storage';
import { AuthResponse, LoginRequest, User } from '@/lib/types';

export const mockAuthService = {
  async login(request: LoginRequest): Promise<AuthResponse> {
    await simulateLatency(300);

    const email = request.email.trim().toLowerCase();
    const password = request.password.trim();

    const users = MockStorage.getUsers();
    const foundUser = users.find((u) => u.email.toLowerCase() === email);

    // Support quick demo logins or exact matches
    if (email === 'superadmin@talkaor.com' && (!password || password === 'super123' || password.length >= 6)) {
      const user: User = {
        id: 'user-super-1',
        name: 'Alexander Wright',
        email: 'superadmin@talkaor.com',
        role: 'SUPER_ADMIN',
        client_id: 'platform-system',
        is_active: true,
      };
      MockStorage.setCurrentUser(user);
      MockStorage.setAccessToken('mock-jwt-super-admin-token');
      MockStorage.setRefreshToken('mock-refresh-super-admin-token');
      return {
        access_token: 'mock-jwt-super-admin-token',
        refresh_token: 'mock-refresh-super-admin-token',
        token_type: 'bearer',
        user,
      };
    }

    if (email === 'admin@talkaor.com' && (!password || password === 'admin123' || password.length >= 6)) {
      const user: User = {
        id: 'user-admin-1',
        name: 'Sarah Jenkins',
        email: 'admin@talkaor.com',
        role: 'BUSINESS_ADMIN',
        client_id: 'client-talkaor-01',
        is_active: true,
      };
      MockStorage.setCurrentUser(user);
      MockStorage.setAccessToken('mock-jwt-admin-token');
      MockStorage.setRefreshToken('mock-refresh-admin-token');
      return {
        access_token: 'mock-jwt-admin-token',
        refresh_token: 'mock-refresh-admin-token',
        token_type: 'bearer',
        user,
      };
    }

    if (email === 'staff@talkaor.com' && (!password || password === 'staff123' || password.length >= 6)) {
      const user: User = {
        id: 'user-staff-1',
        name: 'David Miller',
        email: 'staff@talkaor.com',
        role: 'CLIENT_STAFF',
        client_id: 'client-talkaor-01',
        is_active: true,
      };
      MockStorage.setCurrentUser(user);
      MockStorage.setAccessToken('mock-jwt-staff-token');
      MockStorage.setRefreshToken('mock-refresh-staff-token');
      return {
        access_token: 'mock-jwt-staff-token',
        refresh_token: 'mock-refresh-staff-token',
        token_type: 'bearer',
        user,
      };
    }

    if (foundUser) {
      if (!foundUser.is_active) {
        throw {
          success: false,
          message: 'This account has been deactivated. Please contact your administrator.',
          error_code: 'ACCOUNT_DEACTIVATED',
        };
      }
      const user: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        client_id: 'client-talkaor-01',
        is_active: foundUser.is_active,
      };
      MockStorage.setCurrentUser(user);
      MockStorage.setAccessToken(`mock-jwt-${user.role.toLowerCase()}-token`);
      MockStorage.setRefreshToken(`mock-refresh-${user.role.toLowerCase()}-token`);
      return {
        access_token: `mock-jwt-${user.role.toLowerCase()}-token`,
        refresh_token: `mock-refresh-${user.role.toLowerCase()}-token`,
        token_type: 'bearer',
        user,
      };
    }

    throw {
      success: false,
      message: 'Invalid email or password. Please use admin@talkaor.com or staff@talkaor.com to log in.',
      error_code: 'AUTH_INVALID_CREDENTIALS',
    };
  },

  async me(): Promise<User> {
    await simulateLatency(150);
    const user = MockStorage.getCurrentUser();
    if (!user) {
      throw {
        success: false,
        message: 'Authentication session expired.',
        error_code: 'TOKEN_EXPIRED',
      };
    }
    return user;
  },

  async refresh(): Promise<AuthResponse> {
    await simulateLatency(200);
    const user = MockStorage.getCurrentUser();
    if (!user) {
      throw {
        success: false,
        message: 'Session has ended. Please log in again.',
        error_code: 'TOKEN_EXPIRED',
      };
    }
    return {
      access_token: `mock-jwt-refreshed-${Date.now()}`,
      refresh_token: `mock-refresh-${Date.now()}`,
      token_type: 'bearer',
      user,
    };
  },

  async logout(): Promise<void> {
    await simulateLatency(100);
    MockStorage.setCurrentUser(null);
    MockStorage.setAccessToken(null);
    MockStorage.setRefreshToken(null);
    MockStorage.setAdminUnlocked(false);
  },

  async verifyAdminCode(code: string): Promise<{ success: boolean; message: string; unlocked_until: string; user_role?: string }> {
    await simulateLatency(300);
    const user = MockStorage.getCurrentUser();
    if (!user) {
      throw {
        success: false,
        message: 'Authentication session expired. Please log in first.',
        error_code: 'UNAUTHORIZED',
      };
    }

    if (user.role === 'CLIENT_STAFF' || user.role === 'STAFF') {
      throw {
        success: false,
        message: 'Staff users cannot access Admin Control. Administrator privilege required.',
        error_code: 'FORBIDDEN',
      };
    }

    const cleanCode = code.trim();
    const validCodes = ['TALKAOR-ADMIN-2026', 'admin2026', 'admin123', 'ADMIN123'];

    if (!validCodes.includes(cleanCode)) {
      throw {
        success: false,
        message: 'Invalid Administrator Access Code. Please check code and try again.',
        error_code: 'INVALID_ADMIN_CODE',
      };
    }

    MockStorage.setAdminUnlocked(true);
    MockStorage.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      level: 'INFO',
      service: 'Access Control',
      business_id: user.client_id,
      business_name: 'TalkAor Voice Wellness',
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      event: 'Admin Access Unlocked',
      status: 'SUCCESS',
      details: 'Administrator unlocked Admin Control Center using access code verification.',
      endpoint: '/api/v1/auth/verify-admin-code',
      http_method: 'POST',
      status_code: 200,
    });

    return {
      success: true,
      message: 'Administrator Access Granted. Controls unlocked.',
      unlocked_until: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      user_role: user.role,
    };
  },
};
