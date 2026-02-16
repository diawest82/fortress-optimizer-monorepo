'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  tier: 'free' | 'signup' | 'pro' | 'team' | 'enterprise';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  jwtToken: string | null;
  apiKey: string | null;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedApiKey = localStorage.getItem('api_key');

        if (storedToken) {
          setJwtToken(storedToken);
          setApiKey(storedApiKey);

          // Fetch user profile to verify token is valid
          try {
            const profile = await apiClient.getProfile();
            setUser(profile as User);
          } catch {
            // Token is invalid, clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('api_key');
            setJwtToken(null);
            setApiKey(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const signup = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const response = (await apiClient.signup(email, password, name)) as any;

      // Store auth credentials
      localStorage.setItem('auth_token', response.jwt_token);
      localStorage.setItem('api_key', response.api_key);

      setJwtToken(response.jwt_token);
      setApiKey(response.api_key);
      setUser({
        user_id: response.user_id,
        email: response.email,
        name: response.name || email.split('@')[0],
        tier: response.tier,
        created_at: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = (await apiClient.login(email, password)) as any;

      // Store auth credentials
      localStorage.setItem('auth_token', response.jwt_token);
      localStorage.setItem('api_key', response.api_key);

      setJwtToken(response.jwt_token);
      setApiKey(response.api_key);
      setUser({
        user_id: response.user_id,
        email: response.email,
        name: response.name || email.split('@')[0],
        tier: response.tier,
        created_at: response.created_at,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('api_key');
    setJwtToken(null);
    setApiKey(null);
    setUser(null);
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    jwtToken,
    apiKey,
    signup,
    login,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
