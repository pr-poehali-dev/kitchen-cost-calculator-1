import type { SavedBlock, CalcRow, CalcBlock, AppState, BlockAssembly } from '../types';
import { setState } from '../stateCore';
import { DEFAULT_VISIBLE_COLUMNS } from '../initialState';

// ── Сохранённые блоки ─────────────────────────────────────────
export const createSavedBlock = (name: string) => {
  const id = `sb_${Date.now()}${Math.random().toString(36).slice(2)}`;
  const block: SavedBlock = {
    id, name,
    allowedTypeIds: [],
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
    rows: [],
    createdAt: new Date().toISOString().split('T')[0],
  };
  setState(s => ({ ...s, savedBlocks: [...(s.savedBlocks || []), block] }));
  return id;
};

export const updateSavedBlock = (blockId: string, data: Partial<SavedBlock>) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b => b.id === blockId ? { ...b, ...data } : b),
  }));
};

export const deleteSavedBlock = (blockId: string) => {
  setState(s => ({ ...s, savedBlocks: (s.savedBlocks || []).filter(b => b.id !== blockId) }));
};

export const reorderSavedBlocks = (orderedIds: string[]) => {
  setState(s => {
    const map = new Map((s.savedBlocks || []).map(b => [b.id, b]));
    const reordered = orderedIds.map(id => map.get(id)).filter((b): b is SavedBlock => !!b);
    return { ...s, savedBlocks: reordered };
  });
};

// ── Строки сохранённых блоков ─────────────────────────────────
export const addSavedBlockRow = (blockId: string) => {
  const id = `r${Date.now()}${Math.random().toString(36).slice(2)}`;
  const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
    ),
  }));
};

export const updateSavedBlockRow = (blockId: string, rowId: string, data: Partial<CalcRow>) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
        : b
    ),
  }));
};

export const deleteSavedBlockRow = (blockId: string, rowId: string) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
    ),
  }));
};

// ── Сборки (assemblies) ───────────────────────────────────────
export const addAssembly = (blockId: string, name: string) => {
  const id = `asm_${Date.now()}`;
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: [...(b.assemblies || []), { id, name, rows: [] }] }
        : b
    ),
  }));
  return id;
};

export const updateAssembly = (blockId: string, assemblyId: string, data: Partial<BlockAssembly>) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: (b.assemblies || []).map(a => a.id === assemblyId ? { ...a, ...data } : a) }
        : b
    ),
  }));
};

export const deleteAssembly = (blockId: string, assemblyId: string) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: (b.assemblies || []).filter(a => a.id !== assemblyId) }
        : b
    ),
  }));
};

export const addAssemblyRow = (blockId: string, assemblyId: string) => {
  const id = `r${Date.now()}${Math.random().toString(36).slice(2)}`;
  const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: (b.assemblies || []).map(a =>
            a.id === assemblyId ? { ...a, rows: [...a.rows, newRow] } : a
          )}
        : b
    ),
  }));
};

export const updateAssemblyRow = (blockId: string, assemblyId: string, rowId: string, data: Partial<CalcRow>) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: (b.assemblies || []).map(a =>
            a.id === assemblyId
              ? { ...a, rows: a.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
              : a
          )}
        : b
    ),
  }));
};

export const deleteAssemblyRow = (blockId: string, assemblyId: string, rowId: string) => {
  setState(s => ({
    ...s,
    savedBlocks: (s.savedBlocks || []).map(b =>
      b.id === blockId
        ? { ...b, assemblies: (b.assemblies || []).map(a =>
            a.id === assemblyId ? { ...a, rows: a.rows.filter(r => r.id !== rowId) } : a
          )}
        : b
    ),
  }));
};

// ── Вставка в проект ──────────────────────────────────────────
export const insertSavedBlockToProject = (
  projectId: string,
  savedBlockId: string,
  state: AppState,
  resolveRows: (rows: CalcRow[]) => CalcRow[],
  assemblyId?: string
) => {
  const sb = (state.savedBlocks || []).find(b => b.id === savedBlockId);
  if (!sb) return;
  const id = `b${Date.now()}`;
  const sourceRows = assemblyId
    ? (sb.assemblies || []).find(a => a.id === assemblyId)?.rows || sb.rows
    : sb.rows;
  const assemblyName = assemblyId
    ? (sb.assemblies || []).find(a => a.id === assemblyId)?.name
    : undefined;
  const newBlock: CalcBlock = {
    id,
    name: assemblyName ? `${sb.name} — ${assemblyName}` : sb.name,
    allowedTypeIds: sb.allowedTypeIds,
    visibleColumns: sb.visibleColumns,
    rows: resolveRows(sourceRows),
  };
  setState(s => ({
    ...s,
    projects: s.projects.map(p => p.id === projectId ? { ...p, blocks: [...p.blocks, newBlock] } : p),
  }));
};