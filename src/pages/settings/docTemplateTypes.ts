import { API_URLS } from '@/config/api';

export const API = API_URLS.docTemplates;

export function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}

export function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

export const DOC_TYPES = [
  { id: 'contract',      label: 'Договор бытового подряда' },
  { id: 'tech',          label: 'Технический проект' },
  { id: 'rules',         label: 'Правила эксплуатации' },
  { id: 'act',           label: 'Акт выполненных работ' },
  { id: 'delivery',      label: 'Договор доставки' },
  { id: 'delivery_calc', label: 'Калькуляция доставки' },
  { id: 'delivery_lift', label: 'Прайс доп. услуг доставки' },
  { id: 'act_delivery',  label: 'Акт приёма доставки' },
  { id: 'assembly',      label: 'Договор сборки' },
  { id: 'assembly_calc', label: 'Калькуляция сборки' },
  { id: 'assembly_extra',label: 'Прайс доп. услуг сборки' },
  { id: 'act_assembly',  label: 'Акт выполненных работ сборки' },
  { id: 'addendum',     label: 'Дополнительное соглашение' },
  { id: 'tech_spec',    label: 'Спецификация на технику' },
];

export const VAR_GROUPS: { label: string; vars: { key: string; desc: string; preview: string }[] }[] = [
  {
    label: 'Клиент',
    vars: [
      { key: '{{имя_клиента}}',        desc: 'ФИО клиента',              preview: 'Иванов Иван Иванович' },
      { key: '{{телефон_клиента}}',     desc: 'Телефон клиента',          preview: '+7 (999) 123-45-67' },
      { key: '{{телефон2_клиента}}',    desc: 'Доп. телефон',             preview: '+7 (999) 765-43-21' },
      { key: '{{email_клиента}}',       desc: 'Email клиента',            preview: 'ivanov@mail.ru' },
      { key: '{{паспорт}}',            desc: 'Серия и номер паспорта',    preview: '4520 123456' },
      { key: '{{паспорт_выдан}}',      desc: 'Кем выдан паспорт',        preview: 'ОУФМС по г. Москве' },
      { key: '{{паспорт_дата}}',       desc: 'Дата выдачи паспорта',      preview: '15.03.2015' },
      { key: '{{паспорт_код}}',        desc: 'Код подразделения',         preview: '770-001' },
      { key: '{{адрес_регистрации}}',  desc: 'Адрес регистрации',        preview: 'г. Москва, ул. Ленина, д. 5, кв. 12' },
      { key: '{{адрес_доставки}}',     desc: 'Адрес доставки',           preview: 'г. Москва, ул. Садовая, д. 3, кв. 8' },
    ],
  },
  {
    label: 'Договор',
    vars: [
      { key: '{{номер_договора}}',     desc: 'Номер договора',           preview: '877' },
      { key: '{{дата_договора}}',      desc: 'Дата договора',            preview: '02 мая 2026 г.' },
      { key: '{{сумма}}',              desc: 'Итоговая сумма',           preview: '350 000' },
      { key: '{{сумма_прописью}}',     desc: 'Сумма прописью',           preview: 'триста пятьдесят тысяч рублей' },
      { key: '{{аванс}}',              desc: 'Сумма предоплаты',         preview: '175 000' },
      { key: '{{остаток}}',            desc: 'Остаток к оплате',         preview: '175 000' },
      { key: '{{тип_оплаты}}',         desc: 'Тип оплаты',              preview: 'наличные' },
      { key: '{{стоимость_доставки}}', desc: 'Стоимость доставки',       preview: '3 000' },
      { key: '{{стоимость_сборки}}',   desc: 'Стоимость сборки',         preview: '8 000' },
    ],
  },
  {
    label: 'Сроки',
    vars: [
      { key: '{{срок_изготовления}}',  desc: 'Срок изготовления (дней)', preview: '30' },
      { key: '{{срок_сборки}}',        desc: 'Срок сборки (дней)',       preview: '2' },
      { key: '{{дата_доставки}}',      desc: 'Дата доставки',            preview: '15 июня 2026 г.' },
    ],
  },
  {
    label: 'Компания',
    vars: [
      { key: '{{компания}}',           desc: 'Название компании',        preview: 'ООО «Интерьерные Решения»' },
      { key: '{{менеджер}}',           desc: 'Имя менеджера',            preview: 'Сазонов Василий Николаевич' },
      { key: '{{дизайнер}}',           desc: 'Имя дизайнера',            preview: 'Петрова Анна Сергеевна' },
    ],
  },
];

