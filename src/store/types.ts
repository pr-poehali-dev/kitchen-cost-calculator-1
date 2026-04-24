export type Unit = 'м²' | 'м.п.' | 'шт' | 'компл' | 'л' | 'кг';

export type MaterialType =
  | 'ЛДСП'
  | 'МДФ'
  | 'ХДФ'
  | 'Фанера'
  | 'ДСП'
  | 'Стекло'
  | 'Зеркало'
  | 'Столешница'
  | 'Фасад'
  | 'Фурнитура'
  | 'Профиль'
  | 'Кромка'
  | 'Другое';

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  note?: string;
}

export interface Material {
  id: string;
  supplierId: string;
  name: string;
  type: MaterialType;
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
  type: 'fixed' | 'percent';
  value: number;
  note?: string;
}

export interface Settings {
  currency: string;
  markupMaterial: number;
  markupService: number;
  units: Unit[];
}

export interface CalcRow {
  id: string;
  materialId?: string;
  name: string;
  supplierId?: string;
  type?: MaterialType;
  color?: string;
  article?: string;
  thickness?: number;
  unit: Unit;
  qty: number;
  price: number;
}

export interface CalcBlock {
  id: string;
  name: string;
  rows: CalcRow[];
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

export interface AppState {
  suppliers: Supplier[];
  materials: Material[];
  services: Service[];
  expenses: ExpenseItem[];
  settings: Settings;
  projects: Project[];
  activeProjectId: string | null;
}
