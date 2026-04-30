import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Client, ClientPhoto, ClientHistoryItem } from './types';
import { API_URLS } from '@/config/api';

const API = API_URLS.clients;

function getToken(): string {
  return localStorage.getItem('kuhni_pro_token') || '';
}

function url(action: string, extra = '') {
  return `${API}/?action=${action}${extra}`;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

export interface ClientsPage {
  clients: Client[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ClientsFilter {
  q?: string;
  status?: string;
  designer?: string;
  measurer?: string;
  date_from?: string;
  date_to?: string;
  delivery_from?: string;
  delivery_to?: string;
  amount_min?: string;
  amount_max?: string;
  sort?: string;
  sort_dir?: string;
}

export const PER_PAGE = 50;

// ── Список клиентов ────────────────────────────────────────────
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const buildQuery = (filter: ClientsFilter = {}, p = 1, perPage = PER_PAGE) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('per_page', String(perPage));
    if (filter.q) params.set('q', filter.q);
    if (filter.status && filter.status !== 'all') params.set('status', filter.status);
    if (filter.designer) params.set('designer', filter.designer);
    if (filter.measurer) params.set('measurer', filter.measurer);
    if (filter.date_from) params.set('date_from', filter.date_from);
    if (filter.date_to) params.set('date_to', filter.date_to);
    if (filter.delivery_from) params.set('delivery_from', filter.delivery_from);
    if (filter.delivery_to) params.set('delivery_to', filter.delivery_to);
    if (filter.amount_min) params.set('amount_min', filter.amount_min);
    if (filter.amount_max) params.set('amount_max', filter.amount_max);
    if (filter.sort) params.set('sort', filter.sort);
    if (filter.sort_dir) params.set('sort_dir', filter.sort_dir);
    return params.toString();
  };

  const fetchClients = useCallback(async (filter: ClientsFilter = {}, p = 1) => {
    setLoading(true);
    try {
      const qs = buildQuery(filter, p);
      const res = await fetch(`${API}/?action=list&${qs}`, { headers: authHeaders() });
      if (!res.ok) {
        toast.error('Не удалось загрузить клиентов', { description: `Ошибка ${res.status}` });
        return;
      }
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(data.page ?? p);
    } catch {
      toast.error('Ошибка сети', { description: 'Проверьте подключение к интернету' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузить все (для канбана и экспорта) — без фильтров, до 500
  const loadAll = useCallback(async (filter: ClientsFilter = {}) => {
    setLoading(true);
    try {
      const qs = buildQuery(filter, 1, 500);
      const res = await fetch(`${API}/?action=list&${qs}`, { headers: authHeaders() });
      if (!res.ok) {
        toast.error('Не удалось загрузить клиентов', { description: `Ошибка ${res.status}` });
        return;
      }
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
      setPages(1);
      setPage(1);
    } catch {
      toast.error('Ошибка сети', { description: 'Проверьте подключение к интернету' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const createClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> => {
    try {
      const res = await fetch(url('create'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ client }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Не удалось создать клиента', { description: data.error || `Ошибка ${res.status}` });
        return null;
      }
      await loadAll();
      return data.id;
    } catch {
      toast.error('Ошибка сети при создании клиента');
      return null;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(url('status', `&id=${id}`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error('Не удалось изменить статус');
        return;
      }
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: status as Client['status'] } : c));
    } catch {
      toast.error('Ошибка сети при изменении статуса');
    }
  };

  return { clients, total, pages, page, loading, fetchClients, loadAll, createClient, updateStatus };
}

// ── Один клиент ────────────────────────────────────────────────
export function useClient(id: string | null) {
  const [client, setClient] = useState<Client | null>(null);
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [history, setHistory] = useState<ClientHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(url('get', `&id=${id}`), { headers: authHeaders() });
      if (!res.ok) {
        toast.error('Не удалось загрузить карточку клиента', { description: `Ошибка ${res.status}` });
        return;
      }
      const data = await res.json();
      if (data.client) {
        setClient(data.client);
        setPhotos(data.photos || []);
        setHistory(data.history || []);
      }
    } catch {
      toast.error('Ошибка сети', { description: 'Не удалось загрузить данные клиента' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async (updated: Client): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(url('update', `&id=${updated.id}`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ client: updated }),
      });
      if (res.ok) {
        setClient(updated);
        await load();
        return true;
      }
      const data = await res.json().catch(() => ({}));
      toast.error('Не удалось сохранить изменения', { description: data.error || `Ошибка ${res.status}` });
      return false;
    } catch {
      toast.error('Ошибка сети', { description: 'Изменения не сохранились — проверьте подключение' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!id) return;
    try {
      const res = await fetch(url('status', `&id=${id}`), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error('Не удалось изменить статус');
        return;
      }
      setClient(prev => prev ? { ...prev, status: status as Client['status'] } : prev);
      await load();
    } catch {
      toast.error('Ошибка сети при изменении статуса');
    }
  };

  const uploadPhoto = async (file: File, category: 'measure' | 'render' | 'done'): Promise<boolean> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async e => {
        const b64 = (e.target?.result as string).split(',')[1];
        try {
          const res = await fetch(url('upload_photo', `&id=${id}`), {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ data: b64, category, name: file.name, content_type: file.type }),
          });
          if (res.ok) {
            await load();
          } else {
            toast.error('Не удалось загрузить фото');
          }
          resolve(res.ok);
        } catch {
          toast.error('Ошибка сети при загрузке фото');
          resolve(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(url('delete_photo', `&photo_id=${photoId}`), { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        toast.error('Не удалось удалить фото');
      }
    } catch {
      toast.error('Ошибка сети при удалении фото');
    }
  };

  return { client, photos, history, loading, saving, load, save, changeStatus, uploadPhoto, deletePhoto };
}