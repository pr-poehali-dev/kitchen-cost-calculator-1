import type { AppState } from './types';
import {
  initialState,
  defaultSettings,
  DEFAULT_MATERIAL_TYPES,
  DEFAULT_MATERIAL_CATEGORIES,
} from './initialState';
import { API_URLS } from '@/config/api';

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

const STATE_URL = API_URLS.appState;

// ── Статус сохранения ─────────────────────────────────────────────────────────
export type SaveStatus = 'saved' | 'pending' | 'error';
let saveStatus: SaveStatus = 'saved';
let hasPendingChanges = false; // есть ли несохранённые в БД изменения
export const saveStatusListeners: Set<(s: SaveStatus) => void> = new Set();

function setSaveStatus(s: SaveStatus) {
  saveStatus = s;
  saveStatusListeners.forEach(fn => fn(s));
}

export function getSaveStatus(): SaveStatus { return saveStatus; }
export function getHasPendingChanges(): boolean { return hasPendingChanges; }

// ── localStorage (только кэш) ─────────────────────────────────────────────────
function loadLocalCache(): AppState {
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

// ── Сохранение в БД ───────────────────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function setStoreToken(token: string) {
  currentToken = token;
}

async function doSaveToDb(state: AppState) {
  if (!currentToken) return;
  try {
    const res = await fetch(`${STATE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
      body: JSON.stringify({ state }),
    });
    if (res.ok) {
      hasPendingChanges = false;
      setSaveStatus('saved');
    } else {
      setSaveStatus('error');
    }
  } catch {
    setSaveStatus('error');
  }
}

function scheduleSaveToDb(state: AppState) {
  hasPendingChanges = true;
  setSaveStatus('pending');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    doSaveToDb(state);
  }, 1500);
}

// ── Загрузка из БД ────────────────────────────────────────────────────────────
export async function loadStateFromDb(token: string): Promise<AppState | null> {
  try {
    const res = await fetch(`${STATE_URL}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.state) return null;
    const dbState = parseAndMerge(JSON.stringify(data.state));
    saveLocalState(dbState);
    return dbState;
  } catch {
    return null;
  }
}

// ── Undo (история проектов) ───────────────────────────────────────────────────
const UNDO_LIMIT = 20;
type UndoSnapshot = { projects: AppState['projects']; activeProjectId: string | null };
const undoStack: UndoSnapshot[] = [];
export const undoListeners: Set<() => void> = new Set();

function notifyUndo() { undoListeners.forEach(fn => fn()); }

export function pushUndo(state: AppState) {
  undoStack.push({ projects: state.projects, activeProjectId: state.activeProjectId });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  notifyUndo();
}

export function canUndo(): boolean { return undoStack.length > 0; }

export function undoProjects(): boolean {
  const snap = undoStack.pop();
  if (!snap) return false;
  globalState = { ...globalState, projects: snap.projects, activeProjectId: snap.activeProjectId };
  saveLocalState(globalState);
  scheduleSaveToDb(globalState);
  listeners.forEach(fn => fn());
  notifyUndo();
  return true;
}

// ── Глобальный state ──────────────────────────────────────────────────────────
let globalState: AppState = loadLocalCache();
export const listeners: Set<() => void> = new Set();

export function setState(updater: (s: AppState) => AppState) {
  // Сохраняем снимок проектов перед изменением (для undo)
  pushUndo(globalState);
  globalState = updater(globalState);
  globalState = { ...globalState, savedAt: Date.now() };
  saveLocalState(globalState);
  scheduleSaveToDb(globalState);
  listeners.forEach(fn => fn());
}

export function forceSetGlobalState(state: AppState) {
  globalState = state;
  saveLocalState(state);
  hasPendingChanges = false;
  setSaveStatus('saved');
  listeners.forEach(fn => fn());
}

export function saveStateToDb() {
  doSaveToDb(globalState);
}

export function getGlobalState(): AppState {
  return globalState;
}