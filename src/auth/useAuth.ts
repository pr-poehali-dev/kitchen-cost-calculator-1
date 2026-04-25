import { useState, useEffect, useCallback } from 'react';

const AUTH_URL = 'https://functions.poehali.dev/b1d7d64b-25fc-4b8e-96d8-087b2255d942';
const TOKEN_KEY = 'kuhni_pro_token';

export interface AuthUser {
  id: number;
  login: string;
  role: 'admin' | 'user';
  plan: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const headers = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...extra,
  });

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) { setState({ status: 'unauthenticated' }); return; }
    try {
      const res = await fetch(`${AUTH_URL}/?action=me`, { headers: headers() });
      if (!res.ok) { localStorage.removeItem(TOKEN_KEY); setState({ status: 'unauthenticated' }); return; }
      const user: AuthUser = await res.json();
      setState({ status: 'authenticated', user });
    } catch {
      setState({ status: 'unauthenticated' });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (login: string, password: string): Promise<string | null> => {
    const res = await fetch(`${AUTH_URL}/?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Ошибка входа';
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ status: 'authenticated', user: { id: data.id, login: data.login, role: data.role, plan: data.plan } });
    return null;
  };

  const register = async (login: string, password: string): Promise<string | null> => {
    const res = await fetch(`${AUTH_URL}/?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Ошибка регистрации';
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ status: 'authenticated', user: { id: data.id, login: data.login, role: data.role, plan: data.plan } });
    return null;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ status: 'unauthenticated' });
  };

  return { state, login, register, logout, getToken };
}
