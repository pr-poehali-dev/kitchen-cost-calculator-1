import type {
  AppState, Project, CalcBlock, CalcRow, ServiceBlock, ServiceRow, Material, Service
} from '../types';
import { DEFAULT_VISIBLE_COLUMNS } from '../initialState';
import { setState } from '../stateCore';

const updateProject = (
  projectId: string,
  updater: (p: Project) => Project,
  opts: { pushUndo?: boolean } = {}
) => {
  setState(s => ({
    ...s,
    projects: s.projects.map(p => p.id === projectId ? updater(p) : p),
  }), opts);
};

// ── Проекты ───────────────────────────────────────────────────
export const createProject = () => {
  const id = `p${Date.now()}${Math.random().toString(36).slice(2)}`;
  const newProject: Project = {
    id, client: '', object: 'Новый проект', address: '', phone: '',
    messenger: 'WhatsApp',
    createdAt: new Date().toISOString().split('T')[0],
    blocks: [{ id: `b${Date.now()}${Math.random().toString(36).slice(2)}`, name: 'Корпус', allowedTypeIds: [], visibleColumns: DEFAULT_VISIBLE_COLUMNS, rows: [] }],
    serviceBlocks: [],
  };
  setState(s => ({ ...s, projects: [...s.projects, newProject], activeProjectId: id }));
  return id;
};

export const deleteProject = (projectId: string) => {
  setState(s => {
    const remaining = s.projects.filter(p => p.id !== projectId);
    return { ...s, projects: remaining, activeProjectId: remaining.length > 0 ? remaining[remaining.length - 1].id : null };
  });
};

export const duplicateProject = (projectId: string, state: AppState) => {
  const id = `p${Date.now()}${Math.random().toString(36).slice(2)}`;
  setState(s => {
    const src = s.projects.find(p => p.id === projectId);
    if (!src) return s;
    const cloned: Project = {
      ...src, id,
      object: `${src.object} (копия)`,
      createdAt: new Date().toISOString().split('T')[0],
      blocks: src.blocks.map(b => ({
        ...b,
        id: `b${Date.now()}${Math.random().toString(36).slice(2)}`,
        rows: b.rows.map(r => ({ ...r, id: `r${Date.now()}${Math.random().toString(36).slice(2)}` })),
      })),
      serviceBlocks: src.serviceBlocks.map(sb => ({
        ...sb,
        id: `sb${Date.now()}${Math.random().toString(36).slice(2)}`,
        rows: sb.rows.map(r => ({ ...r, id: `sr${Date.now()}${Math.random().toString(36).slice(2)}` })),
      })),
    };
    return { ...s, projects: [...s.projects, cloned], activeProjectId: id };
  });
  void state;
};

export const updateProjectInfo = (projectId: string, data: Partial<Project>) => {
  setState(s => ({
    ...s,
    projects: s.projects.map(p => p.id === projectId ? { ...p, ...data } : p),
  }));
};

// ── Блоки материалов ──────────────────────────────────────────
export const addBlock = (projectId: string) => {
  const id = `b${Date.now()}${Math.random().toString(36).slice(2)}`;
  updateProject(projectId, p => ({
    ...p,
    blocks: [...p.blocks, { id, name: 'Новый блок', allowedTypeIds: [], visibleColumns: DEFAULT_VISIBLE_COLUMNS, rows: [] }],
  }));
};

export const updateBlock = (projectId: string, blockId: string, data: Partial<CalcBlock>) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...data } : b),
  }));
};

export const deleteBlock = (projectId: string, blockId: string) => {
  updateProject(projectId, p => ({ ...p, blocks: p.blocks.filter(b => b.id !== blockId) }));
};

export const duplicateBlock = (projectId: string, blockId: string) => {
  updateProject(projectId, p => {
    const src = p.blocks.find(b => b.id === blockId);
    if (!src) return p;
    const cloned: CalcBlock = {
      ...src,
      id: `b${Date.now()}${Math.random().toString(36).slice(2)}`,
      name: `${src.name} (копия)`,
      rows: src.rows.map(r => ({ ...r, id: `r${Date.now()}${Math.random().toString(36).slice(2)}` })),
    };
    const idx = p.blocks.findIndex(b => b.id === blockId);
    const blocks = [...p.blocks];
    blocks.splice(idx + 1, 0, cloned);
    return { ...p, blocks };
  });
};

export const moveBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
  updateProject(projectId, p => {
    const arr = [...p.blocks];
    const idx = arr.findIndex(b => b.id === blockId);
    if (idx < 0) return p;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= arr.length) return p;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    return { ...p, blocks: arr };
  });
};

export const reorderBlocks = (projectId: string, orderedIds: string[]) => {
  updateProject(projectId, p => {
    const map = new Map(p.blocks.map(b => [b.id, b]));
    const blocks = orderedIds.map(id => map.get(id)!).filter(Boolean);
    return { ...p, blocks };
  }, { pushUndo: false });
};

// ── Строки материалов ─────────────────────────────────────────
export const addRow = (projectId: string, blockId: string) => {
  const id = `r${Date.now()}${Math.random().toString(36).slice(2)}`;
  const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b => b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b),
  }));
};

export const updateRow = (projectId: string, blockId: string, rowId: string, data: Partial<CalcRow>) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b =>
      b.id === blockId
        ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
        : b
    ),
  }), { pushUndo: false });
};

export const deleteRow = (projectId: string, blockId: string, rowId: string) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b =>
      b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
    ),
  }));
};

