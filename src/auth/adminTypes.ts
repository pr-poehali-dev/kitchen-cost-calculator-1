export interface UserRow {
  id: number;
  login: string;
  role: string;
  status: string;
  plan: string;
  created_at: string;
  last_login: string | null;
  full_name: string;
  poa_number: string;
  poa_date: string;
}

export type Modal =
  | { type: 'create' }
  | { type: 'password'; user: UserRow }
  | { type: 'delete'; user: UserRow }
  | { type: 'profile'; user: UserRow }
  | null;

export const PLANS = ['free', 'pro', 'enterprise'];
export const STATUSES = ['active', 'banned'];

import { API_URLS } from '@/config/api';

const ADMIN_URL = API_URLS.admin;

export function adminUrl() {
  return `${ADMIN_URL}`;
}

export function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export function fmtDate(s: string | null) {
  if (!s || s === 'None') return '—';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
