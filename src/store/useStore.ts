import { useState, useCallback } from 'react';
import type {
  AppState, Manufacturer, Vendor, Material, Service, ExpenseItem, ExpenseGroup,
  CalcBlock, CalcRow, ServiceBlock, ServiceRow, Project, Settings,
  MaterialType, MaterialCategory, CalcColumnKey, CalcTemplate, SavedBlock
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

const ALL_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

const DEFAULT_MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: 'mc1', name: 'Е1', typeId: 'mt1', note: 'Эмиссия формальдегида класс Е1' },
  { id: 'mc2', name: 'Е2', typeId: 'mt1', note: 'Эмиссия формальдегида класс Е2' },
  { id: 'mc3', name: 'Стандарт', note: 'Стандартная категория' },
  { id: 'mc4', name: 'Премиум', note: 'Премиальная категория' },
];

const defaultSettings: Settings = {
  currency: '₽',
  markupMaterial: 20,
  markupService: 15,
  units: ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'],
  materialTypes: DEFAULT_MATERIAL_TYPES,
  materialCategories: DEFAULT_MATERIAL_CATEGORIES,
};

const initialState: AppState = {
  manufacturers: [
    { id: 'mfr1', name: 'Lamarty', contact: 'Менеджер Игорь', phone: '+7 900 000-00-01', materialTypeIds: ['mt1', 'mt2', 'mt3'] },
    { id: 'mfr2', name: 'Kronospan', contact: 'Менеджер Анна', phone: '+7 900 000-00-02', materialTypeIds: ['mt1', 'mt4'] },
    { id: 'mfr3', name: 'Egger', contact: 'Менеджер Павел', phone: '+7 900 000-00-03', materialTypeIds: ['mt1', 'mt2', 'mt9'] },
    { id: 'mfr4', name: 'Boyard', contact: '', phone: '', materialTypeIds: ['mt10'] },
  ],
  vendors: [
    { id: 'v1', name: 'МАРШАЛ', contact: 'Менеджер Сергей', phone: '+7 900 100-00-01', materialTypeIds: ['mt1', 'mt2', 'mt3'] },
    { id: 'v2', name: 'Специалист', contact: 'Менеджер Ольга', phone: '+7 900 100-00-02', materialTypeIds: ['mt10', 'mt11'] },
    { id: 'v3', name: 'КДМ', contact: 'Менеджер Дмитрий', phone: '+7 900 100-00-03', materialTypeIds: ['mt1', 'mt4', 'mt5'] },
  ],
  materials: [
    { id: 'm1', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП 16мм Белый', typeId: 'mt1', thickness: 16, color: 'Белый', unit: 'м²', basePrice: 5083 },
    { id: 'm2', manufacturerId: 'mfr1', vendorId: 'v1', name: 'ЛДСП 16мм Серый', typeId: 'mt1', thickness: 16, color: 'Серый', unit: 'м²', basePrice: 5750 },
    { id: 'm3', manufacturerId: 'mfr2', vendorId: 'v1', name: 'ХДФ 3мм Белый', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', basePrice: 917 },
    { id: 'm4', manufacturerId: 'mfr3', vendorId: 'v3', name: 'ЛДСП 16мм Дуб натуральный', typeId: 'mt1', thickness: 16, color: 'Дуб натуральный', unit: 'м²', basePrice: 6417 },
    { id: 'm5', manufacturerId: 'mfr1', vendorId: 'v1', name: 'МДФ фасад 18мм', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', basePrice: 8333 },
    { id: 'm6', manufacturerId: 'mfr4', vendorId: 'v2', name: 'Петля Boyard 35мм', typeId: 'mt10', unit: 'шт', basePrice: 120 },
  ],
  services: [
    { id: 'sv1', name: 'Сборка кухни', category: 'Сборка', unit: 'компл', basePrice: 15000 },
    { id: 'sv2', name: 'Доставка по городу', category: 'Доставка', unit: 'компл', basePrice: 3000 },
    { id: 'sv3', name: 'Подъём на этаж', category: 'Доставка', unit: 'шт', basePrice: 500 },
    { id: 'sv4', name: 'Установка столешницы', category: 'Установка', unit: 'м.п.', basePrice: 1200 },
    { id: 'sv5', name: 'Врезка мойки', category: 'Дополнительные работы', unit: 'шт', basePrice: 1500 },
  ],
  expenseGroups: [
    { id: 'eg1', name: 'Наценки' },
    { id: 'eg2', name: 'Постоянные расходы' },
    { id: 'eg3', name: 'Налоги' },
  ],
  expenses: [
    { id: 'e6', name: 'Наценка на материалы', type: 'markup', value: 20, applyTo: 'materials', groupId: 'eg1', enabled: true, note: 'Применяется при подборе из Базы' },
    { id: 'e7', name: 'Наценка на услуги', type: 'markup', value: 15, applyTo: 'services', groupId: 'eg1', enabled: true, note: 'Применяется при подборе из Базы' },
    { id: 'e1', name: 'Аренда производства', type: 'fixed', value: 50000, groupId: 'eg2', enabled: true, note: 'В месяц' },
    { id: 'e2', name: 'Зарплата сотрудников', type: 'fixed', value: 120000, groupId: 'eg2', enabled: true, note: 'В месяц' },
    { id: 'e3', name: 'Налоги (УСН)', type: 'percent', value: 6, groupId: 'eg3', enabled: true, note: 'От оборота' },
    { id: 'e4', name: 'Расходные материалы', type: 'percent', value: 3, enabled: true, note: 'От стоимости заказа' },
    { id: 'e5', name: 'Реклама и маркетинг', type: 'percent', value: 5, enabled: true, note: 'От оборота' },
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
            { id: 'r1', name: 'ЛДСП 16мм Белый', materialId: 'm1', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt1', thickness: 16, color: 'Белый', unit: 'м²', qty: 25, price: 6100 },
            { id: 'r2', name: 'ЛДСП 16мм Серый', materialId: 'm2', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt1', thickness: 16, color: 'Серый', unit: 'м²', qty: 10, price: 6900 },
            { id: 'r3', name: 'ХДФ 3мм Белый', materialId: 'm3', manufacturerId: 'mfr2', vendorId: 'v1', typeId: 'mt3', thickness: 3, color: 'Белый', unit: 'м²', qty: 5, price: 1100 },
          ]
        },
        {
          id: 'b2',
          name: 'Фасады',
          allowedTypeIds: ['mt2', 'mt9'],
          visibleColumns: ALL_COLUMNS,
          rows: [
            { id: 'r4', name: 'МДФ фасад 18мм', materialId: 'm5', manufacturerId: 'mfr1', vendorId: 'v1', typeId: 'mt2', thickness: 18, color: 'Белый матовый', unit: 'м²', qty: 8, price: 10000 },
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
  templates: [
    {
      id: 'tpl1',
      name: 'Кухня стандарт',
      description: 'Корпус + Фасады + Монтаж',
      createdAt: '2026-04-24',
      blocks: [
        { name: 'Корпус', allowedTypeIds: ['mt1', 'mt3', 'mt2'], visibleColumns: ALL_COLUMNS, rows: [] },
        { name: 'Фасады', allowedTypeIds: ['mt2', 'mt9'], visibleColumns: ALL_COLUMNS, rows: [] },
        { name: 'Столешница', allowedTypeIds: ['mt8'], visibleColumns: ALL_COLUMNS, rows: [] },
      ],
      serviceBlocks: [
        { name: 'Монтаж и доставка', rows: [] },
      ],
    },
  ],
  savedBlocks: [],
};

const STORAGE_KEY = 'kuhni-pro-state-v3';

const DEFAULT_VISIBLE_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

function migrateProjects(projects: AppState['projects']): AppState['projects'] {
  return projects.map(p => ({
    ...p,
    blocks: p.blocks.map(b => {
      let cols = b.visibleColumns?.length ? b.visibleColumns : DEFAULT_VISIBLE_COLUMNS;
      // Добавляем total после price если нет
      if (!cols.includes('total')) {
        const priceIdx = cols.indexOf('price');
        cols = priceIdx >= 0
          ? [...cols.slice(0, priceIdx + 1), 'total', ...cols.slice(priceIdx + 1)]
          : [...cols, 'total'];
      }
      // Добавляем baseprice после qty если нет
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

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      const validTypes = parsed.settings?.materialTypes?.length &&
        isValidMaterialTypes(parsed.settings.materialTypes as unknown[])
        ? parsed.settings.materialTypes
        : DEFAULT_MATERIAL_TYPES;

      // Мигрируем expenses: enabled=undefined → true (не трогаем пользовательские данные)
      const migratedExpenses = parsed.expenses
        ? parsed.expenses.map(e => ({ ...e, enabled: e.enabled !== false }))
        : initialState.expenses;

      return {
        ...initialState,
        ...parsed,
        manufacturers: parsed.manufacturers?.length ? parsed.manufacturers : initialState.manufacturers,
        vendors: parsed.vendors?.length ? parsed.vendors : initialState.vendors,
        templates: parsed.templates ?? initialState.templates,
        savedBlocks: parsed.savedBlocks ?? initialState.savedBlocks,
        projects: parsed.projects ? migrateProjects(parsed.projects) : initialState.projects,
        // Группы расходов: берём пользовательские если есть, иначе дефолтные
        expenseGroups: parsed.expenseGroups?.length ? parsed.expenseGroups : initialState.expenseGroups,
        expenses: migratedExpenses,
        settings: {
          ...defaultSettings,
          ...(parsed.settings || {}),
          materialTypes: validTypes,
          materialCategories: parsed.settings?.materialCategories?.length
            ? parsed.settings.materialCategories
            : DEFAULT_MATERIAL_CATEGORIES,
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

  // Суммирует все активные наценки нужного типа
  const calcPriceWithMarkup = (basePrice: number, applyTo: 'materials' | 'services' = 'materials') => {
    const markupItems = state.expenses.filter(e =>
      e.type === 'markup' && e.applyTo === applyTo && (e.enabled !== false)
    );
    if (markupItems.length > 0) {
      const totalMarkupPct = markupItems.reduce((s, e) => s + e.value, 0);
      return Math.round(basePrice * (1 + totalMarkupPct / 100));
    }
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
    const percentExpenses = activeExpenses.filter(e => e.type === 'percent');
    const percentAmount = percentExpenses.reduce((s, e) => s + Math.round(baseForOverhead * e.value / 100), 0);

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
    const id = `b${Date.now()}`;
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
          const newBasePrice = mat.basePrice;
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
      id, client: '', object: 'Новый проект', address: '', phone: '',
      messenger: 'WhatsApp',
      createdAt: new Date().toISOString().split('T')[0],
      blocks: [{ id: `b${Date.now()}`, name: 'Корпус', allowedTypeIds: [], visibleColumns: DEFAULT_VISIBLE_COLUMNS, rows: [] }],
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

  // ===== MANUFACTURERS =====
  const addManufacturer = (m: Omit<Manufacturer, 'id'>) => {
    const id = `mfr${Date.now()}`;
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
    const id = `v${Date.now()}`;
    setState(s => ({ ...s, vendors: [...s.vendors, { ...v, id }] }));
  };
  const updateVendor = (id: string, data: Partial<Vendor>) => {
    setState(s => ({ ...s, vendors: s.vendors.map(v => v.id === id ? { ...v, ...data } : v) }));
  };
  const deleteVendor = (id: string) => {
    setState(s => ({ ...s, vendors: s.vendors.filter(v => v.id !== id) }));
  };

  const addMaterial = (material: Omit<Material, 'id'>) => {
    const id = `m${Date.now()}`;
    setState(s => ({ ...s, materials: [...s.materials, { ...material, id }] }));
  };
  const updateMaterial = (id: string, data: Partial<Material>) => {
    setState(s => ({ ...s, materials: s.materials.map(m => m.id === id ? { ...m, ...data } : m) }));
  };
  const deleteMaterial = (id: string) => {
    setState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
  };

  const addService = (service: Omit<Service, 'id'>) => {
    const id = `sv${Date.now()}`;
    setState(s => ({ ...s, services: [...s.services, { ...service, id }] }));
  };
  const updateService = (id: string, data: Partial<Service>) => {
    setState(s => ({ ...s, services: s.services.map(sv => sv.id === id ? { ...sv, ...data } : sv) }));
  };
  const deleteService = (id: string) => {
    setState(s => ({ ...s, services: s.services.filter(sv => sv.id !== id) }));
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `e${Date.now()}`;
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
    const id = `mt${Date.now()}`;
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
    const id = `tpl${Date.now()}`;
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
    const id = `eg${Date.now()}`;
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
    const id = `sb_${Date.now()}`;
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

  const addSavedBlockRow = (blockId: string) => {
    const id = `r${Date.now()}`;
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

  // Вставить сохранённый блок в проект (копирует строки с актуальными ценами)
  const insertSavedBlockToProject = (projectId: string, savedBlockId: string) => {
    const sb = (state.savedBlocks || []).find(b => b.id === savedBlockId);
    if (!sb) return;
    const id = `b${Date.now()}`;
    const newBlock: CalcBlock = {
      id,
      name: sb.name,
      allowedTypeIds: sb.allowedTypeIds,
      visibleColumns: sb.visibleColumns,
      rows: sb.rows.map(r => {
        const mat = r.materialId ? state.materials.find(m => m.id === r.materialId) : undefined;
        const basePrice = mat ? mat.basePrice : (r.basePrice ?? 0);
        const price = mat ? calcPriceWithMarkup(mat.basePrice, 'materials') : r.price;
        return {
          ...r,
          id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          basePrice,
          price,
        };
      }),
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
    const id = `mc${Date.now()}`;
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
    addRow, updateRow, deleteRow,
    addServiceBlock, updateServiceBlock, deleteServiceBlock,
    addServiceRow, updateServiceRow, deleteServiceRow,
    updateProjectInfo,
    createProject, deleteProject,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addVendor, updateVendor, deleteVendor,
    addMaterial, updateMaterial, deleteMaterial,
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
    createSavedBlock, updateSavedBlock, deleteSavedBlock,
    addSavedBlockRow, updateSavedBlockRow, deleteSavedBlockRow,
    insertSavedBlockToProject,
    setState: (updater: (s: AppState) => AppState) => setState(updater),
  };
}