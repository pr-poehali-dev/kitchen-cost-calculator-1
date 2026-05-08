import { blockStyle } from './docTemplateTypes';
import type { Block, Template } from './docTemplateTypes';
import { getLetterhead, type LetterheadContext } from './docTemplateLetterheads';

// ── Превью-значения переменных ──────────────────────────────────────────────
const PREVIEW_VALUES: Record<string, string> = {
  // Клиент
  '{{имя_клиента}}':          'Иванов Иван Иванович',
  '{{имя_клиента_рп}}':       'Иванова Ивана Ивановича',
  '{{фамилия}}':              'Иванов',
  '{{имя}}':                  'Иван',
  '{{отчество}}':             'Иванович',
  '{{телефон_клиента}}':      '+7 (999) 123-45-67',
  '{{телефон}}':              '+7 (999) 123-45-67',
  '{{телефон2_клиента}}':     '+7 (999) 765-43-21',
  '{{телефон2}}':             '+7 (999) 765-43-21',
  '{{email_клиента}}':        'ivanov@mail.ru',
  '{{email}}':                'ivanov@mail.ru',
  '{{мессенджер}}':           'WhatsApp',
  // Паспорт
  '{{паспорт}}':              '4520 123456',
  '{{паспорт_серия}}':        '4520',
  '{{паспорт_номер}}':        '123456',
  '{{паспорт_выдан}}':        'ОУФМС по г. Москве',
  '{{паспорт_дата}}':         '15.03.2015',
  '{{паспорт_код}}':          '770-001',
  // Адреса
  '{{адрес_регистрации}}':    'г. Москва, ул. Ленина, д. 5, кв. 12',
  '{{город_клиента}}':        'г. Москва',
  '{{адрес_доставки}}':       'г. Москва, ул. Садовая, д. 3, кв. 8',
  '{{город_доставки}}':       'г. Москва',
  '{{улица_доставки}}':       'ул. Садовая',
  '{{дом_доставки}}':         'д. 3',
  '{{квартира_доставки}}':    'кв. 8',
  '{{этаж_доставки}}':        '5',
  '{{подъезд_доставки}}':     '2',
  '{{примечание_доставки}}':  'Домофон 85',
  // Договор
  '{{номер_договора}}':       '877',
  '{{дата_договора}}':        '02 мая 2026 г.',
  '{{дата_договора_кратко}}': '02.05.2026',
  '{{сумма}}':                '350 000',
  '{{сумма_прописью}}':       'триста пятьдесят тысяч рублей',
  '{{аванс}}':                '175 000',
  '{{аванс_прописью}}':       'сто семьдесят пять тысяч рублей',
  '{{остаток}}':              '175 000',
  '{{остаток_прописью}}':     'сто семьдесят пять тысяч рублей',
  '{{тип_оплаты}}':           'наличные',
  '{{схема_оплаты}}':         '50% аванс, 50% при сдаче',
  '{{стоимость_доставки}}':   '3 000',
  '{{доставка_прописью}}':    'три тысячи рублей',
  '{{стоимость_сборки}}':     '8 000',
  '{{сборка_прописью}}':      'восемь тысяч рублей',
  // Сроки
  '{{срок_изготовления}}':    '30',
  '{{срок_сборки}}':          '2',
  '{{дата_доставки}}':        '15 июня 2026 г.',
  '{{дата_доставки_полная}}': '15 июня 2026 г.',
  // Кредит
  '{{номер_кредита}}':        'КД-12345',
  '{{дата_кредита}}':         '02 мая 2026 г.',
  '{{банк_кредита}}':         'Сбербанк',
  '{{аванс_кредит}}':         '175 000',
  '{{остаток_кредит}}':       '175 000',
  // Фото проекта
  '{{фото_проекта}}':         'https://placehold.co/800x500/1a1a2e/4ade80?text=Фото+проекта',
  // Техпроект
  '{{корпус}}':               'ЛДСП Белый 16мм',
  '{{корпус2}}':              'ЛДСП Дуб Сонома',
  '{{фасад}}':                'МДФ Белый матовый',
  '{{фасад2}}':               'Стекло чёрное',
  '{{столешница}}':           'Кварц Белый 20мм',
  '{{стеновая}}':             'Стекло с фотопечатью',
  '{{подсветка}}':            'LED лента',
  '{{цвет_подсветки}}':       'Тёплый белый',
  '{{фрезеровка}}':           'Милано',
  // Компания
  '{{компания}}':             'ООО «Интерьерные Решения»',
  '{{город}}':                'г. Саратов',
  '{{инн}}':                  '6450106826',
  '{{огрн}}':                 '1196451012251',
  '{{кпп}}':                  '645001001',
  '{{инн_кпп}}':              '6450106826/645001001',
  '{{адрес_компании}}':       'г. Саратов, ул. Рабочая, д. 1',
  '{{телефон_компании}}':     '+7 (845) 000-00-00',
  '{{email_компании}}':       'info@company.ru',
  '{{сайт_компании}}':        'www.company.ru',
  '{{директор}}':             'Петров Алексей Владимирович',
  '{{должность_директора}}':  'Генеральный директор',
  '{{банк}}':                 'ПАО Сбербанк',
  '{{бик}}':                  '042401645',
  '{{расчётный_счёт}}':       '40702810300000012345',
  '{{корр_счёт}}':            '30101810200000000645',
  // Ответственные
  '{{менеджер}}':             'Сазонов Василий Николаевич',
  '{{менеджер_рп}}':          'Сазонова Василия Николаевича',
  '{{дизайнер}}':             'Петрова Анна Сергеевна',
  '{{замерщик}}':             'Козлов Дмитрий Игоревич',
  // Доверенность менеджера
  '{{номер_доверенности}}':   '20',
  '{{дата_доверенности}}':    '12.01.2026',
  // Прописи сроков
  '{{срок_изготовления_прописью}}': 'тридцать',
  '{{срок_сборки_прописью}}':       'два',
};

export function applyPreviewVars(text: string): string {
  return Object.entries(PREVIEW_VALUES).reduce(
    (t, [key, val]) => t.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val),
    text
  );
}

// ── Условия блоков для превью ───────────────────────────────────────────────
const PREVIEW_CONDITION_VALS: Record<string, string> = {
  payment_type: 'cash',
  has_delivery: 'false',
  has_assembly: 'false',
  has_credit:   'false',
};

function evalCondition(condition: Block['condition']): boolean {
  if (!condition) return true;
  const val = PREVIEW_CONDITION_VALS[condition.field] ?? '';
  switch (condition.operator) {
    case 'eq':      return val === (condition.value ?? '');
    case 'neq':     return val !== (condition.value ?? '');
    case 'gt':      return parseFloat(val) > parseFloat(condition.value ?? '0');
    case 'lt':      return parseFloat(val) < parseFloat(condition.value ?? '0');
    case 'set':     return val !== '' && val !== 'false';
    case 'not_set': return val === '' || val === 'false';
    default: return true;
  }
}

// ── Рендер блоков ───────────────────────────────────────────────────────────
function renderBlock(b: Block, globalFontSize: number): string {
  const text = applyPreviewVars(b.content).replace(/\n/g, '<br/>');
  const style = blockStyle(b, globalFontSize);
  const mt = b.marginTop    != null ? `${b.marginTop}mm`    : null;
  const mb = b.marginBottom != null ? `${b.marginBottom}mm` : null;

  if (b.type === 'header') {
    const hStyle = blockStyle({ ...b, align: b.align ?? 'center' }, globalFontSize) || 'text-align:center;font-size:8.5pt';
    return `<p style="${hStyle}">${text}</p>`;
  }

  if (b.type === 'section') {
    const sStyle = [
      'font-weight:bold',
      `text-align:${b.align ?? 'center'}`,
      b.fontSize  ? `font-size:${b.fontSize}pt`  : '',
      b.italic    ? 'font-style:italic'           : '',
      b.underline ? 'text-decoration:underline'   : '',
      `margin-top:${mt ?? '8px'}`,
      `margin-bottom:${mb ?? '3px'}`,
    ].filter(Boolean).join(';');
    return `<p style="${sStyle}">${text}</p>`;
  }

  if (b.type === 'divider') {
    const dStyle = `border:none;border-top:1px solid #000;${mt ? `margin-top:${mt};` : 'margin-top:8px;'}${mb ? `margin-bottom:${mb}` : 'margin-bottom:8px'}`;
    return `<hr style="${dStyle}"/>`;
  }

  if (b.type === 'spacer') {
    return `<div style="height:${b.content || 20}px${mt ? `;margin-top:${mt}` : ''}${mb ? `;margin-bottom:${mb}` : ''}"></div>`;
  }

  if (b.type === 'image') {
    const url = applyPreviewVars(b.content || '');
    const w = b.imageWidth;
    const h = b.imageHeight;
    const align = b.align ?? 'center';
    const imgStyle = [
      'display:block;',
      w ? `width:${w}mm;max-width:100%;` : 'width:100%;max-width:100%;',
      h ? `height:${h}mm;object-fit:cover;` : 'height:auto;object-fit:contain;',
    ].join('');
    const wrapStyle = `text-align:${align};${mt ? `margin-top:${mt};` : 'margin-top:6px;'}${mb ? `margin-bottom:${mb}` : 'margin-bottom:6px'}`;
    const marginStyle = align === 'center' ? 'margin-left:auto;margin-right:auto;' : align === 'right' ? 'margin-left:auto;' : '';
    if (!url) return `<div style="${wrapStyle};border:1px dashed #ccc;padding:20px;color:#999;font-size:9pt;text-align:center">[ Фото технического проекта ]</div>`;
    return `<div style="${wrapStyle}"><img src="${url}" style="${imgStyle}${marginStyle}" /></div>`;
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
    const colAligns = b.colAligns && b.colAligns.length === header.length
      ? b.colAligns
      : header.map(() => 'left' as const);
    const rh = b.rowHeight ? `height:${b.rowHeight}mm;` : '';
    const cellPad = b.rowHeight ? `padding:0 5px;vertical-align:middle;` : `padding:3px 5px;`;
    return `<table style="width:100%;border-collapse:collapse;font-size:${tFontSize}pt;table-layout:fixed;${tStyle}">
      <colgroup>${colgroup}</colgroup>
      <tr style="${rh}">${header.map((h, ci) => `<th style="border:1px solid #000;${cellPad}background:#f0f0f0;font-weight:bold;word-break:break-word;text-align:${colAligns[ci]}">${h}</th>`).join('')}</tr>
      ${body.map(r => `<tr style="${rh}">${r.split(';').map((c, ci) => `<td style="border:1px solid #000;${cellPad}word-break:break-word;text-align:${colAligns[ci] ?? 'left'}">${c}</td>`).join('')}</tr>`).join('')}
    </table>`;
  }

  if (b.type === 'two_col') {
    const sep = b.content.indexOf('\n---\n');
    const leftRaw  = sep >= 0 ? b.content.slice(0, sep)  : b.content;
    const rightRaw = sep >= 0 ? b.content.slice(sep + 5) : '';
    const leftHtml  = applyPreviewVars(leftRaw).replace(/\n/g, '<br/>');
    const rightHtml = applyPreviewVars(rightRaw).replace(/\n/g, '<br/>');
    const gap = b.twoColGap ?? 4;
    const twoStyle = [
      `margin-top:${mt ?? '6px'}`,
      `margin-bottom:${mb ?? '6px'}`,
      b.fontSize  ? `font-size:${b.fontSize}pt`    : `font-size:${globalFontSize}pt`,
      b.bold      ? 'font-weight:bold'              : '',
      b.italic    ? 'font-style:italic'             : '',
      b.underline ? 'text-decoration:underline'     : '',
    ].filter(Boolean).join(';');
    // Выравнивание: новые поля имеют приоритет; twoColRightAlign — обратная совместимость
    const leftAlign  = b.twoColLeftAlign  ?? 'left';
    const rightAlign = b.twoColRightAlignVal ?? (b.twoColRightAlign ? 'right' : 'left');
    return `<div style="display:table;width:100%;${twoStyle}">
      <div style="display:table-cell;width:50%;vertical-align:top;padding-right:${gap}mm;text-align:${leftAlign}">${leftHtml}</div>
      <div style="display:table-cell;width:50%;vertical-align:top;padding-left:${gap}mm;text-align:${rightAlign}">${rightHtml}</div>
    </div>`;
  }

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
    const grandTotal = [...mockRows, ...(cts.showServices ? serviceRows : [])].reduce((s,r) => s + r.total, 0);
    const wrapStyle = `${mt ? `margin-top:${mt};` : 'margin-top:6px;'}${mb ? `margin-bottom:${mb}` : 'margin-bottom:6px'}`;
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

  // paragraph и прочие
  const pStyle = [style, mt ? `margin-top:${mt}` : '', mb ? `margin-bottom:${mb}` : ''].filter(Boolean).join(';');
  return `<p${pStyle ? ` style="${pStyle}"` : ''}>${text}</p>`;
}

// ── Главная функция сборки HTML превью ─────────────────────────────────────
export function buildPreviewHtml(template: Template): string {
  const blocks = template.blocks.filter(b => b.enabled && evalCondition(b.condition));
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

  // ── Letterhead ──────────────────────────────────────────────────────────
  const lhId = (s.letterhead as string) || 'none';
  const lhColor = (s.accentColor as string) || '#c0392b';
  const lhCtx: LetterheadContext = {
    accentColor:   lhColor,
    company:       applyPreviewVars((s.lhCompany  as string) || '{{компания}}'),
    phone:         applyPreviewVars((s.lhPhone    as string) || '{{телефон_компании}}'),
    email:         applyPreviewVars((s.lhEmail    as string) || '{{email_компании}}'),
    address:       applyPreviewVars((s.lhAddress  as string) || '{{адрес_компании}}'),
    website:       applyPreviewVars((s.lhWebsite  as string) || '{{сайт_компании}}'),
    logoUrl:       (s.lhLogoUrl      as string)  || undefined,
    logoPosition:  (s.lhLogoPosition as string)  as LetterheadContext['logoPosition'] || 'left',
    logoHeight:    s.lhLogoHeight ? Number(s.lhLogoHeight) : 12,
  };
  const lhDef = getLetterhead(lhId);
  const lh = lhDef.build(lhCtx);

  // Добавляем letterhead к отступам страницы, чтобы контент не наползал
  const contentPaddingTop    = mTop + lh.headerHeightMm;
  const contentPaddingBottom = mBottom + lh.footerHeightMm;

  const rendered = blocks.map(b => renderBlock(b, globalFontSize)).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page{size:${pageW} ${pageH};margin:0}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#e8e8e8;font-family:'${fontFamily}',serif;font-size:${globalFontSize}pt;line-height:${lineHeight}}
  p{margin:0 0 2px;white-space:pre-wrap}
  .page{width:${pageW};min-height:${pageH};background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);padding:${contentPaddingTop}mm ${mRight}mm ${contentPaddingBottom}mm ${mLeft}mm;margin:12px auto;position:relative;overflow:hidden}
  @media print{html,body{background:#fff}.page{margin:0;box-shadow:none;page-break-after:always}}
  ${lh.css}
</style>
</head><body>
<div class="page">
  ${lh.headerHtml}
  ${rendered || '<p style="color:#aaa;text-align:center;padding-top:20mm">Нет активных блоков</p>'}
  ${lh.footerHtml}
</div>
</body></html>`;
}