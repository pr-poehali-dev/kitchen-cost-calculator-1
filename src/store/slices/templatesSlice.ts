import type { CalcBlock, CalcTemplate, CalcRow, AppState } from '../types';
import { setState } from '../stateCore';
import { DEFAULT_VISIBLE_COLUMNS } from '../initialState';

export const saveTemplate = (projectId: string, name: string, state: AppState, description?: string) => {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  const id = `tpl${Date.now()}${Math.random().toString(36).slice(2)}`;
  const template: CalcTemplate = {
    id, name, description,
    createdAt: new Date().toISOString().split('T')[0],
    blocks: project.blocks.map(b => ({
      name: b.name,
      allowedTypeIds: b.allowedTypeIds,
      visibleColumns: b.visibleColumns,
      rows: b.rows.map(r => ({ name: r.name, materialId: r.materialId, unit: r.unit, qty: r.qty })),
    })),
    serviceBlocks: project.serviceBlocks.map(sb => ({
      name: sb.name,
      rows: sb.rows.map(r => ({ name: r.name, serviceId: r.serviceId, unit: r.unit, qty: r.qty })),
    })),
  };
  setState(s => ({ ...s, templates: [...s.templates, template] }));
  return id;
};

export const loadTemplate = (
  projectId: string,
  templateId: string,
  state: AppState,
  calcPriceWithMarkup: (p: number, t: 'materials' | 'services') => number
) => {
  const template = state.templates.find(t => t.id === templateId);
  if (!template) return;
  const newBlocks: CalcBlock[] = template.blocks.map(tb => {
    const blockId = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: blockId,
      name: tb.name,
      allowedTypeIds: tb.allowedTypeIds,
      visibleColumns: tb.visibleColumns?.includes('baseprice') ? tb.visibleColumns : DEFAULT_VISIBLE_COLUMNS,
      rows: tb.rows.map(tr => {
        const mat = tr.materialId ? state.materials.find(m => m.id === tr.materialId) : undefined;
        const basePrice = mat ? mat.basePrice : 0;
        const price = mat ? calcPriceWithMarkup(mat.basePrice, 'materials') : 0;
        return {
          id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          name: tr.name,
          materialId: tr.materialId,
          manufacturerId: mat?.manufacturerId,
          vendorId: mat?.vendorId,
          typeId: mat?.typeId,
          color: mat?.color,
          article: mat?.article,
          thickness: mat?.thickness,
          unit: tr.unit,
          qty: tr.qty,
          basePrice,
          price,
        } as CalcRow;
      }),
    };
  });
  const newServiceBlocks = template.serviceBlocks.map(tsb => ({
    id: `sb${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    name: tsb.name,
    rows: tsb.rows.map(tr => {
      const service = tr.serviceId ? state.services.find(s => s.id === tr.serviceId) : undefined;
      const price = service ? calcPriceWithMarkup(service.basePrice, 'services') : 0;
      return {
        id: `sr${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        name: tr.name,
        serviceId: tr.serviceId,
        unit: tr.unit,
        qty: tr.qty,
        price,
      };
    }),
  }));
  setState(s => ({
    ...s,
    projects: s.projects.map(p => p.id === projectId
      ? { ...p, blocks: newBlocks, serviceBlocks: newServiceBlocks }
      : p
    ),
  }));
};

export const deleteTemplate = (templateId: string) => {
  setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== templateId) }));
};

export const updateTemplate = (templateId: string, data: Partial<Pick<CalcTemplate, 'name' | 'description'>>) => {
  setState(s => ({ ...s, templates: s.templates.map(t => t.id === templateId ? { ...t, ...data } : t) }));
};

export const overwriteTemplate = (templateId: string, projectId: string, state: AppState) => {
  const project = state.projects.find(p => p.id === projectId);
  const template = state.templates.find(t => t.id === templateId);
  if (!project || !template) return;
  const updated: CalcTemplate = {
    ...template,
    createdAt: new Date().toISOString().split('T')[0],
    blocks: project.blocks.map(b => ({
      name: b.name,
      allowedTypeIds: b.allowedTypeIds,
      visibleColumns: b.visibleColumns,
      rows: b.rows.map(r => ({ name: r.name, materialId: r.materialId, unit: r.unit, qty: r.qty })),
    })),
    serviceBlocks: project.serviceBlocks.map(sb => ({
      name: sb.name,
      rows: sb.rows.map(r => ({ name: r.name, serviceId: r.serviceId, unit: r.unit, qty: r.qty })),
    })),
  };
  setState(s => ({ ...s, templates: s.templates.map(t => t.id === templateId ? updated : t) }));
};
