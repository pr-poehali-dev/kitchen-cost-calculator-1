import type { Project, ClientView } from '@/store/types';
import { getClientView } from './ClientViewPanel';

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface TotalsData {
  rawMaterials: number;
  rawServices: number;
  grandTotal: number;
  totalMarkupAmount: number;
  percentAmount: number;
  fixedAmount: number;
  blockExtraTotal: number;
  activeExpenses: Array<{ id: string; name: string; type: string; value: number; applyTo?: string; enabled?: boolean }>;
}

interface ExportCtx {
  project: Project;
  currency: string;
  totals: TotalsData;
  getManufacturerName: (id?: string) => string;
  getVendorName: (id?: string) => string;
  getTypeName: (id?: string) => string;
}

export function exportProjectPdf(ctx: ExportCtx) {
  const { project, currency, totals, getManufacturerName, getVendorName } = ctx;
  const cv: ClientView = getClientView(project.clientView);

  const blocksHtml = project.blocks
    .filter(b => b.rows.length > 0)
    .map(block => {
      const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);

      // Определяем колонки по cv
      const cols = [
        { key: 'num',  header: '№',           always: true },
        { key: 'name', header: 'Наименование', always: true },
        { key: 'mfr',  header: 'Производитель', show: cv.showManufacturer },
        { key: 'vnd',  header: 'Поставщик',    show: cv.showVendor },
        { key: 'color',header: 'Цвет',         always: true },
        { key: 'thick',header: 'Толщина',      show: cv.showThickness },
        { key: 'unit', header: 'Ед.',           always: true },
        { key: 'qty',  header: 'Кол-во',       always: true },
        { key: 'price',header: 'Цена',         show: cv.showPrices },
        { key: 'sum',  header: 'Сумма',        always: true },
      ].filter(c => c.always || c.show);

      const headers = cols.map(c => {
        const align = ['num'].includes(c.key) ? 'class="num"' :
                      ['qty','price','sum'].includes(c.key) ? 'class="right"' :
                      ['unit','thick'].includes(c.key) ? 'class="center"' : '';
        return `<th ${align}>${c.header}</th>`;
      }).join('');

      const rows = block.rows.map((r, i) => {
        const cells = cols.map(c => {
          switch (c.key) {
            case 'num':   return `<td class="num">${i + 1}</td>`;
            case 'name':  return `<td class="name">${esc(r.name) || '—'}</td>`;
            case 'mfr':   return `<td>${esc(getManufacturerName(r.manufacturerId)) || '—'}</td>`;
            case 'vnd':   return `<td>${esc(getVendorName(r.vendorId)) || '—'}</td>`;
            case 'color': return `<td>${esc(r.color) || '—'}</td>`;
            case 'thick': return `<td class="center">${r.thickness ? `${esc(String(r.thickness))} мм` : '—'}</td>`;
            case 'unit':  return `<td class="center">${esc(r.unit) || '—'}</td>`;
            case 'qty':   return `<td class="right">${r.qty}</td>`;
            case 'price': return `<td class="right">${fmt(r.price)} ${currency}</td>`;
            case 'sum':   return `<td class="right sum">${fmt(r.qty * r.price)} ${currency}</td>`;
            default:      return '';
          }
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const blockTotalHtml = cv.showBlockTotals
        ? `<span class="block-total">${fmt(blockTotal)} ${currency}</span>`
        : '';

      return `
        <div class="block">
          <div class="block-header">
            <span class="block-name">${esc(block.name)}</span>
            ${blockTotalHtml}
          </div>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

  const serviceBlocksHtml = project.serviceBlocks
    .filter(sb => sb.rows.length > 0)
    .map(sb => {
      const sbTotal = sb.rows.reduce((s, r) => s + r.qty * r.price, 0);
      const rows = sb.rows.map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name">${esc(r.name) || '—'}</td>
          <td class="center">${esc(r.unit) || '—'}</td>
          <td class="right">${r.qty}</td>
          ${cv.showPrices ? `<td class="right">${fmt(r.price)} ${currency}</td>` : ''}
          <td class="right sum">${fmt(r.qty * r.price)} ${currency}</td>
        </tr>
      `).join('');

      const blockTotalHtml = cv.showBlockTotals
        ? `<span class="block-total">${fmt(sbTotal)} ${currency}</span>`
        : '';

      return `
        <div class="block service-block">
          <div class="block-header">
            <span class="block-name">${esc(sb.name)}</span>
            ${blockTotalHtml}
          </div>
          <table>
            <thead>
              <tr>
                <th class="num">№</th>
                <th class="name">Услуга / Работа</th>
                <th class="center">Ед.</th>
                <th class="right">Кол-во</th>
                ${cv.showPrices ? '<th class="right">Цена</th>' : ''}
                <th class="right">Сумма</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

  const clientInfo = [
    project.client && `<span><strong>Клиент:</strong> ${esc(project.client)}</span>`,
    project.phone && `<span><strong>Тел:</strong> ${esc(project.phone)}</span>`,
    project.address && `<span><strong>Адрес:</strong> ${esc(project.address)}</span>`,
  ].filter(Boolean).join('<span class="dot">·</span>');

  // Итоговая сводка
  const totalsRows: string[] = [];
  if (cv.showMaterialsTotal) {
    totalsRows.push(`<div class="totals-row"><span class="label">Материалы</span><span class="val">${fmt(totals.rawMaterials)} ${currency}</span></div>`);
  }
  if (cv.showServicesTotal) {
    totalsRows.push(`<div class="totals-row"><span class="label">Услуги</span><span class="val">${fmt(totals.rawServices)} ${currency}</span></div>`);
  }
  if (cv.showExpenses) {
    if (totals.totalMarkupAmount > 0) {
      totalsRows.push(`<div class="totals-row accent"><span class="label">Наценка на итого</span><span class="val">+${fmt(totals.totalMarkupAmount)} ${currency}</span></div>`);
    }
    if (totals.percentAmount > 0) {
      const pct = totals.activeExpenses.filter(e => e.type === 'percent').reduce((s, e) => s + e.value, 0);
      totalsRows.push(`<div class="totals-row accent"><span class="label">Процентные расходы (${pct}%)</span><span class="val">+${fmt(totals.percentAmount)} ${currency}</span></div>`);
    }
    if (totals.fixedAmount > 0) {
      totalsRows.push(`<div class="totals-row"><span class="label">Постоянные расходы</span><span class="val">+${fmt(totals.fixedAmount)} ${currency}</span></div>`);
    }
  }

  const showDivider = totalsRows.length > 0 && cv.showGrandTotal;

  const totalsHtml = (cv.showMaterialsTotal || cv.showServicesTotal || cv.showExpenses || cv.showGrandTotal) ? `
    <div class="totals-wrap">
      <div class="totals">
        ${totalsRows.join('')}
        ${showDivider ? '<hr class="totals-divider">' : ''}
        ${cv.showGrandTotal ? `
          <div class="totals-row grand">
            <span class="label">ИТОГО</span>
            <span class="val">${fmt(totals.grandTotal)} ${currency}</span>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const noteHtml = cv.note ? `
    <div class="note-bar">
      <strong>Примечание:</strong> ${cv.note}
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${project.object || 'Расчёт'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans', Arial, sans-serif; font-size: 9pt; color: #1a1c22; background: #fff; }

    .header { background: #14161c; color: white; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #c8a96e; margin-bottom: 12px; }
    .header-left .brand { font-size: 15pt; font-weight: 700; color: #c8a96e; }
    .header-left .sub { font-size: 8pt; color: #9096a8; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .title { font-size: 13pt; font-weight: 700; color: #fff; }
    .header-right .date { font-size: 8pt; color: #9096a8; margin-top: 2px; }

    .client-bar { background: #f4f5f8; border-radius: 4px; padding: 7px 14px; margin: 0 0 12px 0; font-size: 8.5pt; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .client-bar strong { color: #555; font-weight: 600; }
    .dot { color: #aaa; margin: 0 2px; }

    .block { margin-bottom: 14px; }
    .block-header { background: #14161c; color: white; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #c8a96e; border-radius: 3px 3px 0 0; }
    .block-name { font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .block-total { font-size: 9pt; font-weight: 700; color: #c8a96e; font-family: 'IBM Plex Mono', monospace; }
    .service-block .block-header { background: #1c2330; }

    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #ebebf2; }
    thead th { padding: 5px 7px; text-align: left; font-weight: 600; color: #50555f; font-size: 7.5pt; border-bottom: 1px solid #d8d8e4; white-space: nowrap; }
    tbody tr { border-bottom: 1px solid #e8e8f0; }
    tbody tr:nth-child(even) { background: #fafafd; }
    tbody td { padding: 5px 7px; vertical-align: middle; }

    .num { width: 24px; color: #999; text-align: center; }
    .name { min-width: 120px; font-weight: 500; }
    .center { text-align: center; }
    .right { text-align: right; font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }
    .sum { font-weight: 600; color: #b8893e; }

    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 16px; page-break-inside: avoid; }
    .totals { background: #14161c; border-radius: 6px; padding: 14px 20px; min-width: 280px; border-left: 3px solid #c8a96e; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 3px 0; font-size: 8.5pt; }
    .totals-row .label { color: #9096a8; }
    .totals-row .val { color: #d8dce8; font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
    .totals-row.accent .label { color: #c8a96e; }
    .totals-row.accent .val { color: #c8a96e; }
    .totals-divider { border: none; border-top: 1px solid #c8a96e; margin: 8px 0; opacity: 0.5; }
    .totals-row.grand .label { color: #c8a96e; font-weight: 700; font-size: 10pt; }
    .totals-row.grand .val { color: #c8a96e; font-weight: 700; font-size: 12pt; }

    .note-bar { background: #fffbf0; border-left: 3px solid #c8a96e; padding: 8px 14px; margin-top: 14px; font-size: 8pt; color: #555; border-radius: 0 4px 4px 0; }
    .note-bar strong { color: #333; }

    .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7pt; color: #aaa; }

    @media print {
      @page {
        size: A4 landscape;
        margin: 12mm 14mm;
        @bottom-right {
          content: "Стр. " counter(page) " из " counter(pages);
          font-size: 7pt;
          color: #999;
        }
      }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .block { page-break-inside: avoid; }
      .header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; }
      .block-header { background: #1a1a2e !important; -webkit-print-color-adjust: exact; }
      .totals { background: #1a1a2e !important; -webkit-print-color-adjust: exact; }
      a { color: #000; text-decoration: none; }
    }
  </style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="brand">КухниПро</div>
    <div class="sub">Калькулятор корпусной мебели</div>
  </div>
  <div class="header-right">
    <div class="title">${project.object || 'Расчёт'}</div>
    <div class="date">Дата: ${project.createdAt || new Date().toISOString().split('T')[0]}</div>
  </div>
</div>

${clientInfo ? `<div class="client-bar">${clientInfo}</div>` : ''}

${blocksHtml}
${serviceBlocksHtml}

${totalsHtml}
${noteHtml}

<div class="footer">
  <span>КухниПро — ${project.object || ''} · ${project.client || ''}</span>
  <span>Сформировано: ${new Date().toLocaleDateString('ru-RU')}</span>
</div>

<script>
  document.fonts.ready.then(() => {
    setTimeout(() => { window.print(); }, 300);
  });
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onafterprint = () => {
      win.close();
      URL.revokeObjectURL(url);
    };
  }
}