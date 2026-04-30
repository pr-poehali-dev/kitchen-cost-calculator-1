import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Client, ClientPhoto, ClientHistoryItem } from './types';

const API = 'https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7';

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

// ── Список клиентов ────────────────────────────────────────────
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const PER_PAGE = 100;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(url('list', `&page=${p}&per_page=${PER_PAGE}`), { headers: authHeaders() });
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

  // Загрузить все страницы (для фильтрации/поиска на фронтенде — до 500 клиентов)
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url('list', `&page=1&per_page=500`), { headers: authHeaders() });
      if (!res.ok) {
        toast.error('Не удалось загрузить клиентов', { description: `Ошибка ${res.status}` });
        return;
      }
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setPage(1);
    } catch {
      toast.error('Ошибка сети', { description: 'Проверьте подключение к интернету' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  return { clients, total, pages, page, loading, load, loadAll, createClient, updateStatus };
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