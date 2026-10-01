'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, UserProfile, ApiError } from './api-client';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check existing session on application mount
  useEffect(() => {
    let active = true;

    // Failsafe timeout: session verification must never block user indefinitely
    const failsafeTimer = setTimeout(() => {
      if (active) {
        setIsLoading(false);
      }
    }, 3500);

    const initAuth = async () => {
      const token = apiClient.getToken();
      if (!token) {
        clearTimeout(failsafeTimer);
        if (active) setIsLoading(false);
        return;
      }

      try {
        const profile = await apiClient.getMe();
        if (active) setUser(profile);
      } catch (err: any) {
        // Token expired or invalid
        apiClient.setToken(null);
        if (active) setUser(null);
      } finally {
        clearTimeout(failsafeTimer);
        if (active) setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      active = false;
      clearTimeout(failsafeTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
      router.push('/');
    } catch (err: any) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.register(email, password);
      setUser(response.user);
      router.push('/');
    } catch (err: any) {
      const message = err.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch (err) {
      // Even if network fails, clear local token
      apiClient.setToken(null);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        clearError,
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
