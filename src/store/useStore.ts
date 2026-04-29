import { useState, useCallback } from 'react';
import type {
  AppState, Manufacturer, Vendor, Material, MaterialVariant, Service, ExpenseItem, ExpenseGroup,
  CalcBlock, CalcRow, ServiceBlock, ServiceRow, Project, Settings,
  MaterialType, MaterialCategory, CalcTemplate, SavedBlock
} from './types';
import { DEFAULT_VISIBLE_COLUMNS } from './initialState';
import {
  getGlobalState,
  setState,
  listeners,
  setStoreToken,
  loadStateFromDb,
  forceSetGlobalState,
  saveStateToDb,
  undoProjects,
  canUndo,
  undoListeners,
} from './stateCore';

export { setStoreToken, loadStateFromDb, forceSetGlobalState, saveStateToDb, undoProjects, canUndo, undoListeners };

export function useStore() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const fn = () => forceUpdate(n => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const state = getGlobalState();

  // Суммирует все активные наценки нужного типа.
  // Если наценок нет вообще или все выключены — возвращает basePrice без изменений.
  const calcPriceWithMarkup = (basePrice: number, applyTo: 'materials' | 'services' = 'materials') => {
    const allMarkupItems = state.expenses.filter(e =>
      e.type === 'markup' && e.applyTo === applyTo
    );
    const activeMarkupItems = allMarkupItems.filter(e => e.enabled !== false);
    // Если есть хотя бы одна наценка этого типа — применяем только активные
    if (allMarkupItems.length > 0) {
      if (activeMarkupItems.length === 0) return basePrice;
      const totalMarkupPct = activeMarkupItems.reduce((s, e) => s + e.value, 0);
      return Math.round(basePrice * (1 + totalMarkupPct / 100));
    }
    // Нет ни одной наценки — используем fallback из настроек
    const fallback = applyTo === 'materials' ? state.settings.markupMaterial : state.settings.markupService;
    return Math.round(basePrice * (1 + fallback / 100));
  };

  // Считает полный итог проекта с учётом всех включённых расходов.
  // ВАЖНО: CalcRow.price — это уже розничная цена (с наценкой на материалы/услуги).
  // Наценки markup/materials и markup/services используются ТОЛЬКО при подборе из базы (calcPriceWithMarkup).
  // В итоговом расчёте эти наценки НЕ применяются повторно — иначе будет двойное начисление.
  const calcProjectTotals = (project: Project) => {
    const activeExpenses = state.expenses.filter(e => e.enabled !== false);

    // Суммы из строк: price — розничная (уже с наценкой на материалы/услуги)
    const rawMaterials = project.blocks.reduce((sum, b) =>
      sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0);
    const rawServices = project.serviceBlocks.reduce((sum, b) =>
      sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0);

    // base = розничная стоимость материалов + услуг (наценка уже внутри)
    const base = rawMaterials + rawServices;

    // Наценка на итог целиком (markup/total) — дополнительная надбавка поверх всего
    const totalMarkupItems = activeExpenses.filter(e => e.type === 'markup' && e.applyTo === 'total');
    const totalMarkupPct = totalMarkupItems.reduce((s, e) => s + e.value, 0);
    const totalMarkupAmount = Math.round(base * totalMarkupPct / 100);

    // Наценки на конкретные блоки (markup/block) — дополнительная надбавка на блок
    const blockExtras = project.blocks.map(b => {
      const blockBase = b.rows.reduce((s, r) => s + r.qty * r.price, 0);
      const blockMarkups = activeExpenses.filter(e =>
        e.type === 'markup' && e.applyTo === 'block' && (e.blockIds || []).includes(b.id)
      );
      const extraPct = blockMarkups.reduce((s, e) => s + e.value, 0);
      const extra = Math.round(blockBase * extraPct / 100);
      return { blockId: b.id, blockName: b.name, base: blockBase, extra };
    });

    // База для накладных расходов = base + наценка на итог + надбавки на блоки
    const blockExtraTotal = blockExtras.reduce((s, b) => s + b.extra, 0);
    const baseForOverhead = base + totalMarkupAmount + blockExtraTotal;

    // Процентные накладные расходы (percent) — от итоговой базы с наценками
    // Округляем сумму ПОСЛЕ суммирования чтобы избежать накопительных ошибок округления
    const percentExpenses = activeExpenses.filter(e => e.type === 'percent');
    const percentAmount = Math.round(percentExpenses.reduce((s, e) => s + baseForOverhead * e.value / 100, 0));

    // Фиксированные накладные расходы
    const fixedExpenses = activeExpenses.filter(e => e.type === 'fixed');
    const fixedAmount = fixedExpenses.reduce((s, e) => s + e.value, 0);

    const grandTotal = baseForOverhead + percentAmount + fixedAmount;

    return {
      rawMaterials,
      rawServices,
      base,
      totalMarkupAmount,
      totalMarkupPct,
      percentAmount,
      fixedAmount,
      blockExtraTotal,
      blockExtras,
      grandTotal,
      activeExpenses,
    };
  };

  const getTypeName = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId)?.name || '';

  const getTypeById = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId);

  const getManufacturerById = (id?: string) =>
    state.manufacturers.find(m => m.id === id);

  const getVendorById = (id?: string) =>
    state.vendors.find(v => v.id === id);

  const getActiveProject = () =>
    state.projects.find(p => p.id === state.activeProjectId) || null;

  const updateProject = (projectId: string, updater: (p: Project) => Project) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? updater(p) : p)
    }));
  };

  const addBlock = (projectId: string) => {
    const id = `b${Date.now()}${Math.random().toString(36).slice(2)}`;
    updateProject(projectId, p => ({
      ...p,
      blocks: [...p.blocks, {
        id,
        name: 'Новый блок',
        allowedTypeIds: [],
        visibleColumns: DEFAULT_VISIBLE_COLUMNS,
        rows: []
      }]
    }));
  };

  const updateBlock = (projectId: string, blockId: string, data: Partial<CalcBlock>) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...data } : b)
    }));
  };

  const deleteBlock = (projectId: string, blockId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.filter(b => b.id !== blockId)
    }));
  };

  const addRow = (projectId: string, blockId: string) => {
    const id = `r${Date.now()}${Math.random().toString(36).slice(2)}`;
    const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b)
    }));
  };

  const updateRow = (projectId: string, blockId: string, rowId: string, data: Partial<CalcRow>) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      )
    }));
  };

  const deleteRow = (projectId: string, blockId: string, rowId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      )
    }));
  };

  const duplicateRow = (projectId: string, blockId: string, rowId: string) => {
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
      })
    }));
  };

  const copyRowToBlock = (projectId: string, fromBlockId: string, rowId: string, toBlockId: string) => {
    updateProject(projectId, p => {
      const srcBlock = p.blocks.find(b => b.id === fromBlockId);
      const row = srcBlock?.rows.find(r => r.id === rowId);
      if (!row) return p;
      const cloned = { ...row, id: `r${Date.now()}${Math.random().toString(36).slice(2)}` };
      return {
        ...p,
        blocks: p.blocks.map(b =>
          b.id === toBlockId ? { ...b, rows: [...b.rows, cloned] } : b
        )
      };
    });
  };

  const reorderRows = (projectId: string, blockId: string, orderedIds: string[]) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => {
        if (b.id !== blockId) return b;
        const map = new Map(b.rows.map(r => [r.id, r]));
        const rows = orderedIds.map(id => map.get(id)).filter((r): r is CalcRow => !!r);
        return { ...b, rows };
      })
    }));
  };

  // Обновляет розничные цены всех строк проекта по текущим наценкам из расходов.
  // Обновляются только строки, привязанные к материалу из базы (materialId присутствует).
  // Строки с ценой вручную (без materialId) не трогаются.
  const refreshProjectPrices = (projectId: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => ({
        ...b,
        rows: b.rows.map(r => {
          if (!r.materialId) return r; // ручная строка — не трогаем
          const mat = state.materials.find(m => m.id === r.materialId);
          if (!mat) return r;
          // Если строка привязана к варианту — берём цену варианта
          const variant = r.variantId ? (mat.variants || []).find(v => v.id === r.variantId) : null;
          const newBasePrice = variant ? variant.basePrice : mat.basePrice;
          const newPrice = calcPriceWithMarkup(newBasePrice, 'materials');
          return { ...r, basePrice: newBasePrice, price: newPrice };
        }),
      })),
      serviceBlocks: p.serviceBlocks.map(sb => ({
        ...sb,
        rows: sb.rows.map(r => {
          if (!r.serviceId) return r; // ручная строка — не трогаем
          const svc = state.services.find(s => s.id === r.serviceId);
          if (!svc) return r;
          const newPrice = calcPriceWithMarkup(svc.basePrice, 'services');
          return { ...r, price: newPrice };
        }),
      })),
    }));
  };

  const addServiceBlock = (projectId: string) => {
    const id = `sb${Date.now()}${Math.random().toString(36).slice(2)}`;
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: [...p.serviceBlocks, { id, name: 'Новый блок', rows: [] }]
    }));
  };

  const updateServiceBlock = (projectId: string, blockId: string, data: Partial<ServiceBlock>) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b => b.id === blockId ? { ...b, ...data } : b)
    }));
  };

  const deleteServiceBlock = (projectId: string, blockId: string) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.filter(b => b.id !== blockId)
    }));
  };

  const moveBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
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

  const moveServiceBlock = (projectId: string, blockId: string, direction: 'up' | 'down') => {
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

  const addServiceRow = (projectId: string, blockId: string) => {
    const id = `sr${Date.now()}${Math.random().toString(36).slice(2)}`;
    const newRow: ServiceRow = { id, name: '', unit: 'шт', qty: 1, price: 0 };
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
      )
    }));
  };

  const updateServiceRow = (projectId: string, blockId: string, rowId: string, data: Partial<ServiceRow>) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      )
    }));
  };

  const deleteServiceRow = (projectId: string, blockId: string, rowId: string) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      )
    }));
  };

  const reorderServiceRows = (projectId: string, blockId: string, orderedIds: string[]) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b => {
        if (b.id !== blockId) return b;
        const map = new Map(b.rows.map(r => [r.id, r]));
        const rows = orderedIds.map(id => map.get(id)).filter((r): r is ServiceRow => !!r);
        return { ...b, rows };
      })
    }));
  };

  const duplicateServiceBlock = (projectId: string, blockId: string) => {
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

  const updateProjectInfo = (projectId: string, data: Partial<Project>) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? { ...p, ...data } : p)
    }));
  };

  const createProject = () => {
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

  const deleteProject = (projectId: string) => {
    setState(s => {
      const remaining = s.projects.filter(p => p.id !== projectId);
      return { ...s, projects: remaining, activeProjectId: remaining.length > 0 ? remaining[remaining.length - 1].id : null };
    });
  };

  const duplicateProject = (projectId: string) => {
    const id = `p${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => {
      const src = s.projects.find(p => p.id === projectId);
      if (!src) return s;
      const cloned: Project = {
        ...src,
        id,
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
  };

  const duplicateBlock = (projectId: string, blockId: string) => {
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

  const reorderBlocks = (projectId: string, orderedIds: string[]) => {
    updateProject(projectId, p => {
      const map = new Map(p.blocks.map(b => [b.id, b]));
      const blocks = orderedIds.map(id => map.get(id)!).filter(Boolean);
      return { ...p, blocks };
    });
  };

  // ===== MANUFACTURERS =====
  const addManufacturer = (m: Omit<Manufacturer, 'id'>) => {
    const id = `mfr${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, manufacturers: [...s.manufacturers, { ...m, id }] }));
  };
  const updateManufacturer = (id: string, data: Partial<Manufacturer>) => {
    setState(s => ({ ...s, manufacturers: s.manufacturers.map(m => m.id === id ? { ...m, ...data } : m) }));
  };
  const deleteManufacturer = (id: string) => {
    setState(s => ({ ...s, manufacturers: s.manufacturers.filter(m => m.id !== id) }));
  };

  // ===== VENDORS =====
  const addVendor = (v: Omit<Vendor, 'id'>) => {
    const id = `v${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, vendors: [...s.vendors, { ...v, id }] }));
  };
  const updateVendor = (id: string, data: Partial<Vendor>) => {
    setState(s => ({ ...s, vendors: s.vendors.map(v => v.id === id ? { ...v, ...data } : v) }));
  };
  const deleteVendor = (id: string) => {
    setState(s => ({ ...s, vendors: s.vendors.filter(v => v.id !== id) }));
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const id = `m${Date.now()}${Math.random().toString(36).slice(2)}`;
    const today = new Date().toISOString().slice(0, 10);
    setState(s => ({ ...s, materials: [...s.materials, { ...material, id, priceUpdatedAt: today }] }));
  };

  const duplicateMaterial = (id: string) => {
    const src = state.materials.find(m => m.id === id);
    if (!src) return;
    const newId = `m${Date.now()}${Math.random().toString(36).slice(2)}`;
    const today = new Date().toISOString().slice(0, 10);
    setState(s => ({
      ...s,
      materials: [...s.materials, { ...src, id: newId, name: `${src.name} (копия)`, priceUpdatedAt: today, priceHistory: [] }]
    }));
  };

  // Батчевый импорт СКАТ/BOYARD — все материалы с вариантами в одном setState
  const importSkatBatch = (
    manufacturer: Omit<Manufacturer, 'id'> & { existingId?: string },
    categories: Array<Omit<MaterialCategory, 'id'> & { key: string }>,
    materials: Array<{
      name: string; typeId: string; vendorId?: string; thickness?: number; article: string;
      categoryKey?: string; unit: string;
      groupKey?: string; // альтернативный ключ матчинга (напр. "BOYARD::Ручка рейлинг")
      variants: Array<{ variantId: string; size?: string; thickness?: number; params: string; basePrice: number; article?: string }>;
    }>
  ): { created: number; updated: number; skipped: number } => {
    const ts = Date.now();
    let created = 0; let updated = 0; let skipped = 0;
    materials.forEach(mat => {
      const ex = mat.groupKey
        ? state.materials.find(m => m.article === mat.groupKey)
        : state.materials.find(m => m.article === mat.article);
      if (ex) {
        if (ex.variants && ex.variants.length === mat.variants.length) skipped++;
        else updated++;
      } else created++;
    });

    setState(s => {
      let next = { ...s };

      // 1. Производитель
      let mfrId = manufacturer.existingId || '';
      if (!mfrId) {
        mfrId = `mfr${ts}`;
        next = { ...next, manufacturers: [...next.manufacturers, { ...manufacturer, id: mfrId }] };
      }

      // 2. Категории серий (subsection)
      const catIdMap: Record<string, string> = {};
      const newCats = [...(next.settings.materialCategories || [])];
      categories.forEach((cat, i) => {
        const existing = newCats.find(c => c.note === cat.note);
        if (existing) { catIdMap[cat.key] = existing.id; }
        else {
          const catId = `mc${ts}${i}`;
          catIdMap[cat.key] = catId;
          newCats.push({ ...cat, id: catId });
        }
      });
      next = { ...next, settings: { ...next.settings, materialCategories: newCats } };

      // 3. Материалы с вариантами
      // Ключ поиска: groupKey (для BOYARD) или article (для СКАТ)
      const keyIndex = new Map(next.materials.map((m, i) => [m.article, i]));
      const newMaterials = [...next.materials];
      materials.forEach((mat, i) => {
        const lookupKey = mat.groupKey ?? mat.article;
        const catId = mat.categoryKey ? catIdMap[mat.categoryKey] : undefined;
        const variants: MaterialVariant[] = mat.variants.map(v => ({
          id: v.variantId, size: v.size, thickness: v.thickness, params: v.params, basePrice: v.basePrice,
          ...(v.article ? { article: v.article } : {}),
        }));
        const basePrice = mat.variants[0]?.basePrice ?? 0;
        if (keyIndex.has(lookupKey)) {
          // Обновляем варианты существующего
          const idx = keyIndex.get(lookupKey)!;
          newMaterials[idx] = { ...newMaterials[idx], variants, basePrice };
        } else {
          newMaterials.push({
            id: `m${ts}${i}`, manufacturerId: mfrId, categoryId: catId,
            name: mat.name, typeId: mat.typeId, vendorId: mat.vendorId,
            thickness: mat.thickness, article: lookupKey, unit: mat.unit, basePrice, variants,
          });
        }
      });
      next = { ...next, materials: newMaterials };

      return next;
    });

    return { created, updated, skipped };
  };

  // Патч всех материалов СКАТ: тип и поставщик
  const patchSkatMaterials = (typeId: string, vendorId: string): number => {
    let count = 0;
    setState(s => {
      const newMaterials = s.materials.map(m => {
        if (!m.article?.startsWith('skat__')) return m;
        count++;
        return { ...m, typeId, vendorId };
      });
      return { ...s, materials: newMaterials };
    });
    return count;
  };

  // Батчевое обновление цен СКАТ/BOYARD (все варианты сразу) + опционально size/thickness
  const updateSkatPrices = (
    updates: Array<{
      article: string;
      materialId?: string; // опциональный матчинг по ID (приоритетнее article)
      variants: Array<{ variantId: string; basePrice: number; size?: string; thickness?: number }>;
    }>
  ): number => {
    let count = 0;
    setState(s => {
      const newMaterials = s.materials.map(m => {
        const upd = updates.find(u => u.materialId ? u.materialId === m.id : (m.article && u.article === m.article));
        if (!upd) return m;
        const newVariants = (m.variants || []).map(v => {
          const vu = upd.variants.find(x => x.variantId === v.id);
          if (!vu) return v;
          return {
            ...v,
            basePrice: vu.basePrice,
            ...(vu.size !== undefined ? { size: vu.size } : {}),
            ...(vu.thickness !== undefined ? { thickness: vu.thickness } : {}),
          };
        });
        count++;
        return { ...m, variants: newVariants, basePrice: newVariants[0]?.basePrice ?? m.basePrice };
      });
      return { ...s, materials: newMaterials };
    });
    return count;
  };
  const updateMaterial = (id: string, data: Partial<Material>) => {
    setState(s => ({
      ...s,
      materials: s.materials.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ...data };
        // Если изменилась базовая цена — записываем в историю и обновляем дату
        if (data.basePrice !== undefined && data.basePrice !== m.basePrice) {
          const today = new Date().toISOString().slice(0, 10);
          const histItem = { date: today, price: m.basePrice };
          updated.priceHistory = [histItem, ...(m.priceHistory || [])].slice(0, 20);
          updated.priceUpdatedAt = today;
        }
        return updated;
      })
    }));
  };
  const deleteMaterial = (id: string) => {
    setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
  };

  // Удалить старые материалы BOYARD — все материалы у производителей с именем BOYARD/Boyard,
  // у которых article НЕ начинается с "boyard__group__" (старый формат — оригинальные артикулы)
  const deleteLegacyBoyardMaterials = (): number => {
    let count = 0;
    setState(s => {
      // Все производители с именем boyard (любой регистр)
      const boyardMfrIds = new Set(
        s.manufacturers.filter(m => m.name.toLowerCase() === 'boyard').map(m => m.id)
      );
      if (boyardMfrIds.size === 0) return s;
      const filtered = s.materials.filter(m => {
        const isLegacy = boyardMfrIds.has(m.manufacturerId) && !m.article?.startsWith('boyard__group__');
        if (isLegacy) count++;
        return !isLegacy;
      });
      return { ...s, materials: filtered };
    });
    return count;
  };

  const addService = (service: Omit<Service, 'id'>) => {
    const id = `sv${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, services: [...s.services, { ...service, id }] }));
  };
  const updateService = (id: string, data: Partial<Service>) => {
    setState(s => ({ ...s, services: s.services.map(sv => sv.id === id ? { ...sv, ...data } : sv) }));
  };
  const deleteService = (id: string) => {
    setState(s => ({ ...s, services: s.services.filter(sv => sv.id !== id) }));
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `e${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, expenses: [...s.expenses, { ...expense, id }] }));
  };
  const updateExpense = (id: string, data: Partial<ExpenseItem>) => {
    setState(s => ({ ...s, expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e) }));
  };
  const deleteExpense = (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
  };

  const updateSettings = (data: Partial<Settings>) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...data } }));
  };

  const addMaterialType = (mt: Omit<MaterialType, 'id'>) => {
    const id = `mt${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: [...s.settings.materialTypes, { ...mt, id }] } }));
  };
  const updateMaterialType = (id: string, data: Partial<MaterialType>) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: s.settings.materialTypes.map(t => t.id === id ? { ...t, ...data } : t) } }));
  };
  const deleteMaterialType = (id: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialTypes: s.settings.materialTypes.filter(t => t.id !== id) } }));
  };

  // ===== TEMPLATES =====
  const saveTemplate = (projectId: string, name: string, description?: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    const id = `tpl${Date.now()}${Math.random().toString(36).slice(2)}`;
    const template: CalcTemplate = {
      id,
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      blocks: project.blocks.map(b => ({
        name: b.name,
        allowedTypeIds: b.allowedTypeIds,
        visibleColumns: b.visibleColumns,
        rows: b.rows.map(r => ({
          name: r.name,
          materialId: r.materialId,
          unit: r.unit,
          qty: r.qty,
        })),
      })),
      serviceBlocks: project.serviceBlocks.map(sb => ({
        name: sb.name,
        rows: sb.rows.map(r => ({
          name: r.name,
          serviceId: r.serviceId,
          unit: r.unit,
          qty: r.qty,
        })),
      })),
    };
    setState(s => ({ ...s, templates: [...s.templates, template] }));
    return id;
  };

  const loadTemplate = (projectId: string, templateId: string) => {
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

  const deleteTemplate = (templateId: string) => {
    setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== templateId) }));
  };

  const updateTemplate = (templateId: string, data: Partial<Pick<CalcTemplate, 'name' | 'description'>>) => {
    setState(s => ({ ...s, templates: s.templates.map(t => t.id === templateId ? { ...t, ...data } : t) }));
  };

  const overwriteTemplate = (templateId: string, projectId: string) => {
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

  const addExpenseGroup = (name: string) => {
    const id = `eg${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, expenseGroups: [...(s.expenseGroups || []), { id, name }] }));
    return id;
  };
  const updateExpenseGroup = (id: string, data: Partial<ExpenseGroup>) => {
    setState(s => ({ ...s, expenseGroups: (s.expenseGroups || []).map(g => g.id === id ? { ...g, ...data } : g) }));
  };
  const deleteExpenseGroup = (id: string) => {
    setState(s => ({
      ...s,
      expenseGroups: (s.expenseGroups || []).filter(g => g.id !== id),
      expenses: s.expenses.map(e => e.groupId === id ? { ...e, groupId: undefined } : e),
    }));
  };

  // ===== SAVED BLOCKS =====
  const createSavedBlock = (name: string) => {
    const id = `sb_${Date.now()}${Math.random().toString(36).slice(2)}`;
    const block: SavedBlock = {
      id,
      name,
      allowedTypeIds: [],
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      rows: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setState(s => ({ ...s, savedBlocks: [...(s.savedBlocks || []), block] }));
    return id;
  };

  const updateSavedBlock = (blockId: string, data: Partial<SavedBlock>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b => b.id === blockId ? { ...b, ...data } : b),
    }));
  };

  const deleteSavedBlock = (blockId: string) => {
    setState(s => ({ ...s, savedBlocks: (s.savedBlocks || []).filter(b => b.id !== blockId) }));
  };

  const reorderSavedBlocks = (orderedIds: string[]) => {
    setState(s => {
      const map = new Map((s.savedBlocks || []).map(b => [b.id, b]));
      const reordered = orderedIds.map(id => map.get(id)).filter((b): b is SavedBlock => !!b);
      return { ...s, savedBlocks: reordered };
    });
  };

  const addSavedBlockRow = (blockId: string) => {
    const id = `r${Date.now()}${Math.random().toString(36).slice(2)}`;
    const newRow: CalcRow = { id, name: '', unit: 'м²', qty: 1, price: 0 };
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId ? { ...b, rows: [...b.rows, newRow] } : b
      ),
    }));
  };

  const updateSavedBlockRow = (blockId: string, rowId: string, data: Partial<CalcRow>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...data } : r) }
          : b
      ),
    }));
  };

  const deleteSavedBlockRow = (blockId: string, rowId: string) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId ? { ...b, rows: b.rows.filter(r => r.id !== rowId) } : b
      ),
    }));
  };

  // Сборки (assemblies) внутри сохранённого блока
  const addAssembly = (blockId: string, name: string) => {
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

  const updateAssembly = (blockId: string, assemblyId: string, data: Partial<import('./types').BlockAssembly>) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).map(a => a.id === assemblyId ? { ...a, ...data } : a) }
          : b
      ),
    }));
  };

  const deleteAssembly = (blockId: string, assemblyId: string) => {
    setState(s => ({
      ...s,
      savedBlocks: (s.savedBlocks || []).map(b =>
        b.id === blockId
          ? { ...b, assemblies: (b.assemblies || []).filter(a => a.id !== assemblyId) }
          : b
      ),
    }));
  };

  const addAssemblyRow = (blockId: string, assemblyId: string) => {
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

  const updateAssemblyRow = (blockId: string, assemblyId: string, rowId: string, data: Partial<CalcRow>) => {
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

  const deleteAssemblyRow = (blockId: string, assemblyId: string, rowId: string) => {
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

  const resolveRows = (rows: CalcRow[]) => rows.map(r => {
    const mat = r.materialId ? state.materials.find(m => m.id === r.materialId) : undefined;
    const variant = (mat && r.variantId) ? (mat.variants || []).find(v => v.id === r.variantId) : null;
    const basePrice = variant ? variant.basePrice : (mat ? mat.basePrice : (r.basePrice ?? 0));
    const price = mat ? calcPriceWithMarkup(basePrice, 'materials') : r.price;
    return { ...r, id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`, basePrice, price };
  });

  // Вставить сохранённый блок в проект (копирует строки с актуальными ценами)
  const insertSavedBlockToProject = (projectId: string, savedBlockId: string, assemblyId?: string) => {
    const sb = (state.savedBlocks || []).find(b => b.id === savedBlockId);
    if (!sb) return;
    const id = `b${Date.now()}`;
    // Если указана сборка — берём её строки, иначе дефолтные
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
    updateProject(projectId, p => ({ ...p, blocks: [...p.blocks, newBlock] }));
  };

  const addUnit = (unit: string) => {
    if (!unit.trim() || state.settings.units.includes(unit.trim())) return;
    setState(s => ({ ...s, settings: { ...s.settings, units: [...s.settings.units, unit.trim()] } }));
  };
  const deleteUnit = (unit: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, units: s.settings.units.filter(u => u !== unit) } }));
  };

  const getCategoryById = (id?: string) =>
    (state.settings.materialCategories || []).find(c => c.id === id);

  const getCategoriesForType = (typeId?: string) =>
    (state.settings.materialCategories || []).filter(c => {
      const ids = c.typeIds?.length ? c.typeIds : (c.typeId ? [c.typeId] : []);
      return ids.length === 0 || (typeId ? ids.includes(typeId) : true);
    });

  const addMaterialCategory = (cat: Omit<MaterialCategory, 'id'>) => {
    const id = `mc${Date.now()}${Math.random().toString(36).slice(2)}`;
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: [...(s.settings.materialCategories || []), { ...cat, id }] } }));
  };
  const updateMaterialCategory = (id: string, data: Partial<MaterialCategory>) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: (s.settings.materialCategories || []).map(c => c.id === id ? { ...c, ...data } : c) } }));
  };
  const deleteMaterialCategory = (id: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, materialCategories: (s.settings.materialCategories || []).filter(c => c.id !== id) } }));
  };

  return {
    ...state,
    getActiveProject,
    calcPriceWithMarkup,
    calcProjectTotals,
    getTypeName, getTypeById,
    getManufacturerById, getVendorById,
    getCategoryById, getCategoriesForType,
    addBlock, updateBlock, deleteBlock,
    addRow, updateRow, deleteRow, duplicateRow, copyRowToBlock, reorderRows,
    addServiceBlock, updateServiceBlock, deleteServiceBlock,
    addServiceRow, updateServiceRow, deleteServiceRow,
    reorderServiceRows, duplicateServiceBlock,
    updateProjectInfo,
    createProject, deleteProject, duplicateProject,
    duplicateBlock, reorderBlocks,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addVendor, updateVendor, deleteVendor,
    addMaterial, updateMaterial, deleteMaterial, duplicateMaterial, importSkatBatch, updateSkatPrices, patchSkatMaterials, deleteLegacyBoyardMaterials,
    addService, updateService, deleteService,
    addExpense, updateExpense, deleteExpense,
    addExpenseGroup, updateExpenseGroup, deleteExpenseGroup,
    refreshProjectPrices,
    updateSettings,
    addMaterialType, updateMaterialType, deleteMaterialType,
    addMaterialCategory, updateMaterialCategory, deleteMaterialCategory,
    addUnit, deleteUnit,
    moveBlock, moveServiceBlock,
    saveTemplate, loadTemplate, deleteTemplate, updateTemplate, overwriteTemplate,
    createSavedBlock, updateSavedBlock, deleteSavedBlock, reorderSavedBlocks,
    addSavedBlockRow, updateSavedBlockRow, deleteSavedBlockRow,
    addAssembly, updateAssembly, deleteAssembly,
    addAssemblyRow, updateAssemblyRow, deleteAssemblyRow,
    insertSavedBlockToProject,
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}