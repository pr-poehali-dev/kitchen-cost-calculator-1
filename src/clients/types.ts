export type ClientStatus = 'new' | 'measure' | 'agreement' | 'production' | 'delivery' | 'done' | 'cancelled';

export const CLIENT_STATUSES: { id: ClientStatus; label: string; color: string }[] = [
  { id: 'new',        label: 'Новый лид',    color: '#6b7280' },
  { id: 'measure',    label: 'Замер',        color: '#3b82f6' },
  { id: 'agreement',  label: 'Согласование', color: '#f59e0b' },
  { id: 'production', label: 'Производство', color: '#8b5cf6' },
  { id: 'delivery',   label: 'Доставка',     color: '#06b6d4' },
  { id: 'done',       label: 'Закрыт',       color: '#10b981' },
  { id: 'cancelled',  label: 'Отменён',      color: '#ef4444' },
];

export interface ProductItem {
  id: string;
  name: string;
  qty: number;
}

export interface Client {
  id: string;
  status: ClientStatus;
  // Личные данные
  last_name: string;
  first_name: string;
  middle_name: string;
  phone: string;
  phone2: string;
  messenger: string;
  email: string;
  // Паспорт
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_date: string;
  passport_dept_code: string;
  // Адрес регистрации
  reg_city: string;
  reg_street: string;
  reg_house: string;
  reg_apt: string;
  // Адрес доставки
  delivery_city: string;
  delivery_street: string;
  delivery_house: string;
  delivery_apt: string;
  delivery_entrance: string;
  delivery_floor: string;
  delivery_elevator: string;
  delivery_note: string;
  // Договор
  contract_number: string;
  contract_date: string;
  products: ProductItem[];
  total_amount: number;
  payment_type: string;
  prepaid_amount: number;
  balance_due: number;
  custom_payment_scheme: string;
  // Сроки
  delivery_date: string;
  production_days: number;
  assembly_days: number;
  // Ответственные
  designer: string;
  measurer: string;
  // Сметы
  project_ids: string[];
  // Напоминание
  reminder_date: string;
  reminder_note: string;
  comment: string;
  // Мета
  created_at: string;
  updated_at: string;
}

export interface ClientPhoto {
  id: string;
  client_id: string;
  category: 'measure' | 'render' | 'done';
  url: string;
  name: string;
  uploaded_at: string;
}

export interface ClientHistoryItem {
  id: string;
  client_id: string;
  user_name: string;
  action: string;
  description: string;
  created_at: string;
}

export function clientFullName(c: Pick<Client, 'last_name' | 'first_name' | 'middle_name'>): string {
  return [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ') || 'Без имени';
}

export function emptyClient(): Omit<Client, 'id' | 'created_at' | 'updated_at'> {
  return {
    status: 'new',
    last_name: '', first_name: '', middle_name: '',
    phone: '', phone2: '', messenger: 'WhatsApp', email: '',
    passport_series: '', passport_number: '', passport_issued_by: '',
    passport_issued_date: '', passport_dept_code: '',
    reg_city: '', reg_street: '', reg_house: '', reg_apt: '',
    delivery_city: '', delivery_street: '', delivery_house: '', delivery_apt: '',
    delivery_entrance: '', delivery_floor: '', delivery_elevator: 'нет', delivery_note: '',
    contract_number: '', contract_date: '', products: [],
    total_amount: 0, payment_type: '100% предоплата',
    prepaid_amount: 0, balance_due: 0, custom_payment_scheme: '',
    delivery_date: '', production_days: 0, assembly_days: 0,
    designer: '', measurer: '',
    project_ids: [],
    reminder_date: '', reminder_note: '', comment: '',
  };
}
