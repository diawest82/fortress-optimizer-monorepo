'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('API Error:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error, apiClient };
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const { execute, loading, error } = useApi();

  const signup = useCallback(async (email: string, password: string) => {
    const result = await execute(() => apiClient.signup(email, password));
    if (result) {
      setUser({ email, id: result.user_id });
      return result;
    }
    return null;
  }, [execute]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await execute(() => apiClient.login(email, password));
    if (result) {
      setUser({ email, id: result.user_id });
      return result;
    }
    return null;
  }, [execute]);

  const logout = useCallback(() => {
    apiClient.clearCredentials();
    setUser(null);
  }, []);

  const getProfile = useCallback(async () => {
    const result = await execute(() => apiClient.getProfile());
    if (result) {
      setUser(result);
    }
    return result;
  }, [execute]);

  return { user, setUser, signup, login, logout, getProfile, loading, error };
}
