export type Unit = string;

export interface MaterialType {
  id: string;
  name: string;
  color?: string;
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

export interface Material {
  id: string;
  manufacturerId: string;  // производитель (бренд)
  vendorId?: string;       // поставщик (дистрибьютор, опционально)
  name: string;
  typeId: string;
  thickness?: number;
  color?: string;
  article?: string;
  unit: Unit;
  basePrice: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  basePrice: number;
  note?: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  type: 'fixed' | 'percent' | 'markup';
  value: number;
  applyTo?: 'materials' | 'services' | 'total';
  note?: string;
}

export type CalcColumnKey = 'material' | 'manufacturer' | 'vendor' | 'article' | 'color' | 'thickness' | 'unit' | 'qty' | 'price';

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
  price: number;
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
}

export interface Settings {
  currency: string;
  markupMaterial: number;
  markupService: number;
  units: Unit[];
  materialTypes: MaterialType[];
}

export interface AppState {
  manufacturers: Manufacturer[];
  vendors: Vendor[];
  materials: Material[];
  services: Service[];
  expenses: ExpenseItem[];
  settings: Settings;
  projects: Project[];
  activeProjectId: string | null;
}
