import { useState, useEffect } from 'react';
import type { Material, Manufacturer, Vendor } from '@/store/types';
import { API_URLS } from '@/config/api';

export interface CatalogState {
  manufacturers: Manufacturer[];
  vendors: Vendor[];
  materials: Material[];
  loading: boolean;
  synced: boolean;
}

type Listener = () => void;

// ── Глобальный кеш каталога (один на всё приложение) ──────────
let _cache: CatalogState = {
  manufacturers: [],
  vendors: [],
  materials: [],
  loading: false,
  synced: false,
};
const _listeners = new Set<Listener>();
let _token: string | null = null;

function notify() {
  _listeners.forEach(l => l());
}

function setCache(patch: Partial<CatalogState>) {
  _cache = { ..._cache, ...patch };
  notify();
}

export function setCatalogToken(token: string) {
  _token = token;
}

export function getCatalogSnapshot(): CatalogState {
  return _cache;
}

function authHeaders(): Record<string, string> {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

// ── Загрузка всего каталога ───────────────────────────────────
export async function loadCatalog(): Promise<void> {
  setCache({ loading: true });
  try {
    const res = await fetch(`${API_URLS.catalog}/?action=all`, { headers: authHeaders() });
    const data = await res.json();
    setCache({
      manufacturers: data.manufacturers || [],
      vendors: data.vendors || [],
      materials: data.materials || [],
      loading: false,
      synced: true,
    });
  } catch {
    setCache({ loading: false });
  }
}

// ── Синхронизация из AppState в БД (только один раз при первом входе) ──
export async function syncCatalogFromAppState(
  manufacturers: Manufacturer[],
  vendors: Vendor[],
  materials: Material[],
): Promise<void> {
  if (!_token) return;
  // Производители и поставщики — небольшие, отправляем сразу
  await fetch(`${API_URLS.catalog}/?action=sync_all`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ manufacturers, vendors, materials: [] }),
  });
  // Материалы — чанками по 100
  await bulkUpsertMaterials(materials, 100);
  setCache({ manufacturers, vendors, materials, synced: true });
}

// ── Производители ─────────────────────────────────────────────
export async function addManufacturer(data: Omit<Manufacturer, 'id'>): Promise<Manufacturer> {
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_manufacturer`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ manufacturer: data }),
  });
  const json = await res.json();
  const mfr: Manufacturer = json.manufacturer;
  setCache({ manufacturers: [..._cache.manufacturers, mfr] });
  return mfr;
}

export async function updateManufacturer(id: string, data: Partial<Manufacturer>): Promise<void> {
  const existing = _cache.manufacturers.find(m => m.id === id);
  if (!existing) return;
  const merged = { ...existing, ...data };
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_manufacturer`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ manufacturer: merged }),
  });
  const json = await res.json();
  setCache({ manufacturers: _cache.manufacturers.map(m => m.id === id ? json.manufacturer : m) });
}

export async function deleteManufacturer(id: string): Promise<void> {
  await fetch(`${API_URLS.catalog}/?action=delete_manufacturer&id=${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  setCache({ manufacturers: _cache.manufacturers.filter(m => m.id !== id) });
}

// ── Поставщики ────────────────────────────────────────────────
export async function addVendor(data: Omit<Vendor, 'id'>): Promise<Vendor> {
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_vendor`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor: data }),
  });
  const json = await res.json();
  const vendor: Vendor = json.vendor;
  setCache({ vendors: [..._cache.vendors, vendor] });
  return vendor;
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<void> {
  const existing = _cache.vendors.find(v => v.id === id);
  if (!existing) return;
  const merged = { ...existing, ...data };
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_vendor`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor: merged }),
  });
  const json = await res.json();
  setCache({ vendors: _cache.vendors.map(v => v.id === id ? json.vendor : v) });
}

export async function deleteVendor(id: string): Promise<void> {
  await fetch(`${API_URLS.catalog}/?action=delete_vendor&id=${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  setCache({ vendors: _cache.vendors.filter(v => v.id !== id) });
}

// ── Материалы ─────────────────────────────────────────────────
export async function addMaterial(data: Omit<Material, 'id'>): Promise<Material> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_material`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ material: { ...data, priceUpdatedAt: today } }),
  });
  const json = await res.json();
  const mat: Material = json.material;
  setCache({ materials: [..._cache.materials, mat] });
  return mat;
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<void> {
  const existing = _cache.materials.find(m => m.id === id);
  if (!existing) return;
  const merged = { ...existing, ...data };
  if (data.basePrice !== undefined && data.basePrice !== existing.basePrice) {
    const today = new Date().toISOString().slice(0, 10);
    merged.priceHistory = [{ date: today, price: existing.basePrice }, ...(existing.priceHistory || [])].slice(0, 20);
    merged.priceUpdatedAt = today;
  }
  const res = await fetch(`${API_URLS.catalog}/?action=upsert_material`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ material: merged }),
  });
  const json = await res.json();
  setCache({ materials: _cache.materials.map(m => m.id === id ? json.material : m) });
}

export async function deleteMaterial(id: string): Promise<void> {
  await fetch(`${API_URLS.catalog}/?action=delete_material&id=${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  setCache({ materials: _cache.materials.filter(m => m.id !== id) });
}

export async function bulkDeleteMaterials(ids: string[]): Promise<void> {
  if (!ids.length) return;
  // Удаляем чанками по 500 чтобы не превысить лимит URL/body
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await fetch(`${API_URLS.catalog}/?action=bulk_delete_materials`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: chunk }),
    });
  }
  const deleted = new Set(ids);
  setCache({ materials: _cache.materials.filter(m => !deleted.has(m.id)) });
}

export async function duplicateMaterial(id: string): Promise<void> {
  const src = _cache.materials.find(m => m.id === id);
  if (!src) return;
  const today = new Date().toISOString().slice(0, 10);
  await addMaterial({ ...src, name: `${src.name} (копия)`, priceUpdatedAt: today, priceHistory: [] });
}

export async function bulkUpsertMaterials(materials: Material[], chunkSize = 100): Promise<void> {
  if (!materials.length) return;
  for (let i = 0; i < materials.length; i += chunkSize) {
    const chunk = materials.slice(i, i + chunkSize);
    await fetch(`${API_URLS.catalog}/?action=bulk_upsert_materials`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials: chunk }),
    });
  }
  await loadCatalog();
}

export async function updatePricesBatch(
  updates: Array<{ article?: string; materialId?: string; variants: Array<{ variantId: string; basePrice: number; size?: string; thickness?: number }> }>
): Promise<number> {
  const res = await fetch(`${API_URLS.catalog}/?action=update_prices_batch`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  const json = await res.json();
  await loadCatalog();
  return json.updated || 0;
}

export async function bulkDeleteByArticlePrefix(prefix: string): Promise<number> {
  const res = await fetch(`${API_URLS.catalog}/?action=bulk_delete_by_article_prefix`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix }),
  });
  const json = await res.json();
  setCache({ materials: _cache.materials.filter(m => !m.article?.startsWith(prefix)) });
  return json.deleted || 0;
}

// ── React-хук ─────────────────────────────────────────────────
export function useCatalog(): CatalogState {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return _cache;
}

export const catalogCache = {
  get: (): CatalogState => _cache,
};