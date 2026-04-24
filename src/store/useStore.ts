import { useState, useCallback } from 'react';
import type {
  AppState, Supplier, Material, Service, ExpenseItem,
  CalcBlock, CalcRow, ServiceBlock, ServiceRow, Project, Settings,
  MaterialType, CalcColumnKey
} from './types';

const DEFAULT_MATERIAL_TYPES: MaterialType[] = [
  { id: 'mt1', name: 'ЛДСП', color: '#c8a96e' },
  { id: 'mt2', name: 'МДФ', color: '#a0c878' },
  { id: 'mt3', name: 'ХДФ', color: '#78b4c8' },
  { id: 'mt4', name: 'Фанера', color: '#c8a050' },
  { id: 'mt5', name: 'ДСП', color: '#b4b4b4' },
  { id: 'mt6', name: 'Стекло', color: '#a0d4e8' },
  { id: 'mt7', name: 'Зеркало', color: '#d0d8e8' },
  { id: 'mt8', name: 'Столешница', color: '#c8785a' },
  { id: 'mt9', name: 'Фасад', color: '#b478c8' },
  { id: 'mt10', name: 'Фурнитура', color: '#c8c850' },
  { id: 'mt11', name: 'Профиль', color: '#909090' },
  { id: 'mt12', name: 'Кромка', color: '#e8b478' },
  { id: 'mt13', name: 'Другое', color: '#787878' },
];

const ALL_COLUMNS: CalcColumnKey[] = ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

const defaultSettings: Settings = {
  currency: '₽',
  markupMaterial: 20,
  markupService: 15,
  units: ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'],
  materialTypes: DEFAULT_MATERIAL_TYPES,
};

