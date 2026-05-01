import { useState, useEffect } from 'react';
import { API_URLS } from '@/config/api';

export interface ManagerOption {
  id: number;
  login: string;
  full_name: string;
  poa_number: string;
  poa_date: string;
  display: string; // full_name если есть, иначе login
}

let cache: ManagerOption[] | null = null;

export function useManagers() {
  const [managers, setManagers] = useState<ManagerOption[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    const token = localStorage.getItem('kuhni_pro_token') || localStorage.getItem('kuhni_token') || '';
    if (!token) { setLoading(false); return; }

    fetch(API_URLS.admin, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(data => {
        const list: ManagerOption[] = (data.users || [])
          .filter((u: { status: string }) => u.status === 'active')
          .map((u: { id: number; login: string; full_name?: string; poa_number?: string; poa_date?: string }) => ({
            id: u.id,
            login: u.login,
            full_name: u.full_name || '',
            poa_number: u.poa_number || '',
            poa_date: u.poa_date || '',
            display: u.full_name?.trim() || u.login,
          }));
        cache = list;
        setManagers(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { managers, loading };
}

export function clearManagersCache() {
  cache = null;
}
