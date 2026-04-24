import { useState, useCallback } from 'react';
import type {
  AppState, Supplier, Material, Service, ExpenseItem,
  CalcBlock, CalcRow, ServiceBlock, ServiceRow, Project, Settings
} from './types';

const defaultSettings: Settings = {
  currency: '₽',
  markupMaterial: 20,
  markupService: 15,
  units: ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'],
};

const initialState: AppState = {
  suppliers: [
    { id: 's1', name: 'Lamarty', contact: 'Менеджер Игорь', phone: '+7 900 000-00-01' },
    { id: 's2', name: 'Kronospan', contact: 'Менеджер Анна', phone: '+7 900 000-00-02' },
    { id: 's3', name: 'Egger', contact: 'Менеджер Павел', phone: '+7 900 000-00-03' },
  ],
  materials: [
    { id: 'm1', supplierId: 's1', name: 'ЛДСП 16мм Белый', type: 'ЛДСП', thickness: 16, color: 'Белый', unit: 'м²', basePrice: 5083 },
    { id: 'm2', supplierId: 's1', name: 'ЛДСП 16мм Серый', type: 'ЛДСП', thickness: 16, color: 'Серый', unit: 'м²', basePrice: 5750 },
    { id: 'm3', supplierId: 's2', name: 'ХДФ 3мм Белый', type: 'ХДФ', thickness: 3, color: 'Белый', unit: 'м²', basePrice: 917 },
    { id: 'm4', supplierId: 's3', name: 'ЛДСП 16мм Дуб натуральный', type: 'ЛДСП', thickness: 16, color: 'Дуб натуральный', unit: 'м²', basePrice: 6417 },
    { id: 'm5', supplierId: 's1', name: 'МДФ фасад 18мм', type: 'МДФ', thickness: 18, color: 'Белый матовый', unit: 'м²', basePrice: 8333 },
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
          rows: [
            { id: 'r1', name: 'ЛДСП 16мм Белый', materialId: 'm1', supplierId: 's1', type: 'ЛДСП', thickness: 16, color: 'Белый', unit: 'м²', qty: 25, price: 6100 },
            { id: 'r2', name: 'ЛДСП 16мм Серый', materialId: 'm2', supplierId: 's1', type: 'ЛДСП', thickness: 16, color: 'Серый', unit: 'м²', qty: 10, price: 6900 },
            { id: 'r3', name: 'ХДФ 3мм Белый', materialId: 'm3', supplierId: 's2', type: 'ХДФ', thickness: 3, color: 'Белый', unit: 'м²', qty: 5, price: 1100 },
          ]
        },
        {
          id: 'b2',
          name: 'Фасады',
          rows: [
            { id: 'r4', name: 'МДФ фасад 18мм', materialId: 'm5', supplierId: 's1', type: 'МДФ', thickness: 18, color: 'Белый матовый', unit: 'м²', qty: 8, price: 10000 },
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

const STORAGE_KEY = 'kuhni-pro-state';

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...initialState, ...JSON.parse(saved) };
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

  const calcPriceWithMarkup = (basePrice: number, isService = false) => {
    const markup = isService ? state.settings.markupService : state.settings.markupMaterial;
    return Math.round(basePrice * (1 + markup / 100));
  };

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
      blocks: [...p.blocks, { id, name: 'Новый блок', rows: [] }]
    }));
  };

  const updateBlockName = (projectId: string, blockId: string, name: string) => {
    updateProject(projectId, p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, name } : b)
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

  const updateServiceBlockName = (projectId: string, blockId: string, name: string) => {
    updateProject(projectId, p => ({
      ...p,
      serviceBlocks: p.serviceBlocks.map(b => b.id === blockId ? { ...b, name } : b)
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
      blocks: [{ id: `b${Date.now()}`, name: 'Корпус', rows: [] }],
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

  return {
    ...state,
    getActiveProject,
    calcPriceWithMarkup,
    addBlock, updateBlockName, deleteBlock,
    addRow, updateRow, deleteRow,
    addServiceBlock, updateServiceBlockName, deleteServiceBlock,
    addServiceRow, updateServiceRow, deleteServiceRow,
    updateProjectInfo,
    createProject, deleteProject,
    addSupplier, updateSupplier, deleteSupplier,
    addMaterial, updateMaterial, deleteMaterial,
    addService, updateService, deleteService,
    addExpense, updateExpense, deleteExpense,
    updateSettings,
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}