// ── Стили оформления бланков (letterhead) ──────────────────────────────────
// Каждый стиль возвращает { css, headerHtml, footerHtml }
// Подставляются в buildPreviewHtml с учётом цвета акцента и реквизитов компании.

export interface LetterheadContext {
  accentColor: string;    // hex, напр. #c0392b
  company: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

export interface LetterheadResult {
  css: string;
  headerHtml: string;
  footerHtml: string;
  /** Уменьшить top padding страницы, т.к. header занимает место */
  headerHeightMm: number;
  footerHeightMm: number;
}

// ── Утилиты ────────────────────────────────────────────────────────────────

function hex2rgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

// ── 1. NONE — без оформления ───────────────────────────────────────────────
export function letterheadNone(): LetterheadResult {
  return { css: '', headerHtml: '', footerHtml: '', headerHeightMm: 0, footerHeightMm: 0 };
}

// ── 2. CLASSIC — строгий: тонкая рамка + цветной угол снизу справа ─────────
// Вдохновение: скрин Screenshot_5.png (красная линия сверху + уголок снизу)
export function letterheadClassic(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);

  const css = `
    .page {
      border: 1.2px solid #d0d0d0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    }
    /* Верхняя акцентная линия */
    .lh-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: ${c};
    }
    /* Уголок снизу справа */
    .lh-corner {
      position: absolute;
      bottom: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 0 22mm 22mm;
      border-color: transparent transparent ${c} transparent;
    }
    /* Шапка документа */
    .lh-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 4mm;
      margin-bottom: 5mm;
      border-bottom: 1.5px solid ${c};
    }
    .lh-topbar-company {
      font-size: 10.5pt;
      font-weight: bold;
      letter-spacing: 0.04em;
      color: #111;
      text-transform: uppercase;
    }
    .lh-topbar-accent {
      display: inline-block;
      width: 10px;
      height: 10px;
      background: ${c};
      margin-right: 6px;
      vertical-align: middle;
    }
    /* Нижний колонтитул */
    .lh-footer {
      position: absolute;
      bottom: 6mm; left: 0; right: 0;
      padding: 3mm 10mm 0;
      border-top: 1px solid rgba(${rgb},0.35);
      display: flex;
      gap: 8mm;
      font-size: 7.5pt;
      color: #666;
    }
    .lh-footer-item {
      display: flex;
      align-items: center;
      gap: 2mm;
    }
    .lh-footer-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: ${c};
      flex-shrink: 0;
    }
  `;

  const headerHtml = `
    <div class="lh-header"></div>
    <div class="lh-topbar">
      <div class="lh-topbar-company">
        <span class="lh-topbar-accent"></span>${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}
      </div>
    </div>
  `;

  const footerHtml = ctx.phone || ctx.email || ctx.address ? `
    <div class="lh-footer">
      ${ctx.phone ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.phone}</span></div>` : ''}
      ${ctx.email ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.email}</span></div>` : ''}
      ${ctx.address ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.address}</span></div>` : ''}
      ${ctx.website ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.website}</span></div>` : ''}
    </div>
    <div class="lh-corner"></div>
  ` : '<div class="lh-corner"></div>';

  return { css, headerHtml, footerHtml, headerHeightMm: 18, footerHeightMm: 14 };
}

