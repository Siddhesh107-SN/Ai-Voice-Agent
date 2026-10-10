import { apiClient, isMockMode } from './client';
import { mockAuthService } from '@/lib/mock/auth';
import { MockStorage } from '@/lib/mock/storage';
import { AuthResponse, LoginRequest, User } from '@/lib/types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (isMockMode()) {
      return mockAuthService.login(credentials);
    }
    const res = await apiClient<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requiresAuth: false,
    });

    // Normalize response in case wrapped in ApiResponse envelope
    const authData: AuthResponse = res.data?.tokens ? {
      access_token: res.data.tokens.access_token,
      refresh_token: res.data.tokens.refresh_token,
      token_type: res.data.tokens.token_type || 'bearer',
      user: res.data.user
    } : (res.data || res);

    if (authData?.access_token) {
      MockStorage.setAccessToken(authData.access_token);
    }
    if (authData?.refresh_token) {
      MockStorage.setRefreshToken(authData.refresh_token);
    }
    if (authData?.user) {
      MockStorage.setCurrentUser(authData.user);
    }

    return authData;
  },

  async me(): Promise<User> {
    if (isMockMode()) {
      return mockAuthService.me();
    }
    const res = await apiClient<any>('/api/v1/auth/me', {
      method: 'GET',
    });
    const user: User = res.data || res;
    if (user?.id) {
      MockStorage.setCurrentUser(user);
    }
    return user;
  },

  async refresh(): Promise<AuthResponse> {
    if (isMockMode()) {
      return mockAuthService.refresh();
    }
    const refreshToken = MockStorage.getRefreshToken();
    const res = await apiClient<any>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      requiresAuth: false,
    });
    const tokens = res.data || res;
    if (tokens?.access_token) {
      MockStorage.setAccessToken(tokens.access_token);
    }
    return tokens;
  },

  async logout(): Promise<void> {
    if (isMockMode()) {
      return mockAuthService.logout();
    }
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout to guarantee clean local state
    } finally {
      // Clear all tokens & session storage to guarantee no token or state leaks
      MockStorage.setAccessToken(null);
      MockStorage.setRefreshToken(null);
      MockStorage.setCurrentUser(null);
      MockStorage.setAdminUnlocked(false);
    }
  },

  async verifyAdminCode(code: string): Promise<{ success: boolean; message: string; unlocked_until?: string; user_role?: string }> {
    if (isMockMode()) {
      return mockAuthService.verifyAdminCode(code);
    }
    const res = await apiClient<any>(
      '/api/v1/auth/verify-admin-code',
      {
        method: 'POST',
        body: JSON.stringify({ access_code: code }),
      }
    );
    const result = res.data || res;
    if (result?.success) {
      MockStorage.setAdminUnlocked(true);
    }
    return result;
  },
};
