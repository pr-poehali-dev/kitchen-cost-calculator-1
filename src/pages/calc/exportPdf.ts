import type { Project } from '@/store/types';

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface ExportCtx {
  project: Project;
  currency: string;
  getManufacturerName: (id?: string) => string;
  getVendorName: (id?: string) => string;
  getTypeName: (id?: string) => string;
}

export function exportProjectPdf(ctx: ExportCtx) {
  const { project, currency, getManufacturerName, getVendorName } = ctx;

  const totalMaterials = project.blocks.reduce((s, b) =>
    s + b.rows.reduce((rs, r) => rs + r.qty * r.price, 0), 0);
  const totalServices = project.serviceBlocks.reduce((s, b) =>
    s + b.rows.reduce((rs, r) => rs + r.qty * r.price, 0), 0);
  const total = totalMaterials + totalServices;

  const blocksHtml = project.blocks
    .filter(b => b.rows.length > 0)
    .map(block => {
      const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
      const rows = block.rows.map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name">${r.name || '—'}</td>
          <td>${getManufacturerName(r.manufacturerId) || '—'}</td>
          <td>${getVendorName(r.vendorId) || '—'}</td>
          <td>${r.color || '—'}</td>
          <td class="center">${r.thickness ? `${r.thickness} мм` : '—'}</td>
          <td class="center">${r.unit || '—'}</td>
          <td class="right">${r.qty}</td>
          <td class="right">${fmt(r.price)} ${currency}</td>
          <td class="right sum">${fmt(r.qty * r.price)} ${currency}</td>
        </tr>
      `).join('');
      return `
        <div class="block">
          <div class="block-header">
            <span class="block-name">${block.name}</span>
            <span class="block-total">${fmt(blockTotal)} ${currency}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th class="num">№</th>
                <th class="name">Наименование</th>
                <th>Производитель</th>
                <th>Поставщик</th>
                <th>Цвет</th>
                <th class="center">Толщина</th>
                <th class="center">Ед.</th>
                <th class="right">Кол-во</th>
                <th class="right">Цена</th>
                <th class="right">Сумма</th>
              </tr>
            </thead>
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
          <td class="name">${r.name || '—'}</td>
          <td class="center">${r.unit || '—'}</td>
          <td class="right">${r.qty}</td>
          <td class="right">${fmt(r.price)} ${currency}</td>
          <td class="right sum">${fmt(r.qty * r.price)} ${currency}</td>
        </tr>
      `).join('');
      return `
        <div class="block service-block">
          <div class="block-header">
            <span class="block-name">${sb.name}</span>
            <span class="block-total">${fmt(sbTotal)} ${currency}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th class="num">№</th>
                <th class="name">Услуга / Работа</th>
                <th class="center">Ед.</th>
                <th class="right">Кол-во</th>
                <th class="right">Цена</th>
                <th class="right">Сумма</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

  const clientInfo = [
    project.client && `<span><strong>Клиент:</strong> ${project.client}</span>`,
    project.phone && `<span><strong>Тел:</strong> ${project.phone}</span>`,
    project.address && `<span><strong>Адрес:</strong> ${project.address}</span>`,
  ].filter(Boolean).join('<span class="dot">·</span>');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${project.object || 'Расчёт'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'IBM Plex Sans', Arial, sans-serif;
      font-size: 9pt;
      color: #1a1c22;
      background: #fff;
    }

    /* ===== HEADER ===== */
    .header {
      background: #14161c;
      color: white;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #c8a96e;
      margin-bottom: 12px;
    }
    .header-left .brand { font-size: 15pt; font-weight: 700; color: #c8a96e; }
    .header-left .sub { font-size: 8pt; color: #9096a8; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .title { font-size: 13pt; font-weight: 700; color: #fff; }
    .header-right .date { font-size: 8pt; color: #9096a8; margin-top: 2px; }

    /* ===== CLIENT ===== */
    .client-bar {
      background: #f4f5f8;
      border-radius: 4px;
      padding: 7px 14px;
      margin: 0 0 12px 0;
      font-size: 8.5pt;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .client-bar strong { color: #555; font-weight: 600; }
    .dot { color: #aaa; margin: 0 2px; }

    /* ===== BLOCK ===== */
    .block { margin-bottom: 14px; }
    .block-header {
      background: #14161c;
      color: white;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 3px solid #c8a96e;
      border-radius: 3px 3px 0 0;
    }
    .block-name { font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .block-total { font-size: 9pt; font-weight: 700; color: #c8a96e; font-family: 'IBM Plex Mono', monospace; }

    .service-block .block-header { background: #1c2330; }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    thead tr { background: #ebebf2; }
    thead th {
      padding: 5px 7px;
      text-align: left;
      font-weight: 600;
      color: #50555f;
      font-size: 7.5pt;
      border-bottom: 1px solid #d8d8e4;
      white-space: nowrap;
    }
    tbody tr { border-bottom: 1px solid #e8e8f0; }
    tbody tr:nth-child(even) { background: #fafafd; }
    tbody td { padding: 5px 7px; vertical-align: middle; }
    tbody tr:hover { background: #f2f2f8; }

    .num { width: 24px; color: #999; text-align: center; }
    .name { min-width: 120px; font-weight: 500; }
    .center { text-align: center; }
    .right { text-align: right; font-family: 'IBM Plex Mono', monospace; white-space: nowrap; }
    .sum { font-weight: 600; color: #b8893e; }

    /* ===== TOTALS ===== */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .totals {
      background: #14161c;
      border-radius: 6px;
      padding: 14px 20px;
      min-width: 260px;
      border-left: 3px solid #c8a96e;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      padding: 3px 0;
      font-size: 8.5pt;
    }
    .totals-row .label { color: #9096a8; }
    .totals-row .val { color: #d8dce8; font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
    .totals-divider { border: none; border-top: 1px solid #c8a96e; margin: 8px 0; opacity: 0.5; }
    .totals-row.grand .label { color: #c8a96e; font-weight: 700; font-size: 10pt; }
    .totals-row.grand .val { color: #c8a96e; font-weight: 700; font-size: 12pt; }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #aaa;
    }

    /* ===== PRINT ===== */
    @media print {
      @page { size: A4 landscape; margin: 10mm 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .block { page-break-inside: avoid; }
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

<div class="totals-wrap">
  <div class="totals">
    <div class="totals-row">
      <span class="label">Материалы</span>
      <span class="val">${fmt(totalMaterials)} ${currency}</span>
    </div>
    <div class="totals-row">
      <span class="label">Услуги</span>
      <span class="val">${fmt(totalServices)} ${currency}</span>
    </div>
    <hr class="totals-divider">
    <div class="totals-row grand">
      <span class="label">ИТОГО</span>
      <span class="val">${fmt(total)} ${currency}</span>
    </div>
  </div>
</div>

<div class="footer">
  <span>КухниПро — ${project.object || ''} · ${project.client || ''}</span>
  <span>Сформировано: ${new Date().toLocaleDateString('ru-RU')}</span>
</div>

<script>
  // Ждём загрузки шрифтов, потом печатаем
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