// ── 3. CORPORATE — корпоративный: цветная полоса слева + шапка с цветным фоном
// Вдохновение: letterhead с синей полосой слева как на magnific.com
export function letterheadCorporate(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);

  const css = `
    .page {
      box-shadow: 0 4px 24px rgba(0,0,0,0.18) !important;
      overflow: hidden;
    }
    /* Левая цветная полоса */
    .lh-sidebar {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 6mm;
      background: ${c};
    }
    /* Верхний блок с фоном */
    .lh-topbar {
      background: ${c};
      margin-bottom: 7mm;
      padding: 4mm 6mm 4mm 8mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lh-topbar-company {
      font-size: 11pt;
      font-weight: bold;
      color: #fff;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .lh-topbar-sub {
      font-size: 7.5pt;
      color: rgba(255,255,255,0.75);
      margin-top: 1mm;
    }
    /* Нижний колонтитул */
    .lh-footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: ${c};
      padding: 2.5mm 6mm 2.5mm 14mm;
      display: flex;
      gap: 6mm;
      align-items: center;
    }
    .lh-footer-item {
      font-size: 7.5pt;
      color: rgba(255,255,255,0.9);
      display: flex;
      align-items: center;
      gap: 1.5mm;
    }
    .lh-footer-sep {
      width: 1px;
      height: 10px;
      background: rgba(255,255,255,0.3);
    }
    /* Декоративный треугольник в правом верхнем углу */
    .lh-tri {
      position: absolute;
      top: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 18mm 18mm 0 0;
      border-color: rgba(${rgb},0.18) transparent transparent transparent;
    }
  `;

  const headerHtml = `
    <div class="lh-sidebar"></div>
    <div class="lh-topbar">
      <div>
        <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
        ${ctx.website ? `<div class="lh-topbar-sub">${ctx.website}</div>` : ''}
      </div>
    </div>
    <div class="lh-tri"></div>
  `;

  const footerHtml = `
    <div class="lh-footer">
      ${ctx.phone ? `<div class="lh-footer-item">☎ ${ctx.phone}</div>${ctx.email || ctx.address ? '<div class="lh-footer-sep"></div>' : ''}` : ''}
      ${ctx.email ? `<div class="lh-footer-item">✉ ${ctx.email}</div>${ctx.address ? '<div class="lh-footer-sep"></div>' : ''}` : ''}
      ${ctx.address ? `<div class="lh-footer-item">⌂ ${ctx.address}</div>` : ''}
    </div>
  `;

  return { css, headerHtml, footerHtml, headerHeightMm: 22, footerHeightMm: 11 };
}

// ── 4. ELEGANT — элегантный: двойная рамка, тонкие декоративные углы ─────────
// Строгий классический стиль для договоров
export function letterheadElegant(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);

  const css = `
    .page {
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    }
    /* Внешняя рамка */
    .lh-outer-border {
      position: absolute;
      top: 4mm; left: 4mm; right: 4mm; bottom: 4mm;
      border: 1.5px solid ${c};
      pointer-events: none;
    }
    /* Внутренняя тонкая рамка */
    .lh-inner-border {
      position: absolute;
      top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
      border: 0.5px solid rgba(${rgb},0.4);
      pointer-events: none;
    }
    /* Декоративные уголки */
    .lh-corner-tl, .lh-corner-tr, .lh-corner-bl, .lh-corner-br {
      position: absolute;
      width: 8mm; height: 8mm;
    }
    .lh-corner-tl { top: 3mm; left: 3mm;
      border-top: 2.5px solid ${c}; border-left: 2.5px solid ${c}; }
    .lh-corner-tr { top: 3mm; right: 3mm;
      border-top: 2.5px solid ${c}; border-right: 2.5px solid ${c}; }
    .lh-corner-bl { bottom: 3mm; left: 3mm;
      border-bottom: 2.5px solid ${c}; border-left: 2.5px solid ${c}; }
    .lh-corner-br { bottom: 3mm; right: 3mm;
      border-bottom: 2.5px solid ${c}; border-right: 2.5px solid ${c}; }
    /* Шапка */
    .lh-topbar {
      text-align: center;
      padding-bottom: 5mm;
      margin-bottom: 5mm;
      border-bottom: 0.8px solid rgba(${rgb},0.4);
    }
    .lh-topbar-company {
      font-size: 11pt;
      font-weight: bold;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${c};
    }
    .lh-topbar-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3mm;
      margin-top: 1.5mm;
    }
    .lh-topbar-ornament {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(${rgb},0.5), transparent);
    }
    .lh-topbar-sub {
      font-size: 7.5pt;
      color: #888;
      white-space: nowrap;
    }
    /* Нижний колонтитул */
    .lh-footer {
      position: absolute;
      bottom: 10mm; left: 0; right: 0;
      padding: 2.5mm 14mm 0;
      border-top: 0.8px solid rgba(${rgb},0.3);
      text-align: center;
      font-size: 7.5pt;
      color: #777;
    }
    .lh-footer-inner {
      display: inline-flex;
      gap: 5mm;
      flex-wrap: wrap;
      justify-content: center;
    }
    .lh-footer-sep-text {
      color: rgba(${rgb},0.5);
    }
  `;

  const headerHtml = `
    <div class="lh-outer-border"></div>
    <div class="lh-inner-border"></div>
    <div class="lh-corner-tl"></div>
    <div class="lh-corner-tr"></div>
    <div class="lh-corner-bl"></div>
    <div class="lh-corner-br"></div>
    <div class="lh-topbar">
      <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
      <div class="lh-topbar-line">
        <div class="lh-topbar-ornament"></div>
        <div class="lh-topbar-sub">${[ctx.phone, ctx.email].filter(Boolean).join(' · ')}</div>
        <div class="lh-topbar-ornament"></div>
      </div>
    </div>
  `;

  const parts = [ctx.phone, ctx.email, ctx.address, ctx.website].filter(Boolean);
  const footerHtml = parts.length ? `
    <div class="lh-footer">
      <div class="lh-footer-inner">
        ${parts.map((p, i) => `<span>${p}${i < parts.length - 1 ? ' <span class="lh-footer-sep-text">|</span>' : ''}</span>`).join(' ')}
      </div>
    </div>
  ` : '';

  return { css, headerHtml, footerHtml, headerHeightMm: 22, footerHeightMm: 12 };
}

