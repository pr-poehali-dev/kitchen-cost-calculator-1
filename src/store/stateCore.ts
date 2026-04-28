import type { AppState } from './types';
import {
  initialState,
  defaultSettings,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_MATERIAL_CATEGORIES,
} from './initialState';

const STORAGE_KEY = 'kuhni-pro-state-v4';
const STORAGE_KEY_PREV = 'kuhni-pro-state-v3';

export const DEFAULT_VISIBLE_COLUMNS_CORE = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'] as const;

function migrateProjects(projects: AppState['projects']): AppState['projects'] {
  return projects.map(p => ({
    ...p,
    blocks: p.blocks.map(b => {
      let cols = b.visibleColumns?.length ? b.visibleColumns : DEFAULT_VISIBLE_COLUMNS_CORE.slice() as typeof b.visibleColumns;
      if (!cols.includes('total')) {
        const priceIdx = cols.indexOf('price');
        cols = priceIdx >= 0
          ? [...cols.slice(0, priceIdx + 1), 'total', ...cols.slice(priceIdx + 1)]
          : [...cols, 'total'];
      }
      if (!cols.includes('baseprice')) {
        const qtyIdx = cols.indexOf('qty');
        cols = qtyIdx >= 0
          ? [...cols.slice(0, qtyIdx + 1), 'baseprice', ...cols.slice(qtyIdx + 1)]
          : [...cols, 'baseprice'];
      }
      return { ...b, allowedTypeIds: b.allowedTypeIds ?? [], visibleColumns: cols };
    }),
  }));
}

function isValidMaterialTypes(arr: unknown[]): boolean {
  return arr.length > 0 &&
    typeof arr[0] === 'object' &&
    arr[0] !== null &&
    'id' in (arr[0] as object);
}

function mergeById<T extends { id: string }>(userList: T[] | undefined, defaults: T[]): T[] {
  const existing = userList || [];
  const existingIds = new Set(existing.map(x => x.id));
  const toAdd = defaults.filter(x => !existingIds.has(x.id));
  return [...existing, ...toAdd];
}

function parseAndMerge(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState>;

  const validTypes = parsed.settings?.materialTypes?.length &&
    isValidMaterialTypes(parsed.settings.materialTypes as unknown[])
    ? parsed.settings.materialTypes
    : DEFAULT_MATERIAL_TYPES;

  const migratedExpenses = parsed.expenses
    ? parsed.expenses.map(e => ({ ...e, enabled: e.enabled !== false }))
    : initialState.expenses;

  return {
    manufacturers:   mergeById(parsed.manufacturers,  initialState.manufacturers),
    vendors:         mergeById(parsed.vendors,         initialState.vendors),
    materials:       mergeById(parsed.materials,       initialState.materials),
    services:        parsed.services?.length ? parsed.services : initialState.services,
    expenseGroups:   mergeById(parsed.expenseGroups,   initialState.expenseGroups),
    expenses:        migratedExpenses,
    settings: {
      ...defaultSettings,
      ...(parsed.settings || {}),
      materialTypes: validTypes,
      materialCategories: parsed.settings?.materialCategories?.length
        ? parsed.settings.materialCategories
        : DEFAULT_MATERIAL_CATEGORIES,
    },
    projects:        parsed.projects ? migrateProjects(parsed.projects) : initialState.projects,
    activeProjectId: parsed.activeProjectId ?? initialState.activeProjectId,
    templates:       parsed.templates  ?? initialState.templates,
    savedBlocks:     parsed.savedBlocks ?? initialState.savedBlocks,
    savedAt:         parsed.savedAt,
  };
}

const STATE_URL = 'https://functions.poehali.dev/a257bd1a-a3a1-40e0-95b5-bbd561a371e4';

function loadLocalState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return parseAndMerge(saved);
  } catch (e) { void e; }
  try {
    const prev = localStorage.getItem(STORAGE_KEY_PREV);
    if (prev) return parseAndMerge(prev);
  } catch (e) { void e; }
  return initialState;
}

export function saveLocalState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { void e; }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function setStoreToken(token: string) {
  currentToken = token;
}

function scheduleSaveToDb(state: AppState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!currentToken) return;
    fetch(`${STATE_URL}?token=${encodeURIComponent(currentToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }).catch(() => void 0);
  }, 1500);
}

// Возвращает state из БД только если он свежее localStorage, иначе null
export async function loadStateFromDb(token: string): Promise<AppState | null> {
  try {
    const res = await fetch(`${STATE_URL}?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.state) return null;
    const dbState = parseAndMerge(JSON.stringify(data.state));

    // Сравниваем с тем что в localStorage
    const localState = loadLocalState();
    const localTs = localState.savedAt ?? 0;
    const dbTs = dbState.savedAt ?? 0;

    // Берём более свежий
    if (dbTs >= localTs) {
      saveLocalState(dbState);
      return dbState;
    } else {
      // localStorage свежее — не перезаписываем, но вернём null чтобы App.tsx сохранил локальный в БД
      return null;
    }
  } catch {
    return null;
  }
}

let globalState: AppState = loadLocalState();
export const listeners: Set<() => void> = new Set();

export function setState(updater: (s: AppState) => AppState) {
  globalState = updater(globalState);
  // Проставляем метку времени при каждом изменении
  globalState = { ...globalState, savedAt: Date.now() };
  saveLocalState(globalState);
  scheduleSaveToDb(globalState);
  listeners.forEach(fn => fn());
}

export function forceSetGlobalState(state: AppState) {
  globalState = state;
  saveLocalState(state);
  scheduleSaveToDb(state);
  listeners.forEach(fn => fn());
}

export function saveStateToDb() {
  if (!currentToken) return;
  fetch(`${STATE_URL}?token=${encodeURIComponent(currentToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: globalState }),
  }).catch(() => void 0);
}

export function getGlobalState(): AppState {
  return globalState;
}
