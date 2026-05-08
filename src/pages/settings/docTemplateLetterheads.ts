// ── Стили оформления бланков (letterhead) ──────────────────────────────────
// Каждый стиль возвращает { css, headerHtml, footerHtml }
// Подставляются в buildPreviewHtml с учётом цвета акцента и реквизитов компании.

export type LogoPosition = 'left' | 'center' | 'right' | 'header-left' | 'header-right';

export interface LetterheadContext {
  accentColor: string;    // hex, напр. #c0392b
  company: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logoUrl?: string;
  logoPosition?: LogoPosition;
  logoHeight?: number;    // мм, высота логотипа
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

/** Возвращает HTML тега <img> для логотипа с нужными стилями */
function logoImg(ctx: LetterheadContext, extraStyle = ''): string {
  if (!ctx.logoUrl) return '';
  const h = ctx.logoHeight ?? 12;
  return `<img src="${ctx.logoUrl}" style="height:${h}mm;width:auto;object-fit:contain;display:block;${extraStyle}" alt="logo" />`;
}

/** Блок логотипа, размещённый отдельно над шапкой (позиции left/center/right) */
function standaloneLogoBlock(ctx: LetterheadContext): string {
  if (!ctx.logoUrl) return '';
  const pos = ctx.logoPosition ?? 'left';
  if (pos === 'header-left' || pos === 'header-right') return '';
  const align = pos === 'center' ? 'center' : pos === 'right' ? 'right' : 'left';
  const h = ctx.logoHeight ?? 12;
  return `<div style="text-align:${align};margin-bottom:3mm"><img src="${ctx.logoUrl}" style="height:${h}mm;width:auto;object-fit:contain;display:inline-block;" alt="logo" /></div>`;
}

// ── 1. NONE — без оформления ───────────────────────────────────────────────
export function letterheadNone(ctx: LetterheadContext): LetterheadResult {
  const logoBlock = standaloneLogoBlock(ctx);
  const extraH = logoBlock ? (ctx.logoHeight ?? 12) + 3 : 0;
  return {
    css: '',
    headerHtml: logoBlock,
    footerHtml: '',
    headerHeightMm: extraH,
    footerHeightMm: 0,
  };
}

// ── 2. CLASSIC — строгий: линия сверху + уголок снизу ─────────────────────
export function letterheadClassic(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);
  const pos = ctx.logoPosition ?? 'left';
  const logoInHeader = pos === 'header-left' || pos === 'header-right';

  const css = `
    .page {
      border: 1.2px solid #d0d0d0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    }
    .lh-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: ${c};
    }
    .lh-corner {
      position: absolute;
      bottom: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 0 22mm 22mm;
      border-color: transparent transparent ${c} transparent;
    }
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
      width: 10px; height: 10px;
      background: ${c};
      margin-right: 6px;
      vertical-align: middle;
    }
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
    .lh-footer-item { display: flex; align-items: center; gap: 2mm; }
    .lh-footer-dot { width: 5px; height: 5px; border-radius: 50%; background: ${c}; flex-shrink: 0; }
  `;

  const logoLeft  = ctx.logoUrl && pos === 'header-left'  ? logoImg(ctx) : '';
  const logoRight = ctx.logoUrl && pos === 'header-right' ? logoImg(ctx) : '';
  const logoAbove = !logoInHeader ? standaloneLogoBlock(ctx) : '';

  const companyHtml = `<div class="lh-topbar-company"><span class="lh-topbar-accent"></span>${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>`;

  const headerHtml = `
    <div class="lh-header"></div>
    ${logoAbove}
    <div class="lh-topbar">
      ${logoLeft ? `<div style="margin-right:4mm">${logoLeft}</div>` : ''}
      ${companyHtml}
      ${logoRight ? `<div style="margin-left:4mm">${logoRight}</div>` : ''}
    </div>
  `;

  const extraLogoH = !logoInHeader && ctx.logoUrl ? (ctx.logoHeight ?? 12) + 3 : 0;

  const footerHtml = ctx.phone || ctx.email || ctx.address ? `
    <div class="lh-footer">
      ${ctx.phone   ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.phone}</span></div>` : ''}
      ${ctx.email   ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.email}</span></div>` : ''}
      ${ctx.address ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.address}</span></div>` : ''}
      ${ctx.website ? `<div class="lh-footer-item"><div class="lh-footer-dot"></div><span>${ctx.website}</span></div>` : ''}
    </div>
    <div class="lh-corner"></div>
  ` : '<div class="lh-corner"></div>';

  return { css, headerHtml, footerHtml, headerHeightMm: 18 + extraLogoH, footerHeightMm: 14 };
}

// ── 3. CORPORATE — цветная шапка + полоса слева ────────────────────────────
export function letterheadCorporate(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);
  const pos = ctx.logoPosition ?? 'left';
  const logoInHeader = pos === 'header-left' || pos === 'header-right';

  const css = `
    .page { box-shadow: 0 4px 24px rgba(0,0,0,0.18) !important; overflow: hidden; }
    .lh-sidebar { position: absolute; top: 0; left: 0; bottom: 0; width: 6mm; background: ${c}; }
    .lh-topbar {
      background: ${c};
      margin-bottom: 7mm;
      padding: 4mm 6mm 4mm 8mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lh-topbar-company { font-size: 11pt; font-weight: bold; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; }
    .lh-topbar-sub { font-size: 7.5pt; color: rgba(255,255,255,0.75); margin-top: 1mm; }
    .lh-footer {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: ${c};
      padding: 2.5mm 6mm 2.5mm 14mm;
      display: flex; gap: 6mm; align-items: center;
    }
    .lh-footer-item { font-size: 7.5pt; color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 1.5mm; }
    .lh-footer-sep { width: 1px; height: 10px; background: rgba(255,255,255,0.3); }
    .lh-tri {
      position: absolute; top: 0; right: 0;
      width: 0; height: 0; border-style: solid;
      border-width: 18mm 18mm 0 0;
      border-color: rgba(${rgb},0.18) transparent transparent transparent;
    }
  `;

  // Логотип в шапке: слева от текста или справа
  const logoTagLight = ctx.logoUrl
    ? `<img src="${ctx.logoUrl}" style="height:${ctx.logoHeight ?? 10}mm;width:auto;object-fit:contain;filter:brightness(0) invert(1);opacity:0.9" alt="logo" />`
    : '';
  const logoAbove = !logoInHeader ? standaloneLogoBlock(ctx) : '';

  const headerHtml = `
    <div class="lh-sidebar"></div>
    ${logoAbove}
    <div class="lh-topbar">
      ${pos === 'header-left' && ctx.logoUrl ? `<div style="margin-right:5mm">${logoTagLight}</div>` : ''}
      <div>
        <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
        ${ctx.website ? `<div class="lh-topbar-sub">${ctx.website}</div>` : ''}
      </div>
      ${pos === 'header-right' && ctx.logoUrl ? `<div style="margin-left:auto">${logoTagLight}</div>` : ''}
    </div>
    <div class="lh-tri"></div>
  `;

  const extraLogoH = !logoInHeader && ctx.logoUrl ? (ctx.logoHeight ?? 12) + 3 : 0;

  const footerHtml = `
    <div class="lh-footer">
      ${ctx.phone   ? `<div class="lh-footer-item">☎ ${ctx.phone}</div>${ctx.email || ctx.address ? '<div class="lh-footer-sep"></div>' : ''}` : ''}
      ${ctx.email   ? `<div class="lh-footer-item">✉ ${ctx.email}</div>${ctx.address ? '<div class="lh-footer-sep"></div>' : ''}` : ''}
      ${ctx.address ? `<div class="lh-footer-item">⌂ ${ctx.address}</div>` : ''}
    </div>
  `;

  return { css, headerHtml, footerHtml, headerHeightMm: 22 + extraLogoH, footerHeightMm: 11 };
}

// ── 4. ELEGANT — двойная рамка с уголками ─────────────────────────────────
export function letterheadElegant(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const rgb = hex2rgb(c);
  const pos = ctx.logoPosition ?? 'center';
  const logoInHeader = pos === 'header-left' || pos === 'header-right';

  const css = `
    .page { box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; }
    .lh-outer-border { position: absolute; top: 4mm; left: 4mm; right: 4mm; bottom: 4mm; border: 1.5px solid ${c}; pointer-events: none; }
    .lh-inner-border { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 0.5px solid rgba(${rgb},0.4); pointer-events: none; }
    .lh-corner-tl, .lh-corner-tr, .lh-corner-bl, .lh-corner-br { position: absolute; width: 8mm; height: 8mm; }
    .lh-corner-tl { top: 3mm; left: 3mm;    border-top: 2.5px solid ${c}; border-left: 2.5px solid ${c}; }
    .lh-corner-tr { top: 3mm; right: 3mm;   border-top: 2.5px solid ${c}; border-right: 2.5px solid ${c}; }
    .lh-corner-bl { bottom: 3mm; left: 3mm;  border-bottom: 2.5px solid ${c}; border-left: 2.5px solid ${c}; }
    .lh-corner-br { bottom: 3mm; right: 3mm; border-bottom: 2.5px solid ${c}; border-right: 2.5px solid ${c}; }
    .lh-topbar { text-align: center; padding-bottom: 5mm; margin-bottom: 5mm; border-bottom: 0.8px solid rgba(${rgb},0.4); }
    .lh-topbar-company { font-size: 11pt; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; color: ${c}; }
    .lh-topbar-line { display: flex; align-items: center; justify-content: center; gap: 3mm; margin-top: 1.5mm; }
    .lh-topbar-ornament { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(${rgb},0.5), transparent); }
    .lh-topbar-sub { font-size: 7.5pt; color: #888; white-space: nowrap; }
    .lh-footer { position: absolute; bottom: 10mm; left: 0; right: 0; padding: 2.5mm 14mm 0; border-top: 0.8px solid rgba(${rgb},0.3); text-align: center; font-size: 7.5pt; color: #777; }
    .lh-footer-inner { display: inline-flex; gap: 5mm; flex-wrap: wrap; justify-content: center; }
    .lh-footer-sep-text { color: rgba(${rgb},0.5); }
  `;

  const logoBlock = ctx.logoUrl ? (() => {
    if (logoInHeader) {
      // в шапке слева или справа от названия
      return '';
    }
    // над названием компании (по центру для elegant)
    const align = pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'center';
    return `<div style="text-align:${align};margin-bottom:2mm"><img src="${ctx.logoUrl}" style="height:${ctx.logoHeight ?? 12}mm;width:auto;object-fit:contain;display:inline-block" alt="logo" /></div>`;
  })() : '';

  const logoLeft  = ctx.logoUrl && pos === 'header-left'  ? logoImg(ctx) : '';
  const logoRight = ctx.logoUrl && pos === 'header-right' ? logoImg(ctx) : '';

  const headerHtml = `
    <div class="lh-outer-border"></div>
    <div class="lh-inner-border"></div>
    <div class="lh-corner-tl"></div>
    <div class="lh-corner-tr"></div>
    <div class="lh-corner-bl"></div>
    <div class="lh-corner-br"></div>
    <div class="lh-topbar">
      ${logoLeft ? `<div style="display:flex;justify-content:space-between;align-items:center">` : ''}
      ${logoLeft}
      <div>
        ${logoBlock}
        <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
        <div class="lh-topbar-line">
          <div class="lh-topbar-ornament"></div>
          <div class="lh-topbar-sub">${[ctx.phone, ctx.email].filter(Boolean).join(' · ')}</div>
          <div class="lh-topbar-ornament"></div>
        </div>
      </div>
      ${logoRight}
      ${logoLeft ? `</div>` : ''}
    </div>
  `;

  const extraLogoH = !logoInHeader && ctx.logoUrl ? (ctx.logoHeight ?? 12) + 2 : 0;
  const parts = [ctx.phone, ctx.email, ctx.address, ctx.website].filter(Boolean);
  const footerHtml = parts.length ? `
    <div class="lh-footer">
      <div class="lh-footer-inner">
        ${parts.map((p, i) => `<span>${p}${i < parts.length - 1 ? ' <span class="lh-footer-sep-text">|</span>' : ''}</span>`).join(' ')}
      </div>
    </div>
  ` : '';

  return { css, headerHtml, footerHtml, headerHeightMm: 22 + extraLogoH, footerHeightMm: 12 };
}

// ── 5. MINIMAL — боковая полоса, чистые линии ──────────────────────────────
export function letterheadMinimal(ctx: LetterheadContext): LetterheadResult {
  const c = ctx.accentColor;
  const pos = ctx.logoPosition ?? 'left';
  const logoInHeader = pos === 'header-left' || pos === 'header-right';

  const css = `
    .page { box-shadow: 0 2px 16px rgba(0,0,0,0.12) !important; border-left: 4px solid ${c}; }
    .lh-topbar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 3mm; margin-bottom: 6mm; border-bottom: 1px solid #e0e0e0; gap: 4mm; }
    .lh-topbar-left { display: flex; align-items: center; gap: 4mm; }
    .lh-topbar-company { font-size: 10.5pt; font-weight: bold; color: #111; }
    .lh-topbar-accent-line { width: 20mm; height: 2px; background: ${c}; margin-top: 2mm; }
    .lh-topbar-contact { font-size: 7.5pt; color: #888; text-align: right; line-height: 1.5; }
    .lh-footer { position: absolute; bottom: 8mm; left: 0; right: 0; padding: 0 8mm; display: flex; justify-content: space-between; font-size: 7.5pt; color: #aaa; }
    .lh-footer-left { color: ${c}; font-weight: bold; }
  `;

  const logoAbove = !logoInHeader ? standaloneLogoBlock(ctx) : '';
  const logoTagDefault = ctx.logoUrl ? logoImg(ctx) : '';

  const headerHtml = `
    ${logoAbove}
    <div class="lh-topbar">
      <div class="lh-topbar-left">
        ${pos === 'header-left' && ctx.logoUrl ? `<div style="margin-right:2mm">${logoTagDefault}</div>` : ''}
        <div>
          <div class="lh-topbar-company">${ctx.company || 'НАЗВАНИЕ КОМПАНИИ'}</div>
          <div class="lh-topbar-accent-line"></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4mm">
        <div class="lh-topbar-contact">
          ${ctx.phone ? `${ctx.phone}<br/>` : ''}
          ${ctx.email ? `${ctx.email}` : ''}
        </div>
        ${pos === 'header-right' && ctx.logoUrl ? logoTagDefault : ''}
      </div>
    </div>
  `;

  const extraLogoH = !logoInHeader && ctx.logoUrl ? (ctx.logoHeight ?? 12) + 3 : 0;

  const footerHtml = ctx.address || ctx.website ? `
    <div class="lh-footer">
      <span class="lh-footer-left">${ctx.company || ''}</span>
      <span>${[ctx.address, ctx.website].filter(Boolean).join(' · ')}</span>
    </div>
  ` : '';

  return { css, headerHtml, footerHtml, headerHeightMm: 18 + extraLogoH, footerHeightMm: 10 };
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
  { id: 'none',      label: 'Без оформления', description: 'Чистый лист',              previewColor: '#e5e7eb', build: letterheadNone },
  { id: 'classic',   label: 'Классика',        description: 'Линия сверху, уголок снизу', previewColor: '#c0392b', build: letterheadClassic },
  { id: 'corporate', label: 'Корпоративный',   description: 'Цветная шапка и полоса слева', previewColor: '#1a56a0', build: letterheadCorporate },
  { id: 'elegant',   label: 'Элегантный',      description: 'Двойная рамка с уголками',  previewColor: '#5a3e8a', build: letterheadElegant },
  { id: 'minimal',   label: 'Минимализм',      description: 'Боковая полоса, чистые линии', previewColor: '#0d9488', build: letterheadMinimal },
];

export function getLetterhead(id: string): LetterheadDef {
  return LETTERHEADS.find(l => l.id === id) ?? LETTERHEADS[0];
}
