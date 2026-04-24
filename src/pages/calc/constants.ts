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
  material: '2fr',
  manufacturer: '1fr',
  vendor: '1fr',
  article: '0.8fr',
  color: '1fr',
  thickness: '0.6fr',
  unit: '0.6fr',
  qty: '0.7fr',
  price: '1fr',
};

export const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