export const duplicateRow = (projectId: string, blockId: string, rowId: string) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b => {
      if (b.id !== blockId) return b;
      const idx = b.rows.findIndex(r => r.id === rowId);
      if (idx < 0) return b;
      const cloned = { ...b.rows[idx], id: `r${Date.now()}${Math.random().toString(36).slice(2)}` };
      const rows = [...b.rows];
      rows.splice(idx + 1, 0, cloned);
      return { ...b, rows };
    }),
  }));
};

export const copyRowToBlock = (projectId: string, fromBlockId: string, rowId: string, toBlockId: string) => {
  updateProject(projectId, p => {
    const srcBlock = p.blocks.find(b => b.id === fromBlockId);
    const row = srcBlock?.rows.find(r => r.id === rowId);
    if (!row) return p;
    const cloned = { ...row, id: `r${Date.now()}${Math.random().toString(36).slice(2)}` };
    return { ...p, blocks: p.blocks.map(b => b.id === toBlockId ? { ...b, rows: [...b.rows, cloned] } : b) };
  });
};

export const reorderRows = (projectId: string, blockId: string, orderedIds: string[]) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b => {
      if (b.id !== blockId) return b;
      const map = new Map(b.rows.map(r => [r.id, r]));
      const rows = orderedIds.map(id => map.get(id)).filter((r): r is CalcRow => !!r);
      return { ...b, rows };
    }),
  }), { pushUndo: false });
};

export const refreshProjectPrices = (
  projectId: string,
  state: AppState,
  calcPriceWithMarkup: (p: number, t: 'materials' | 'services') => number
) => {
  updateProject(projectId, p => ({
    ...p,
    blocks: p.blocks.map(b => ({
      ...b,
      rows: b.rows.map(r => {
        if (!r.materialId) return r;
        const mat = state.materials.find((m: Material) => m.id === r.materialId);
        if (!mat) return r;
        const variant = r.variantId ? (mat.variants || []).find(v => v.id === r.variantId) : null;
        const newBasePrice = variant ? variant.basePrice : mat.basePrice;
        const newPrice = calcPriceWithMarkup(newBasePrice, 'materials');
        return { ...r, basePrice: newBasePrice, price: newPrice };
      }),
    })),
    serviceBlocks: p.serviceBlocks.map(sb => ({
      ...sb,
      rows: sb.rows.map(r => {
        if (!r.serviceId) return r;
        const svc = state.services.find((s: Service) => s.id === r.serviceId);
        if (!svc) return r;
        return { ...r, price: calcPriceWithMarkup(svc.basePrice, 'services') };
      }),
    })),
  }));
};

// ── Блоки услуг ───────────────────────────────────────────────
export const addServiceBlock = (projectId: string) => {
  const id = `sb${Date.now()}${Math.random().toString(36).slice(2)}`;
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: [...p.serviceBlocks, { id, name: 'Новый блок', rows: [] }],
  }));
};

export const updateServiceBlock = (projectId: string, blockId: string, data: Partial<ServiceBlock>) => {
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.map(b => b.id === blockId ? { ...b, ...data } : b),
  }));
};

export const deleteServiceBlock = (projectId: string, blockId: string) => {
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.filter(b => b.id !== blockId),
  }));
};

export const duplicateServiceBlock = (projectId: string, blockId: string) => {
  updateProject(projectId, p => {
    const src = p.serviceBlocks.find(b => b.id === blockId);
    if (!src) return p;
    const cloned = {
      ...src,
      id: `sb${Date.now()}${Math.random().toString(36).slice(2)}`,
      name: `${src.name} (копия)`,
      rows: src.rows.map(r => ({ ...r, id: `sr${Date.now()}${Math.random().toString(36).slice(2)}` })),
    };
    const idx = p.serviceBlocks.findIndex(b => b.id === blockId);
    const blocks = [...p.serviceBlocks];
    blocks.splice(idx + 1, 0, cloned);
    return { ...p, serviceBlocks: blocks };
  });
};

export const moveServiceBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
  updateProject(projectId, p => {
    const arr = [...p.serviceBlocks];
    const idx = arr.findIndex(b => b.id === blockId);
    if (idx < 0) return p;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= arr.length) return p;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    return { ...p, serviceBlocks: arr };
  });
};

// ── Строки услуг ──────────────────────────────────────────────
export const addServiceRow = (projectId: string, blockId: string) => {
  const id = `sr${Date.now()}${Math.random().toString(36).slice(2)}`;
  const newRow: ServiceRow = { id, name: '', unit: 'шт', qty: 1, price: 0 };
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.map(b =>
      b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
    ),
  }));
};

export const updateServiceRow = (projectId: string, blockId: string, rowId: string, data: Partial<ServiceRow>) => {
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.map(b =>
      b.id === blockId
        ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
        : b
    ),
  }), { pushUndo: false });
};

export const deleteServiceRow = (projectId: string, blockId: string, rowId: string) => {
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.map(b =>
      b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
    ),
  }));
};

export const reorderServiceRows = (projectId: string, blockId: string, orderedIds: string[]) => {
  updateProject(projectId, p => ({
    ...p,
    serviceBlocks: p.serviceBlocks.map(b => {
      if (b.id !== blockId) return b;
      const map = new Map(b.rows.map(r => [r.id, r]));
      const rows = orderedIds.map(id => map.get(id)).filter((r): r is ServiceRow => !!r);
      return { ...b, rows };
    }),
  }), { pushUndo: false });
};
