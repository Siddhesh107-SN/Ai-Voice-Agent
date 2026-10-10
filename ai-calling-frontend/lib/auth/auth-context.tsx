'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { LoginRequest, User, UserRole } from '@/lib/types';
import { MockStorage } from '@/lib/mock/storage';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusinessAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  adminUnlocked: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  unlockAdminControls: (code: string) => Promise<void>;
  lockAdminControls: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const token = MockStorage.getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const currentUser = await authApi.me();
      setUser(currentUser);
      setAdminUnlocked(MockStorage.getAdminUnlocked());
    } catch (err) {
      console.warn('Failed to load user session', err);
      MockStorage.setAccessToken(null);
      MockStorage.setRefreshToken(null);
      MockStorage.setCurrentUser(null);
      MockStorage.setAdminUnlocked(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      setUser(res.user);
      if (res.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setAdminUnlocked(false);
      MockStorage.setAdminUnlocked(false);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {}
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    if (targetRole === 'SUPER_ADMIN') {
      await login({ email: 'superadmin@talkaor.com', password: 'super123' });
    } else if (targetRole === 'BUSINESS_ADMIN' || targetRole === 'CLIENT_ADMIN') {
      await login({ email: 'admin@talkaor.com', password: 'admin123' });
    } else {
      await login({ email: 'staff@talkaor.com', password: 'staff123' });
    }
  };

  const unlockAdminControls = async (code: string) => {
    const res = await authApi.verifyAdminCode(code);
    if (res.success) {
      setAdminUnlocked(true);
      MockStorage.setAdminUnlocked(true);
    }
  };

  const lockAdminControls = () => {
    setAdminUnlocked(false);
    MockStorage.setAdminUnlocked(false);
  };

  const role = user?.role || null;
  const isAuthenticated = !!user;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isBusinessAdmin = role === 'BUSINESS_ADMIN' || role === 'CLIENT_ADMIN';
  const isAdmin = isBusinessAdmin || isSuperAdmin;
  const isStaff = role === 'STAFF' || role === 'CLIENT_STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated,
        isAdmin,
        isBusinessAdmin,
        isSuperAdmin,
        isStaff,
        adminUnlocked,
        login,
        logout,
        refreshUser,
        switchDemoRole,
        unlockAdminControls,
        lockAdminControls,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
