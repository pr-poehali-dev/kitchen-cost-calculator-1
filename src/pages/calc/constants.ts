import type { CalcColumnKey } from '@/store/types';

export const MESSENGERS = ['WhatsApp', 'Telegram', 'Viber', 'Звонок'] as const;

export const COLUMN_LABELS: Record<CalcColumnKey, string> = {
  material: 'Материал',
  manufacturer: 'Производитель',
  vendor: 'Поставщик',
  article: 'Артикул',
  color: 'Цвет',
  thickness: 'Толщина',
  unit: 'Ед. изм.',
  qty: 'Кол-во',
  price: 'Цена',
};

export const COLUMN_WIDTHS: Record<CalcColumnKey, string> = {
  material: 'minmax(140px, 2fr)',
  manufacturer: 'minmax(80px, 1fr)',
  vendor: 'minmax(80px, 1fr)',
  article: 'minmax(60px, 0.7fr)',
  color: 'minmax(80px, 1fr)',
  thickness: '60px',
  unit: '56px',
  qty: '96px',
  price: 'minmax(100px, 1.2fr)',
};

export const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });