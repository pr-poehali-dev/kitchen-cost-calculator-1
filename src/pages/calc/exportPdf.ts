import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  const GOLD = [200, 169, 110] as [number, number, number];
  const DARK = [20, 22, 28] as [number, number, number];
  const GRAY = [80, 85, 95] as [number, number, number];
  const LIGHT = [245, 245, 248] as [number, number, number];

  // === HEADER ===
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 3, 28, 'F');

  doc.setTextColor(...GOLD);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('КухниПро', 10, 12);

  doc.setTextColor(220, 220, 230);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Калькулятор мебели', 10, 19);

  // Project title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = project.object || 'Расчёт';
  doc.text(title, W / 2, 12, { align: 'center' });

  doc.setTextColor(180, 180, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Дата: ${project.createdAt || new Date().toISOString().split('T')[0]}`, W / 2, 19, { align: 'center' });

  // === CLIENT INFO ===
  let y = 36;

  if (project.client || project.phone || project.address) {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(10, y - 4, W - 20, 18, 2, 2, 'F');

    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('КЛИЕНТ:', 14, y + 2);

    doc.setFont('helvetica', 'normal');
    const parts = [
      project.client && `${project.client}`,
      project.phone && `тел: ${project.phone}`,
      project.address && `адрес: ${project.address}`,
    ].filter(Boolean).join('   ·   ');
    doc.text(parts, 36, y + 2);

    y += 22;
  }

  // === MATERIAL BLOCKS ===
  const totalMaterials = project.blocks.reduce((s, b) =>
    s + b.rows.reduce((rs, r) => rs + r.qty * r.price, 0), 0);
  const totalServices = project.serviceBlocks.reduce((s, b) =>
    s + b.rows.reduce((rs, r) => rs + r.qty * r.price, 0), 0);
  const total = totalMaterials + totalServices;

  for (const block of project.blocks) {
    const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
    if (block.rows.length === 0) continue;

    // Block header
    doc.setFillColor(...DARK);
    doc.roundedRect(10, y, W - 20, 8, 1, 1, 'F');
    doc.setFillColor(...GOLD);
    doc.roundedRect(10, y, 3, 8, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(block.name.toUpperCase(), 17, y + 5.5);

    doc.setTextColor(...GOLD);
    doc.setFontSize(9);
    doc.text(`${fmt(blockTotal)} ${currency}`, W - 12, y + 5.5, { align: 'right' });

    y += 10;

    // Table
    const rows = block.rows
      .filter(r => r.name || r.materialId)
      .map((r, idx) => [
        String(idx + 1),
        r.name || '—',
        getManufacturerName(r.manufacturerId) || '—',
        getVendorName(r.vendorId) || '—',
        r.color || '—',
        r.thickness ? `${r.thickness} мм` : '—',
        r.unit,
        String(r.qty),
        `${r.price.toLocaleString()} ${currency}`,
        `${fmt(r.qty * r.price)} ${currency}`,
      ]);

    autoTable(doc, {
      startY: y,
      head: [['№', 'Наименование', 'Производитель', 'Поставщик', 'Цвет', 'Толщ.', 'Ед.', 'Кол-во', 'Цена', 'Сумма']],
      body: rows,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: DARK,
        lineColor: [220, 220, 228],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [235, 235, 242],
        textColor: GRAY,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 253],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22 },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 26, halign: 'right' },
        9: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.column.index === 9 && data.section === 'body') {
          data.cell.styles.textColor = GOLD;
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 15;
    }
  }

  // === SERVICE BLOCKS ===
  for (const sBlock of project.serviceBlocks) {
    const blockTotal = sBlock.rows.reduce((s, r) => s + r.qty * r.price, 0);
    if (sBlock.rows.length === 0) continue;

    doc.setFillColor(28, 35, 48);
    doc.roundedRect(10, y, W - 20, 8, 1, 1, 'F');
    doc.setFillColor(...GOLD);
    doc.roundedRect(10, y, 3, 8, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(sBlock.name.toUpperCase(), 17, y + 5.5);
    doc.setTextColor(...GOLD);
    doc.text(`${fmt(blockTotal)} ${currency}`, W - 12, y + 5.5, { align: 'right' });

    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['№', 'Услуга / Работа', 'Ед.', 'Кол-во', 'Цена', 'Сумма']],
      body: sBlock.rows.map((r, i) => [
        String(i + 1),
        r.name || '—',
        r.unit,
        String(r.qty),
        `${r.price.toLocaleString()} ${currency}`,
        `${fmt(r.qty * r.price)} ${currency}`,
      ]),
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [220, 220, 228], lineWidth: 0.2 },
      headStyles: { fillColor: [235, 235, 242], textColor: GRAY, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [250, 250, 253] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          data.cell.styles.textColor = GOLD;
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // === TOTALS BOX ===
  if (y > doc.internal.pageSize.getHeight() - 45) {
    doc.addPage();
    y = 15;
  }

  y += 4;
  const boxH = 32;
  doc.setFillColor(...DARK);
  doc.roundedRect(W - 110, y, 100, boxH, 3, 3, 'F');
  doc.setFillColor(...GOLD);
  doc.roundedRect(W - 110, y, 3, boxH, 3, 3, 'F');

  doc.setTextColor(160, 165, 180);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Материалы:', W - 100, y + 9);
  doc.text('Услуги:', W - 100, y + 17);

  doc.setTextColor(220, 225, 240);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmt(totalMaterials)} ${currency}`, W - 12, y + 9, { align: 'right' });
  doc.text(`${fmt(totalServices)} ${currency}`, W - 12, y + 17, { align: 'right' });

  // Total line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W - 107, y + 21, W - 12, y + 21);

  doc.setTextColor(...GOLD);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ИТОГО:', W - 100, y + 28);
  doc.text(`${fmt(total)} ${currency}`, W - 12, y + 28, { align: 'right' });

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 220, 228);
    doc.setLineWidth(0.3);
    doc.line(10, pH - 10, W - 10, pH - 10);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('КухниПро — Калькулятор корпусной мебели', 10, pH - 5);
    doc.text(`Стр. ${i} из ${pageCount}`, W - 10, pH - 5, { align: 'right' });
  }

  const filename = `${project.object || 'Расчёт'}_${project.createdAt || 'смета'}.pdf`
    .replace(/[^а-яёa-z0-9_\-. ]/gi, '_');
  doc.save(filename);
}
