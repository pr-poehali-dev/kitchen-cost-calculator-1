export type Unit = string;

export interface MaterialType {
  id: string;
  name: string;
  color?: string;
}

export interface MaterialCategory {
  id: string;
  name: string;
  typeId?: string;    // устарело, для совместимости
  typeIds?: string[]; // список типов (новый формат, заменяет typeId)
  note?: string;
}

// Производитель — бренд (Lamarty, Kronospan, Egger, Boyard)
export interface Manufacturer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  note?: string;
  materialTypeIds: string[];
}

// Поставщик — дистрибьютор (МАРШАЛ, Специалист, КДМ)
export interface Vendor {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  note?: string;
  materialTypeIds: string[];
}

// Supplier остаётся как алиас для обратной совместимости
export type Supplier = Manufacturer;

// Вариант материала — конкретный размер/толщина/параметры со своей ценой
// Используется для материалов у которых цена зависит от размера (столешницы, панели)
export interface MaterialVariant {
  id: string;
  size?: string;       // формат, напр. "4200×1200"
  thickness?: number;  // толщина мм
  params?: string;     // доп. параметры (подгиб, класс и т.п.)
  basePrice: number;   // закупочная
}

export interface Material {
  id: string;
  manufacturerId: string;  // производитель (бренд)
  vendorId?: string;       // поставщик (дистрибьютор, опционально)
  name: string;
  typeId: string;
  categoryId?: string;     // категория (Е1, Е2, Kapso...)
  thickness?: number;
  color?: string;
  article?: string;
  unit: Unit;
  basePrice: number;
  variants?: MaterialVariant[]; // варианты с разными размерами/ценами
}

export interface Service {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  basePrice: number;
  note?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;      // Персонал, Налоги, Накладные расходы…
  collapsed?: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  type: 'fixed' | 'percent' | 'markup';
  value: number;
  applyTo?: 'materials' | 'services' | 'total' | 'block';
  blockIds?: string[];  // если applyTo === 'block' — к каким блокам применяется
  groupId?: string;     // к какой группе расходов принадлежит
  enabled?: boolean;    // включена ли статья в расчёт (по умолчанию true)
  note?: string;
}

export type CalcColumnKey = 'material' | 'manufacturer' | 'vendor' | 'article' | 'color' | 'thickness' | 'unit' | 'qty' | 'baseprice' | 'price' | 'total';

export interface CalcBlock {
  id: string;
  name: string;
  allowedTypeIds: string[];
  visibleColumns: CalcColumnKey[];
  rows: CalcRow[];
}

export interface CalcRow {
  id: string;
  materialId?: string;
  name: string;
  manufacturerId?: string;
  vendorId?: string;
  typeId?: string;
  color?: string;
  article?: string;
  thickness?: number;
  unit: Unit;
  qty: number;
  basePrice?: number; // закупочная цена из карточки материала
  price: number;      // розничная цена (с наценкой)
}

export interface ServiceRow {
  id: string;
  serviceId?: string;
  name: string;
  unit: Unit;
  qty: number;
  price: number;
  note?: string;
}

export interface ServiceBlock {
  id: string;
  name: string;
  rows: ServiceRow[];
}

export interface ClientView {
  showPrices: boolean;         // показывать цены за единицу
  showManufacturer: boolean;   // показывать производителя
  showVendor: boolean;         // показывать поставщика
  showArticle: boolean;        // показывать артикул
  showThickness: boolean;      // показывать толщину
  showBlockTotals: boolean;    // показывать итог по каждому блоку
  showMaterialsTotal: boolean; // показывать строку "Материалы" в итоге
  showServicesTotal: boolean;  // показывать строку "Услуги" в итоге
  showExpenses: boolean;       // показывать расходы/наценки в итоге
  showGrandTotal: boolean;     // показывать итоговую сумму
  note: string;                // примечание для клиента в PDF
}

export interface Project {
  id: string;
  client: string;
  object: string;
  address: string;
  phone: string;
  messenger: 'WhatsApp' | 'Telegram' | 'Viber' | 'Звонок';
  createdAt: string;
  blocks: CalcBlock[];
  serviceBlocks: ServiceBlock[];
  clientView?: ClientView;
}

export interface Settings {
  currency: string;
  markupMaterial: number;
  markupService: number;
  units: Unit[];
  materialTypes: MaterialType[];
  materialCategories: MaterialCategory[];
}

// Шаблон расчёта — структура блоков без данных клиента и цен
export interface CalcTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  blocks: Array<{
    name: string;
    allowedTypeIds: string[];
    visibleColumns: CalcColumnKey[];
    rows: Array<{
      name: string;
      materialId?: string;
      unit: Unit;
      qty: number;
    }>;
  }>;
  serviceBlocks: Array<{
    name: string;
    rows: Array<{
      name: string;
      serviceId?: string;
      unit: Unit;
      qty: number;
    }>;
  }>;
}

// Сохранённый блок — шаблон с реальными строками материалов
export interface SavedBlock {
  id: string;
  name: string;
  note?: string;
  allowedTypeIds: string[];
  visibleColumns: CalcColumnKey[];
  rows: CalcRow[];
  createdAt: string;
}

export interface AppState {
  manufacturers: Manufacturer[];
  vendors: Vendor[];
  materials: Material[];
  services: Service[];
  expenseGroups: ExpenseGroup[];
  expenses: ExpenseItem[];
  settings: Settings;
  projects: Project[];
  activeProjectId: string | null;
  templates: CalcTemplate[];
  savedBlocks: SavedBlock[];
}