export const VARS = VAR_GROUPS.flatMap(g => g.vars.map(v => v.key));

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export type ConditionField =
  | 'payment_type'
  | 'has_delivery'
  | 'has_assembly'
  | 'has_credit'
  | 'prepaid_percent'
  | 'total_amount';

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'set' | 'not_set';

export interface BlockCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value?: string;
}

export const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'payment_type',    label: 'Тип оплаты' },
  { value: 'has_delivery',    label: 'Есть доставка' },
  { value: 'has_assembly',    label: 'Есть сборка' },
  { value: 'has_credit',      label: 'Рассрочка / кредит' },
  { value: 'prepaid_percent', label: 'Процент аванса' },
  { value: 'total_amount',    label: 'Сумма договора' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: 'eq',      label: 'равно',              needsValue: true },
  { value: 'neq',     label: 'не равно',           needsValue: true },
  { value: 'gt',      label: 'больше чем',         needsValue: true },
  { value: 'lt',      label: 'меньше чем',         needsValue: true },
  { value: 'set',     label: 'указано',            needsValue: false },
  { value: 'not_set', label: 'не указано',         needsValue: false },
];

export const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash',       label: 'Наличные' },
  { value: 'card',       label: 'Карта' },
  { value: 'transfer',   label: 'Перевод' },
  { value: 'credit',     label: 'Рассрочка' },
  { value: 'installment',label: 'Рассрочка (магазин)' },
];

// Настройки блока «Таблица из расчёта»
export type CalcTableColumn = 'name' | 'qty' | 'unit' | 'price' | 'total' | 'article' | 'manufacturer';

export const CALC_TABLE_COLUMNS: { key: CalcTableColumn; label: string; defaultOn: boolean }[] = [
  { key: 'name',         label: 'Наименование',  defaultOn: true },
  { key: 'qty',          label: 'Кол-во',         defaultOn: true },
  { key: 'unit',         label: 'Ед. изм.',        defaultOn: true },
  { key: 'price',        label: 'Цена',            defaultOn: false },
  { key: 'total',        label: 'Сумма',           defaultOn: true },
  { key: 'article',      label: 'Артикул',         defaultOn: false },
  { key: 'manufacturer', label: 'Производитель',   defaultOn: false },
];

export interface CalcTableSettings {
  columns: CalcTableColumn[];       // какие колонки показывать
  showBlockHeaders: boolean;        // показывать заголовки блоков
  showServices: boolean;            // включать услуги
  showTotal: boolean;               // итоговая строка
  priceMode: 'client' | 'base';    // розничная или закупочная цена
}

export const DEFAULT_CALC_TABLE_SETTINGS: CalcTableSettings = {
  columns: ['name', 'qty', 'unit', 'total'],
  showBlockHeaders: true,
  showServices: true,
  showTotal: true,
  priceMode: 'client',
};

export interface Block {
  id: string;
  type: string;
  label: string;
  content: string;
  enabled: boolean;
  // Условие показа блока (опционально)
  condition?: BlockCondition;
  // Типографика блока (опциональные — применяются поверх глобальных настроек шаблона)
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: BlockAlign;
  marginTop?: number;
  marginBottom?: number;
  // Для таблиц: ширины колонок в процентах (сумма = 100)
  colWidths?: number[];
  // Для блока calc_table: настройки таблицы из расчёта
  calcTableSettings?: CalcTableSettings;
}

export interface Template {
  id: string;
  doc_type: string;
  name: string;
  is_default: boolean;
  blocks: Block[];
  settings: Record<string, string | number | boolean>;
}

// Строит inline-style для блока на основе его типографики и глобального fontSize
export function blockStyle(b: Block, globalFontSize: number): string {
  const parts: string[] = [];
  if (b.fontSize)        parts.push(`font-size:${b.fontSize}pt`);
  if (b.bold)            parts.push('font-weight:bold');
  if (b.italic)          parts.push('font-style:italic');
  if (b.underline)       parts.push('text-decoration:underline');
  if (b.align)           parts.push(`text-align:${b.align}`);
  if (b.marginTop)       parts.push(`margin-top:${b.marginTop}mm`);
  if (b.marginBottom)    parts.push(`margin-bottom:${b.marginBottom}mm`);
  // Для таблицы font-size нужен отдельно
  if (!b.fontSize && b.type === 'table') parts.push(`font-size:${globalFontSize}pt`);
  return parts.join(';');
}

