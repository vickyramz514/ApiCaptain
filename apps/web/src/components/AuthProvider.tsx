'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MeData, PublicUser } from '@apicaptain/types';
import {
  ApiClientError,
  deleteAccount,
  fetchMe,
  getStoredToken,
  login,
  loginWithGoogle,
  logout,
  register,
  setStoredToken,
} from '../lib/apiClient';

interface AuthContextValue {
  user: PublicUser | null;
  usage: MeData['usage'] | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  removeAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [usage, setUsage] = useState<MeData['usage'] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setUsage(null);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMe();
      setUser(data.user);
      setUsage(data.usage);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setStoredToken(null);
      }
      setUser(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      usage,
      loading,
      refresh,
      async signIn(email, password) {
        const data = await login({ email, password });
        setStoredToken(data.token);
        setUser(data.user);
        await refresh();
      },
      async signUp(email, password, name) {
        const data = await register({ email, password, name });
        setStoredToken(data.token);
        setUser(data.user);
        await refresh();
      },
      async signInWithGoogle(credential) {
        const data = await loginWithGoogle(credential);
        setStoredToken(data.token);
        setUser(data.user);
        await refresh();
      },
      async signOut() {
        try {
          await logout();
        } finally {
          setStoredToken(null);
          setUser(null);
          setUsage(null);
        }
      },
      async removeAccount(password) {
        await deleteAccount({ confirmation: 'DELETE', password });
        setStoredToken(null);
        setUser(null);
        setUsage(null);
      },
    }),
    [user, usage, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
