import type { CalcColumnKey } from '@/store/types';

export const MESSENGERS = ['WhatsApp', 'Telegram', 'Viber', 'Звонок'] as const;

export const COLUMN_LABELS: Record<CalcColumnKey, string> = {
  material:     'Материал',
  manufacturer: 'Производитель',
  vendor:       'Поставщик',
  article:      'Артикул',
  color:        'Цвет',
  thickness:    'Толщ.',
  unit:         'Ед.',
  qty:          'Кол-во',
  baseprice:    'Зак. цена',
  price:        'Роз. цена',
  total:        'Сумма',
};

export const COLUMN_WIDTHS: Record<CalcColumnKey, string> = {
  material:     'minmax(140px, 2fr)',
  manufacturer: 'minmax(80px, 1fr)',
  vendor:       'minmax(80px, 1fr)',
  article:      'minmax(60px, 0.7fr)',
  color:        'minmax(80px, 1fr)',
  thickness:    '58px',
  unit:         '52px',
  qty:          '100px',
  baseprice:    'minmax(90px, 1fr)',
  price:        'minmax(90px, 1fr)',
  total:        'minmax(100px, 1fr)',
};

export const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
