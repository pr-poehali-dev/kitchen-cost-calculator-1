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
];

export const VARS = [
  '{{имя_клиента}}', '{{номер_договора}}', '{{дата_договора}}',
  '{{сумма}}', '{{сумма_прописью}}', '{{менеджер}}', '{{компания}}',
];

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export interface Block {
  id: string;
  type: string;
  label: string;
  content: string;
  enabled: boolean;
  // Типографика блока (опциональные — применяются поверх глобальных настроек шаблона)
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: BlockAlign;
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
  if (b.fontSize)   parts.push(`font-size:${b.fontSize}pt`);
  if (b.bold)       parts.push('font-weight:bold');
  if (b.italic)     parts.push('font-style:italic');
  if (b.underline)  parts.push('text-decoration:underline');
  if (b.align)      parts.push(`text-align:${b.align}`);
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

export function buildPreviewHtml(template: Template): string {
  const blocks = template.blocks.filter(b => b.enabled);
  const s = template.settings as Record<string, number>;
  const globalFontSize = s.fontSize || 9.5;
  const lineHeight = s.lineHeight || 1.0;
  const margin = s.marginMm || 10;

  const rendered = blocks.map(b => {
    const text = b.content
      .replace(/\{\{имя_клиента\}\}/g, 'Иванов Иван Иванович')
      .replace(/\{\{номер_договора\}\}/g, '877')
      .replace(/\{\{дата_договора\}\}/g, '02 мая 2026 г.')
      .replace(/\{\{сумма\}\}/g, '350 000')
      .replace(/\{\{сумма_прописью\}\}/g, 'триста пятьдесят тысяч')
      .replace(/\{\{менеджер\}\}/g, 'Сазонов Василий Николаевич')
      .replace(/\{\{компания\}\}/g, 'ООО «Интерьерные Решения»');

    const style = blockStyle(b, globalFontSize);
    const styleAttr = style ? ` style="${style}"` : '';

    if (b.type === 'header') {
      const hStyle = blockStyle({ ...b, align: b.align ?? 'center' }, globalFontSize) || 'text-align:center;font-size:8.5pt';
      return `<p style="${hStyle}">${text}</p>`;
    }
    if (b.type === 'section') {
      const sStyle = [
        'font-weight:bold',
        `text-align:${b.align ?? 'center'}`,
        b.fontSize ? `font-size:${b.fontSize}pt` : '',
        b.italic ? 'font-style:italic' : '',
        b.underline ? 'text-decoration:underline' : '',
      ].filter(Boolean).join(';');
      return `<p style="margin:8px 0 3px;${sStyle}">${text}</p>`;
    }
    if (b.type === 'divider') return `<hr style="border:none;border-top:1px solid #000;margin:8px 0"/>`;
    if (b.type === 'spacer')  return `<div style="height:${b.content || 20}px"></div>`;
    if (b.type === 'lines') {
      const count = parseInt(b.content) || 6;
      return Array(count).fill(0).map(() =>
        `<div style="border-bottom:1px solid #000;height:22px;margin-bottom:4px"></div>`
      ).join('');
    }
    if (b.type === 'table') {
      const rows = b.content.split('\n').filter(r => r.trim());
      if (!rows.length) return '';
      const header = rows[0].split(';');
      const body = rows.slice(1);
      const tFontSize = b.fontSize ?? globalFontSize;
      const tStyle = [
        b.bold      ? 'font-weight:bold'        : '',
        b.italic    ? 'font-style:italic'       : '',
        b.underline ? 'text-decoration:underline' : '',
      ].filter(Boolean).join(';');
      return `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:${tFontSize}pt${tStyle ? ';' + tStyle : ''}">
        <tr>${header.map(h => `<th style="border:1px solid #000;padding:3px 5px;background:#f0f0f0;font-weight:bold">${h}</th>`).join('')}</tr>
        ${body.map(r => `<tr>${r.split(';').map(c => `<td style="border:1px solid #000;padding:3px 5px">${c}</td>`).join('')}</tr>`).join('')}
      </table>`;
    }
    // paragraph и прочие
    return `<p${styleAttr}>${text}</p>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'Times New Roman',serif;font-size:${globalFontSize}pt;line-height:${lineHeight};margin:0;padding:0}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:${margin}mm;background:#fff}
  h1{text-align:center;font-size:${globalFontSize + 1}pt}
  p{margin:0 0 2px;text-align:justify}
</style></head><body><div class="page">
${rendered}
</div></body></html>`;
}
