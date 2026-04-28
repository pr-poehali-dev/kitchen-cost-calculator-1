import type {
  AppState, Settings, MaterialType, MaterialCategory, CalcColumnKey,
} from './types';

export const DEFAULT_MATERIAL_TYPES: MaterialType[] = [
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

export const ALL_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

export const DEFAULT_MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: 'mc1', name: 'Е1', typeIds: ['mt1'], note: 'Эмиссия формальдегида класс Е1' },
  { id: 'mc2', name: 'Е2', typeIds: ['mt1'], note: 'Эмиссия формальдегида класс Е2' },
  { id: 'mc3', name: 'Стандарт', typeIds: [], note: 'Стандартная категория' },
  { id: 'mc4', name: 'Премиум', typeIds: [], note: 'Премиальная категория' },
];

export const defaultSettings: Settings = {
  currency: '₽',
  markupMaterial: 20,
  markupService: 15,
  units: ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'],
  materialTypes: DEFAULT_MATERIAL_TYPES,
  materialCategories: DEFAULT_MATERIAL_CATEGORIES,
};

export const initialState: AppState = {
  manufacturers: [
    { id: 'mfr4', name: 'Boyard',  contact: '', phone: '', materialTypeIds: ['mt10'] },
    { id: 'mfr5', name: 'Slotex',  contact: '', phone: '', materialTypeIds: ['mt8', 'mt9', 'mt12'] },
  ],
  vendors: [
    { id: 'v2', name: 'Специалист', contact: '', phone: '', materialTypeIds: ['mt8', 'mt10', 'mt11', 'mt12'] },
  ],
  materials: [

    // ══ Slotex / Серия Elga E1 (gid=1989291696) ══════════════════
    {
      id: 'e1_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 22810 },
        { id: 'e1_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 25090 },
        { id: 'e1_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 21740 },
        { id: 'e1_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 23910 },
        { id: 'e1_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 11410 },
        { id: 'e1_st1_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 15950 },
        { id: 'e1_st1_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 17540 },
        { id: 'e1_st1_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 14880 },
        { id: 'e1_st1_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 16370 },
        { id: 'e1_st1_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 8040  },
        { id: 'e1_st1_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 8840  },
        { id: 'e1_st1_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 13540 },
        { id: 'e1_st1_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 14890 },
        { id: 'e1_st1_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 12370 },
        { id: 'e1_st1_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 13610 },
        { id: 'e1_st1_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 6870  },
        { id: 'e1_st1_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 7550  },
      ],
    },
    {
      id: 'e1_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 34190 },
        { id: 'e1_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 37620 },
        { id: 'e1_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 32460 },
        { id: 'e1_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 35700 },
        { id: 'e1_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 17210 },
        { id: 'e1_st2_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 23960 },
        { id: 'e1_st2_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 26350 },
        { id: 'e1_st2_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 22220 },
        { id: 'e1_st2_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 24440 },
        { id: 'e1_st2_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 12080 },
        { id: 'e1_st2_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 13290 },
        { id: 'e1_st2_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 20190 },
        { id: 'e1_st2_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 22210 },
        { id: 'e1_st2_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 18550 },
        { id: 'e1_st2_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 20410 },
        { id: 'e1_st2_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 10240 },
        { id: 'e1_st2_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 11270 },
      ],
    },
    {
      id: 'e1_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E1', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e1_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 15080 },
        { id: 'e1_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 7630  },
        { id: 'e1_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 10340 },
        { id: 'e1_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 5220  },
      ],
    },

    // ══ Slotex / Серия Elga E2 (gid=1539284672) ══════════════════
    {
      id: 'e2_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 28340 },
        { id: 'e2_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 31180 },
        { id: 'e2_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 27510 },
        { id: 'e2_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 30250 },
        { id: 'e2_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 14180 },
        { id: 'e2_st1_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 19880 },
        { id: 'e2_st1_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 21860 },
        { id: 'e2_st1_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 18950 },
        { id: 'e2_st1_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 20850 },
        { id: 'e2_st1_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 9950  },
        { id: 'e2_st1_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 10940 },
        { id: 'e2_st1_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 18560 },
        { id: 'e2_st1_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 20410 },
        { id: 'e2_st1_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 17650 },
        { id: 'e2_st1_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 19410 },
        { id: 'e2_st1_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 8490  },
        { id: 'e2_st1_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 9340  },
      ],
    },
    {
      id: 'e2_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 42510 },
        { id: 'e2_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 46770 },
        { id: 'e2_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 41130 },
        { id: 'e2_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 45250 },
        { id: 'e2_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 21340 },
        { id: 'e2_st2_v6',  size: '3000×1200', thickness: 40, params: '00/U1/05', basePrice: 29660 },
        { id: 'e2_st2_v7',  size: '3000×1200', thickness: 40, params: 'UU/05',    basePrice: 32630 },
        { id: 'e2_st2_v8',  size: '3000×800',  thickness: 40, params: '00/U1/05', basePrice: 28350 },
        { id: 'e2_st2_v9',  size: '3000×800',  thickness: 40, params: 'UU/05',    basePrice: 31190 },
        { id: 'e2_st2_v10', size: '3000×600',  thickness: 40, params: '00/U1/05', basePrice: 14940 },
        { id: 'e2_st2_v11', size: '3000×600',  thickness: 40, params: 'UU/05',    basePrice: 16430 },
        { id: 'e2_st2_v12', size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 27830 },
        { id: 'e2_st2_v13', size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 30610 },
        { id: 'e2_st2_v14', size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 26470 },
        { id: 'e2_st2_v15', size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 29120 },
        { id: 'e2_st2_v16', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 12730 },
        { id: 'e2_st2_v17', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 14010 },
      ],
    },
    {
      id: 'e2_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E2', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e2_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 19250 },
        { id: 'e2_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 9700  },
        { id: 'e2_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 12720 },
        { id: 'e2_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 6790  },
      ],
    },

    // ══ Slotex / Серия Elga E3 (gid=1324647373) ══════════════════
    {
      id: 'e3_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_st1_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 33970 },
        { id: 'e3_st1_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 37380 },
        { id: 'e3_st1_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 33140 },
        { id: 'e3_st1_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 36450 },
        { id: 'e3_st1_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 17060 },
        { id: 'e3_st1_v6',  size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 24920 },
        { id: 'e3_st1_v7',  size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 27410 },
        { id: 'e3_st1_v8',  size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 24010 },
        { id: 'e3_st1_v9',  size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 26420 },
        { id: 'e3_st1_v10', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 12460 },
        { id: 'e3_st1_v11', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 13710 },
      ],
    },
    {
      id: 'e3_st2', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница Slotex DUO-X E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_st2_v1',  size: '4200×1200', thickness: 40, params: '00/U1/05', basePrice: 51030 },
        { id: 'e3_st2_v2',  size: '4200×1200', thickness: 40, params: 'UU/05',    basePrice: 56130 },
        { id: 'e3_st2_v3',  size: '4200×800',  thickness: 40, params: '00/U1/05', basePrice: 49670 },
        { id: 'e3_st2_v4',  size: '4200×800',  thickness: 40, params: 'UU/05',    basePrice: 54630 },
        { id: 'e3_st2_v5',  size: '4200×600',  thickness: 40, params: '00/U1/05', basePrice: 25580 },
        { id: 'e3_st2_v6',  size: '3000×1200', thickness: 27, params: '00/U1/05', basePrice: 37370 },
        { id: 'e3_st2_v7',  size: '3000×1200', thickness: 27, params: 'UU/05',    basePrice: 41100 },
        { id: 'e3_st2_v8',  size: '3000×800',  thickness: 27, params: '00/U1/05', basePrice: 36080 },
        { id: 'e3_st2_v9',  size: '3000×800',  thickness: 27, params: 'UU/05',    basePrice: 39680 },
        { id: 'e3_st2_v10', size: '3000×600',  thickness: 27, params: '00/U1/05', basePrice: 18730 },
        { id: 'e3_st2_v11', size: '3000×600',  thickness: 27, params: 'UU/05',    basePrice: 20600 },
      ],
    },
    {
      id: 'e3_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель Slotex E3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'e3_sp1_v1', size: '4200×1215', thickness: 10, params: '0', basePrice: 23100 },
        { id: 'e3_sp1_v2', size: '4200×600',  thickness: 10, params: '0', basePrice: 11630 },
        { id: 'e3_sp1_v3', size: '3000×1215', thickness: 10, params: '0', basePrice: 16290 },
        { id: 'e3_sp1_v4', size: '3000×600',  thickness: 10, params: '0', basePrice: 8530  },
      ],
    },

    // ══ Slotex / Серия kapso K3 (gid=557309721) ══════════════════
    {
      id: 'k3_st1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Столешница kapso K3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'k3_st1_v1', size: '4200×600',  thickness: 40, params: '00/W1/05', basePrice: 8390  },
        { id: 'k3_st1_v2', size: '3000×600',  thickness: 40, params: '00/W1/05', basePrice: 6000  },
        { id: 'k3_st1_v3', size: '3000×1200', thickness: 40, params: '00/W1/05', basePrice: 11680 },
      ],
    },
    {
      id: 'k3_sp1', manufacturerId: 'mfr5', vendorId: 'v2', name: 'Стеновая панель kapso K3', typeId: 'mt8', unit: 'шт', basePrice: 0,
      variants: [
        { id: 'k3_sp1_v1', size: '4200×600', thickness: 10, params: '0', basePrice: 6780 },
        { id: 'k3_sp1_v2', size: '3000×600', thickness: 10, params: '0', basePrice: 4850 },
      ],
    },
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
  projects: [],
  activeProjectId: null,
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

export const DEFAULT_VISIBLE_COLUMNS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];