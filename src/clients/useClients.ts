import { useState, useCallback, useEffect } from 'react';
import type { Client, ClientPhoto, ClientHistoryItem } from './types';

const API = 'https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7';

function getToken(): string {
  return localStorage.getItem('kuhni_pro_token') || '';
}

function url(action: string, extra = '') {
  return `${API}/?action=${action}&token=${encodeURIComponent(getToken())}${extra}`;
}

// ── Список клиентов ────────────────────────────────────────────
export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url('list'));
      const data = await res.json();
      setClients(data.clients || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createClient = async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> => {
    const res = await fetch(url('create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    await load();
    return data.id;
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(url('status', `&id=${id}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: status as Client['status'] } : c));
  };

  return { clients, loading, load, createClient, updateStatus };
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
      const res = await fetch(url('get', `&id=${id}`));
      const data = await res.json();
      if (data.client) {
        setClient(data.client);
        setPhotos(data.photos || []);
        setHistory(data.history || []);
      }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: updated }),
      });
      if (res.ok) {
        setClient(updated);
        await load();
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!id) return;
    await fetch(url('status', `&id=${id}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setClient(prev => prev ? { ...prev, status: status as Client['status'] } : prev);
    await load();
  };

  const uploadPhoto = async (file: File, category: 'measure' | 'render' | 'done'): Promise<boolean> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = async e => {
        const b64 = (e.target?.result as string).split(',')[1];
        const res = await fetch(url('upload_photo', `&id=${id}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: b64,
            category,
            name: file.name,
            content_type: file.type,
          }),
        });
        if (res.ok) await load();
        resolve(res.ok);
      };
      reader.readAsDataURL(file);
    });
  };

  const deletePhoto = async (photoId: string) => {
    await fetch(url('delete_photo', `&photo_id=${photoId}`), { method: 'POST' });
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  return { client, photos, history, loading, saving, load, save, changeStatus, uploadPhoto, deletePhoto };
}