const initialState: AppState = {
  suppliers: [
    { id: 's1', name: 'Lamarty', contact: 'Менеджер Игорь', phone: '+7 900 000-00-01', materialTypeIds: ['mt1', 'mt2', 'mt3'] },
    { id: 's2', name: 'Kronospan', contact: 'Менеджер Анна', phone: '+7 900 000-00-02', materialTypeIds: ['mt1', 'mt4'] },
    { id: 's3', name: 'Egger', contact: 'Менеджер Павел', phone: '+7 900 000-00-03', materialTypeIds: ['mt1', 'mt2', 'mt9'] },
  ],
  materials: [
    { id: 'm1', supplierId: 's1', name: 'ЛДСП 16мм Белый', typeId: 'mt1', thickness: 16, color: 'Белый', unit: 'м²', basePrice: 5083 },
    { id: 'm2', supplierId: 's1', name: 'ЛДСП 16мм Серый', typeId: 'mt1', thickness: 16, color: 'Серый', unit: 'м²', basePrice: 5750 },
    { id: 'm3', supplierId: 's2', name: 'ХДФ 3мм Белый', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', basePrice: 917 },
    { id: 'm4', supplierId: 's3', name: 'ЛДСП 16мм Дуб натуральный', typeId: 'mt1', thickness: 16, color: 'Дуб натуральный', unit: 'м²', basePrice: 6417 },
    { id: 'm5', supplierId: 's1', name: 'МДФ фасад 18мм', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', basePrice: 8333 },
  ],
  services: [
    { id: 'sv1', name: 'Сборка кухни', category: 'Сборка', unit: 'компл', basePrice: 15000 },
    { id: 'sv2', name: 'Доставка по городу', category: 'Доставка', unit: 'компл', basePrice: 3000 },
    { id: 'sv3', name: 'Подъём на этаж', category: 'Доставка', unit: 'шт', basePrice: 500 },
    { id: 'sv4', name: 'Установка столешницы', category: 'Установка', unit: 'м.п.', basePrice: 1200 },
    { id: 'sv5', name: 'Врезка мойки', category: 'Дополнительные работы', unit: 'шт', basePrice: 1500 },
  ],
  expenses: [
    { id: 'e1', name: 'Аренда производства', type: 'fixed', value: 50000, note: 'В месяц' },
    { id: 'e2', name: 'Зарплата сотрудников', type: 'fixed', value: 120000, note: 'В месяц' },
    { id: 'e3', name: 'Налоги (УСН)', type: 'percent', value: 6, note: 'От оборота' },
    { id: 'e4', name: 'Расходные материалы', type: 'percent', value: 3, note: 'От стоимости заказа' },
    { id: 'e5', name: 'Реклама и маркетинг', type: 'percent', value: 5, note: 'От оборота' },
    { id: 'e6', name: 'Наценка на материалы', type: 'markup', value: 20, applyTo: 'materials', note: 'Автоматически применяется при подборе из Базы' },
    { id: 'e7', name: 'Наценка на услуги', type: 'markup', value: 15, applyTo: 'services', note: 'Автоматически применяется при подборе из Базы' },
  ],
  settings: defaultSettings,
  projects: [
    {
      id: 'p1',
      client: 'Иванов Иван',
      object: 'Кухня П-образная',
      address: 'ул. Ленина, 42, кв. 15',
      phone: '+7 912 345-67-89',
      messenger: 'WhatsApp',
      createdAt: '2026-04-24',
      blocks: [
        {
          id: 'b1',
          name: 'Корпус',
          allowedTypeIds: ['mt1', 'mt3', 'mt2'],
          visibleColumns: ALL_COLUMNS,
          rows: [
            { id: 'r1', name: 'ЛДСП 16мм Белый', materialId: 'm1', supplierId: 's1', typeId: 'mt1', thickness: 16, color: 'Белый', unit: 'м²', qty: 25, price: 6100 },
            { id: 'r2', name: 'ЛДСП 16мм Серый', materialId: 'm2', supplierId: 's1', typeId: 'mt1', thickness: 16, color: 'Серый', unit: 'м²', qty: 10, price: 6900 },
            { id: 'r3', name: 'ХДФ 3мм Белый', materialId: 'm3', supplierId: 's2', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', qty: 5, price: 1100 },
          ]
        },
        {
          id: 'b2',
          name: 'Фасады',
          allowedTypeIds: ['mt2', 'mt9'],
          visibleColumns: ALL_COLUMNS,
          rows: [
            { id: 'r4', name: 'МДФ фасад 18мм', materialId: 'm5', supplierId: 's1', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', qty: 8, price: 10000 },
          ]
        },
      ],
      serviceBlocks: [
        {
          id: 'sb1',
          name: 'Монтаж и доставка',
          rows: [
            { id: 'sr1', serviceId: 'sv1', name: 'Сборка кухни', unit: 'компл', qty: 1, price: 15000 },
            { id: 'sr2', serviceId: 'sv2', name: 'Доставка по городу', unit: 'компл', qty: 1, price: 3000 },
          ]
        }
      ]
    }
  ],
  activeProjectId: 'p1',
};

const STORAGE_KEY = 'kuhni-pro-state-v2';

const DEFAULT_VISIBLE_COLUMNS: CalcColumnKey[] = ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

function migrateProjects(projects: AppState['projects']): AppState['projects'] {
  return projects.map(p => ({
    ...p,
    blocks: p.blocks.map(b => ({
      ...b,
      allowedTypeIds: b.allowedTypeIds ?? [],
      visibleColumns: b.visibleColumns?.length ? b.visibleColumns : DEFAULT_VISIBLE_COLUMNS,
    })),
  }));
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      return {
        ...initialState,
        ...parsed,
        projects: parsed.projects ? migrateProjects(parsed.projects) : initialState.projects,
        settings: {
          ...defaultSettings,
          ...(parsed.settings || {}),
          materialTypes: parsed.settings?.materialTypes?.length
            ? parsed.settings.materialTypes
            : DEFAULT_MATERIAL_TYPES,
        },
      };
    }
  } catch (e) {
    void e;
  }
  return initialState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    void e;
  }
}

let globalState: AppState = loadState();
const listeners: Set<() => void> = new Set();

function setState(updater: (s: AppState) => AppState) {
  globalState = updater(globalState);
  saveState(globalState);
  listeners.forEach(fn => fn());
}

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

  const state = globalState;

  const calcPriceWithMarkup = (basePrice: number, applyTo: 'materials' | 'services' = 'materials') => {
    const markupItem = state.expenses.find(e => e.type === 'markup' && e.applyTo === applyTo);
    const markup = markupItem ? markupItem.value : (applyTo === 'materials' ? state.settings.markupMaterial : state.settings.markupService);
    return Math.round(basePrice * (1 + markup / 100));
  };

  const getTypeName = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId)?.name || '';

  const getTypeById = (typeId?: string) =>
    state.settings.materialTypes.find(t => t.id === typeId);

  const getActiveProject = () =>
    state.projects.find(p => p.id === state.activeProjectId) || null;

  const updateProject = (projectId: string, updater: (p: Project) => Project) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? updater(p) : p)
    }));
  };

  const addBlock = (projectId: string) => {
    const id = `b${Date.now()}`;
    updateProject(projectId, p => ({
      ...p,
      blocks: [...p.blocks, {
        id,
        name: 'Новый блок',
        allowedTypeIds: [],
        visibleColumns: ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'] as CalcColumnKey[],
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
    const id = `r${Date.now()}`;
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

  const addServiceBlock = (projectId: string) => {
    const id = `sb${Date.now()}`;
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

  const addServiceRow = (projectId: string, blockId: string) => {
    const id = `sr${Date.now()}`;
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

  const updateProjectInfo = (projectId: string, data: Partial<Project>) => {
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === projectId ? { ...p, ...data } : p)
    }));
  };

  const createProject = () => {
    const id = `p${Date.now()}`;
    const newProject: Project = {
      id,
      client: '',
      object: 'Новый проект',
      address: '',
      phone: '',
      messenger: 'WhatsApp',
      createdAt: new Date().toISOString().split('T')[0],
      blocks: [{
        id: `b${Date.now()}`,
        name: 'Корпус',
        allowedTypeIds: [],
        visibleColumns: ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'] as CalcColumnKey[],
        rows: []
      }],
      serviceBlocks: [],
    };
    setState(s => ({
      ...s,
      projects: [...s.projects, newProject],
      activeProjectId: id,
    }));
    return id;
  };

  const deleteProject = (projectId: string) => {
    setState(s => {
      const remaining = s.projects.filter(p => p.id !== projectId);
      return {
        ...s,
        projects: remaining,
        activeProjectId: remaining.length > 0 ? remaining[remaining.length - 1].id : null,
      };
    });
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const id = `s${Date.now()}`;
    setState(s => ({ ...s, suppliers: [...s.suppliers, { ...supplier, id }] }));
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setState(s => ({
      ...s,
      suppliers: s.suppliers.map(sup => sup.id === id ? { ...sup, ...data } : sup)
    }));
  };

  const deleteSupplier = (id: string) => {
    setState(s => ({ ...s, suppliers: s.suppliers.filter(sup => sup.id !== id) }));
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const id = `m${Date.now()}`;
    setState(s => ({ ...s, materials: [...s.materials, { ...material, id }] }));
  };

  const updateMaterial = (id: string, data: Partial<Material>) => {
    setState(s => ({
      ...s,
      materials: s.materials.map(m => m.id === id ? { ...m, ...data } : m)
    }));
  };

  const deleteMaterial = (id: string) => {
    setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
  };

  const addService = (service: Omit<Service, 'id'>) => {
    const id = `sv${Date.now()}`;
    setState(s => ({ ...s, services: [...s.services, { ...service, id }] }));
  };

  const updateService = (id: string, data: Partial<Service>) => {
    setState(s => ({
      ...s,
      services: s.services.map(sv => sv.id === id ? { ...sv, ...data } : sv)
    }));
  };

  const deleteService = (id: string) => {
    setState(s => ({ ...s, services: s.services.filter(sv => sv.id !== id) }));
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `e${Date.now()}`;
    setState(s => ({ ...s, expenses: [...s.expenses, { ...expense, id }] }));
  };

  const updateExpense = (id: string, data: Partial<ExpenseItem>) => {
    setState(s => ({
      ...s,
      expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e)
    }));
  };

  const deleteExpense = (id: string) => {
    setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
  };

  const updateSettings = (data: Partial<Settings>) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...data } }));
  };

  const addMaterialType = (mt: Omit<MaterialType, 'id'>) => {
    const id = `mt${Date.now()}`;
    setState(s => ({
      ...s,
      settings: {
        ...s.settings,
        materialTypes: [...s.settings.materialTypes, { ...mt, id }]
      }
    }));
  };

  const updateMaterialType = (id: string, data: Partial<MaterialType>) => {
    setState(s => ({
      ...s,
      settings: {
        ...s.settings,
        materialTypes: s.settings.materialTypes.map(t => t.id === id ? { ...t, ...data } : t)
      }
    }));
  };

  const deleteMaterialType = (id: string) => {
    setState(s => ({
      ...s,
      settings: {
        ...s.settings,
        materialTypes: s.settings.materialTypes.filter(t => t.id !== id)
      }
    }));
  };

  const addUnit = (unit: string) => {
    if (!unit.trim() || state.settings.units.includes(unit.trim())) return;
    setState(s => ({
      ...s,
      settings: { ...s.settings, units: [...s.settings.units, unit.trim()] }
    }));
  };

  const deleteUnit = (unit: string) => {
    setState(s => ({
      ...s,
      settings: { ...s.settings, units: s.settings.units.filter(u => u !== unit) }
    }));
  };

  return {
    ...state,
    getActiveProject,
    calcPriceWithMarkup,
    getTypeName,
    getTypeById,
    addBlock, updateBlock, deleteBlock,
    addRow, updateRow, deleteRow,
    addServiceBlock, updateServiceBlock, deleteServiceBlock,
    addServiceRow, updateServiceRow, deleteServiceRow,
    updateProjectInfo,
    createProject, deleteProject,
    addSupplier, updateSupplier, deleteSupplier,
    addMaterial, updateMaterial, deleteMaterial,
    addService, updateService, deleteService,
    addExpense, updateExpense, deleteExpense,
    updateSettings,
    addMaterialType, updateMaterialType, deleteMaterialType,
    addUnit, deleteUnit,
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}