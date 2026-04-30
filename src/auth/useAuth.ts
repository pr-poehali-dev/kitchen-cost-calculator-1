import { useState, useEffect, useCallback } from 'react';
import { API_URLS } from '@/config/api';

const AUTH_URL = API_URLS.auth;
const TOKEN_KEY = 'kuhni_pro_token';
const TOKEN_EXPIRY_KEY = 'kuhni_pro_token_expiry';
const SESSION_DAYS = 2;

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

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

function isSessionExpired(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return false; // нет срока = сессионный, не истёк
  return Date.now() > parseInt(expiry, 10);
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) { setState({ status: 'unauthenticated' }); return; }

    if (isSessionExpired()) {
      clearSession();
      setState({ status: 'unauthenticated' });
      return;
    }

    try {
      const res = await fetch(`${AUTH_URL}/?action=me`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        clearSession();
        setState({ status: 'unauthenticated' });
        return;
      }
      const user: AuthUser = await res.json();
      setState({ status: 'authenticated', user });
    } catch {
      setState({ status: 'unauthenticated' });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (loginStr: string, password: string, remember = false): Promise<string | null> => {
    const res = await fetch(`${AUTH_URL}/?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginStr, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Ошибка входа';

    localStorage.setItem(TOKEN_KEY, data.token);
    if (remember) {
      const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
    } else {
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }

    setState({ status: 'authenticated', user: { id: data.id, login: data.login, role: data.role, plan: data.plan } });
    return null;
  };

  const logout = () => {
    clearSession();
    setState({ status: 'unauthenticated' });
  };

  return { state, login, logout, getToken };
}