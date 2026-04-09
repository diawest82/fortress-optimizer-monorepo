'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import type {
  UserProfile,
  SignupResponse,
  LoginResponse,
} from '@/lib/api-client';

interface AuthContextType {
  user: UserProfile | null;
  signup: (email: string, password: string, name?: string) => Promise<SignupResponse | null>;
  login: (email: string, password: string) => Promise<LoginResponse | null>;
  logout: () => void;
  getProfile: () => Promise<UserProfile | null>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    // Try to restore session on mount
    if (!auth.user) {
      auth.getProfile().catch(() => {
        // User not authenticated
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe fallback during SSR
    if (typeof window === 'undefined') {
      return {
        user: null,
        signup: async () => { throw new Error('Auth not available during SSR'); },
        login: async () => { throw new Error('Auth not available during SSR'); },
        logout: () => {},
        getProfile: async () => null,
        loading: false,
        error: null,
      } as AuthContextType;
    }
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