// Парсит content таблицы в двумерный массив строк
export function parseTableContent(content: string): string[][] {
  return content.split('\n').filter(r => r.trim()).map(r => r.split(';'));
}

// Сериализует двумерный массив обратно в content
export function serializeTableContent(rows: string[][]): string {
  return rows.map(r => r.join(';')).join('\n');
}

const PREVIEW_VALUES: Record<string, string> = {
  '{{имя_клиента}}':        'Иванов Иван Иванович',
  '{{телефон_клиента}}':    '+7 (999) 123-45-67',
  '{{телефон2_клиента}}':   '+7 (999) 765-43-21',
  '{{email_клиента}}':      'ivanov@mail.ru',
  '{{паспорт}}':            '4520 123456',
  '{{паспорт_выдан}}':      'ОУФМС по г. Москве',
  '{{паспорт_дата}}':       '15.03.2015',
  '{{паспорт_код}}':        '770-001',
  '{{адрес_регистрации}}':  'г. Москва, ул. Ленина, д. 5, кв. 12',
  '{{адрес_доставки}}':     'г. Москва, ул. Садовая, д. 3, кв. 8',
  '{{номер_договора}}':     '877',
  '{{дата_договора}}':      '02 мая 2026 г.',
  '{{сумма}}':              '350 000',
  '{{сумма_прописью}}':     'триста пятьдесят тысяч рублей',
  '{{аванс}}':              '175 000',
  '{{остаток}}':            '175 000',
  '{{тип_оплаты}}':         'наличные',
  '{{стоимость_доставки}}': '3 000',
  '{{стоимость_сборки}}':   '8 000',
  '{{срок_изготовления}}':  '30',
  '{{срок_сборки}}':        '2',
  '{{дата_доставки}}':      '15 июня 2026 г.',
  '{{компания}}':           'ООО «Интерьерные Решения»',
  '{{менеджер}}':           'Сазонов Василий Николаевич',
  '{{дизайнер}}':           'Петрова Анна Сергеевна',
};

function applyPreviewVars(text: string): string {
  return Object.entries(PREVIEW_VALUES).reduce(
    (t, [key, val]) => t.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val),
    text
  );
}