// ── 5. MINIMAL — минималистичный: только боковая цветная черта + подпись внизу
export function letterheadMinimal(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;

  const css = `
    .page {
      box-shadow: 0 2px 16px rgba(0,0,0,0.12) !important;
      border-left: 4px solid ${c};
    }
    .lh-topbar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding-bottom: 3mm;
      margin-bottom: 6mm;
      border-bottom: 1px solid #e0e0e0;
    }
    .lh-topbar-company {
      font-size: 10.5pt;
      font-weight: bold;
      color: #111;
    }
    .lh-topbar-accent-line {
      width: 20mm;
      height: 2px;
      background: ${c};
      margin-top: 2mm;
    }
    .lh-topbar-contact {
      font-size: 7.5pt;
      color: #888;
      text-align: right;
      line-height: 1.5;
    }
    .lh-footer {
      position: absolute;
      bottom: 8mm; left: 0; right: 0;
      padding: 0 8mm;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #aaa;
    }
    .lh-footer-left { color: ${c}; font-weight: bold; }
  `;

  const headerHtml = `
    <div class="lh-topbar">
      <div>
        <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
        <div class="lh-topbar-accent-line"></div>
      </div>
      <div class="lh-topbar-contact">
        ${ctx.phone ? `${ctx.phone}<br/>` : ''}
        ${ctx.email ? `${ctx.email}` : ''}
      </div>
    </div>
  `;

  const footerHtml = ctx.address || ctx.website ? `
    <div class="lh-footer">
      <span class="lh-footer-left">${ctx.company || ''}</span>
      <span>${[ctx.address, ctx.website].filter(Boolean).join(' · ')}</span>
    </div>
  ` : '';

  return { css, headerHtml, footerHtml, headerHeightMm: 18, footerHeightMm: 10 };
}

// ── Реестр стилей ──────────────────────────────────────────────────────────

export interface LetterheadDef {
  id: string;
  label: string;
  description: string;
  previewColor: string;
  build: (ctx: LetterheadContext) => LetterheadResult;
}

export const LETTERHEADS: LetterheadDef[] = [
  {
    id: 'none',
    label: 'Без оформления',
    description: 'Чистый лист',
    previewColor: '#e5e7eb',
    build: () => letterheadNone(),
  },
  {
    id: 'classic',
    label: 'Классика',
    description: 'Линия сверху, уголок снизу',
    previewColor: '#c0392b',
    build: letterheadClassic,
  },
  {
    id: 'corporate',
    label: 'Корпоративный',
    description: 'Цветная шапка и полоса слева',
    previewColor: '#1a56a0',
    build: letterheadCorporate,
  },
  {
    id: 'elegant',
    label: 'Элегантный',
    description: 'Двойная рамка с уголками',
    previewColor: '#5a3e8a',
    build: letterheadElegant,
  },
  {
    id: 'minimal',
    label: 'Минимализм',
    description: 'Боковая полоса, чистые линии',
    previewColor: '#0d9488',
    build: letterheadMinimal,
  },
];

export function getLetterhead(id: string): LetterheadDef {
  return LETTERHEADS.find(l => l.id === id) ?? LETTERHEADS[0];
}