export function buildPreviewHtml(template: Template): string {
  const blocks = template.blocks.filter(b => b.enabled);
  const s = template.settings as Record<string, number | string>;
  const globalFontSize = (s.fontSize as number) || 9.5;
  const lineHeight = (s.lineHeight as number) || 1.0;
  const fontFamily = (s.fontFamily as string) || 'Times New Roman';
  const fallbackMargin = (s.marginMm as number) || 10;
  const mLeft   = (s.marginLeft   as number) ?? fallbackMargin;
  const mRight  = (s.marginRight  as number) ?? fallbackMargin;
  const mTop    = (s.marginTop    as number) ?? fallbackMargin;
  const mBottom = (s.marginBottom as number) ?? fallbackMargin;
  const landscape = s.orientation === 'landscape';
  const pageW = landscape ? '297mm' : '210mm';
  const pageH = landscape ? '210mm' : '297mm';

  const rendered = blocks.map(b => {
    const text = applyPreviewVars(b.content).replace(/\n/g, '<br/>');

    const style = blockStyle(b, globalFontSize);
    const styleAttr = style ? ` style="${style}"` : '';

    if (b.type === 'header') {
      const hStyle = blockStyle({ ...b, align: b.align ?? 'center' }, globalFontSize) || 'text-align:center;font-size:8.5pt';
      return `<p style="${hStyle}">${text}</p>`;
    }
    const mt = b.marginTop    != null ? `${b.marginTop}mm`    : null;
    const mb = b.marginBottom != null ? `${b.marginBottom}mm` : null;

    if (b.type === 'section') {
      const sStyle = [
        'font-weight:bold',
        `text-align:${b.align ?? 'center'}`,
        b.fontSize  ? `font-size:${b.fontSize}pt`       : '',
        b.italic    ? 'font-style:italic'               : '',
        b.underline ? 'text-decoration:underline'       : '',
        `margin-top:${mt ?? '8px'}`,
        `margin-bottom:${mb ?? '3px'}`,
      ].filter(Boolean).join(';');
      return `<p style="${sStyle}">${text}</p>`;
    }
    if (b.type === 'divider') {
      const dStyle = `border:none;border-top:1px solid #000;${mt ? `margin-top:${mt};` : 'margin-top:8px;'}${mb ? `margin-bottom:${mb}` : 'margin-bottom:8px'}`;
      return `<hr style="${dStyle}"/>`;
    }
    if (b.type === 'spacer')  return `<div style="height:${b.content || 20}px${mt ? `;margin-top:${mt}` : ''}${mb ? `;margin-bottom:${mb}` : ''}"></div>`;
    if (b.type === 'image') {
      const url = b.content || '';
      const w = (b as Block & { imageWidth?: number }).imageWidth;
      const align = b.align ?? 'center';
      const wStyle = w ? `max-width:${w}mm;` : 'max-width:100%;';
      const wrapStyle = `text-align:${align};${mt ? `margin-top:${mt};` : 'margin-top:6px;'}${mb ? `margin-bottom:${mb}` : 'margin-bottom:6px'}`;
      if (!url) return `<div style="${wrapStyle};border:1px dashed #ccc;padding:20px;color:#999;font-size:9pt">[ Фото технического проекта ]</div>`;
      return `<div style="${wrapStyle}"><img src="${url}" style="${wStyle}max-height:180mm;object-fit:contain;" /></div>`;
    }
    if (b.type === 'lines') {
      const count = parseInt(b.content) || 6;
      const wrapStyle = `${mt ? `margin-top:${mt};` : ''}${mb ? `margin-bottom:${mb}` : ''}`;
      const lines = Array(count).fill(0).map(() =>
        `<div style="border-bottom:1px solid #000;height:22px;margin-bottom:4px"></div>`
      ).join('');
      return wrapStyle ? `<div style="${wrapStyle}">${lines}</div>` : lines;
    }
    if (b.type === 'table') {
      const rows = b.content.split('\n').filter(r => r.trim());
      if (!rows.length) return '';
      const header = rows[0].split(';');
      const body = rows.slice(1);
      const tFontSize = b.fontSize ?? globalFontSize;
      const colWidths: number[] = b.colWidths && b.colWidths.length === header.length
        ? b.colWidths
        : header.map(() => Math.round(100 / header.length));
      const tStyle = [
        b.bold      ? 'font-weight:bold'          : '',
        b.italic    ? 'font-style:italic'         : '',
        b.underline ? 'text-decoration:underline' : '',
        mt ? `margin-top:${mt}`    : 'margin-top:6px',
        mb ? `margin-bottom:${mb}` : 'margin-bottom:6px',
      ].filter(Boolean).join(';');
      const colgroup = colWidths.map(w => `<col style="width:${w}%"/>`).join('');
      return `<table style="width:100%;border-collapse:collapse;font-size:${tFontSize}pt;table-layout:fixed;${tStyle}">
        <colgroup>${colgroup}</colgroup>
        <tr>${header.map(h => `<th style="border:1px solid #000;padding:3px 5px;background:#f0f0f0;font-weight:bold;word-break:break-word">${h}</th>`).join('')}</tr>
        ${body.map(r => `<tr>${r.split(';').map(c => `<td style="border:1px solid #000;padding:3px 5px;word-break:break-word">${c}</td>`).join('')}</tr>`).join('')}
      </table>`;
    }
    // paragraph и прочие
    if (b.type === 'calc_table') {
      const cts = b.calcTableSettings || { columns: ['name','qty','unit','total'], showBlockHeaders: true, showServices: true, showTotal: true, priceMode: 'client' };
      const colLabels: Record<string, string> = { name:'Наименование', qty:'Кол-во', unit:'Ед.', price:'Цена', total:'Сумма', article:'Артикул', manufacturer:'Производитель' };
      const mockRows = [
        { name:'ЛДСП белый 16мм', qty:8.4, unit:'м²', price:1200, total:10080, article:'A101', manufacturer:'Кроностар' },
        { name:'МДФ фрезерованный', qty:2.1, unit:'м²', price:3500, total:7350, article:'M205', manufacturer:'Kastamonu' },
        { name:'Петля Blum', qty:24, unit:'шт', price:180, total:4320, article:'B72', manufacturer:'Blum' },
      ];
      const serviceRows = [
        { name:'Сборка', qty:1, unit:'усл.', price:8000, total:8000, article:'', manufacturer:'' },
      ];
      const ths = cts.columns.map(c => `<th style="border:1px solid #999;padding:3px 5px;background:#f0f0f0;font-weight:bold;font-size:${globalFontSize}pt">${colLabels[c]||c}</th>`).join('');
      const renderRow = (r: typeof mockRows[0]) =>
        `<tr>${cts.columns.map(c => `<td style="border:1px solid #ddd;padding:2px 5px;font-size:${globalFontSize}pt">${
          c==='qty' ? r.qty : c==='unit' ? r.unit : c==='price' ? r.price.toLocaleString('ru') : c==='total' ? r.total.toLocaleString('ru') : c==='article' ? r.article : c==='manufacturer' ? r.manufacturer : r.name
        }</td>`).join('')}</tr>`;
      const grandTotal = [...mockRows, ...(cts.showServices ? serviceRows : [])].reduce((s,r)=>s+r.total,0);
      const wrapStyle = `${mt?`margin-top:${mt};`:'margin-top:6px;'}${mb?`margin-bottom:${mb}`:'margin-bottom:6px'}`;
      return `<div style="${wrapStyle}">
        ${cts.showBlockHeaders ? `<p style="font-weight:bold;font-size:${globalFontSize}pt;margin:0 0 3px">Корпусные материалы</p>` : ''}
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tr>${ths}</tr>
          ${mockRows.map(renderRow).join('')}
          ${cts.showServices ? `<tr><td colspan="${cts.columns.length}" style="border:1px solid #ddd;padding:3px 5px;font-weight:bold;font-size:${globalFontSize}pt;background:#f9f9f9">Услуги</td></tr>${serviceRows.map(renderRow).join('')}` : ''}
          ${cts.showTotal ? `<tr><td colspan="${cts.columns.length-1}" style="border:1px solid #999;padding:3px 5px;font-weight:bold;font-size:${globalFontSize}pt;text-align:right">Итого:</td><td style="border:1px solid #999;padding:3px 5px;font-weight:bold;font-size:${globalFontSize}pt">${grandTotal.toLocaleString('ru')} ₽</td></tr>` : ''}
        </table>
      </div>`;
    }

    const pStyle = [
      style,
      mt ? `margin-top:${mt}`    : '',
      mb ? `margin-bottom:${mb}` : '',
    ].filter(Boolean).join(';');
    return `<p${pStyle ? ` style="${pStyle}"` : ''}>${text}</p>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page{size:${pageW} ${pageH};margin:${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#e8e8e8;font-family:'${fontFamily}',serif;font-size:${globalFontSize}pt;line-height:${lineHeight}}
  h1{text-align:center;font-size:${globalFontSize + 1}pt}
  p{margin:0 0 2px;text-align:justify;white-space:pre-wrap}
  /* Обёртка всех листов */
  .pages-wrap{padding:12px;display:flex;flex-direction:column;gap:12px;align-items:center}
  /* Один лист */
  .page{
    width:${pageW};
    height:${pageH};
    background:#fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    padding:${mTop}mm ${mRight}mm ${mBottom}mm ${mLeft}mm;
    overflow:hidden;
    position:relative;
    page-break-after:always;
  }
  @media print{
    html,body{background:#fff}
    .pages-wrap{padding:0;gap:0}
    .page{box-shadow:none;page-break-after:always}
  }
</style>
<script>
window.addEventListener('load', function() {
  var source = document.getElementById('content-source');
  var pagesWrap = document.getElementById('pages-wrap');
  var children = Array.from(source.children);

  function makePage() {
    var p = document.createElement('div');
    p.className = 'page';
    pagesWrap.appendChild(p);
    return p;
  }

  var cur = makePage();
  children.forEach(function(el) {
    var clone = el.cloneNode(true);
    cur.appendChild(clone);
    if (cur.scrollHeight > cur.clientHeight) {
      cur.removeChild(clone);
      cur = makePage();
      cur.appendChild(clone);
    }
  });
});
</script>
</head><body>
<div id="content-source" style="display:none">
${rendered}
</div>
<div id="pages-wrap" class="pages-wrap"></div>
</body></html>`;
}