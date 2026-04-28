import type { CollectionConfig, VariantDef } from './tmfConfig';

// ─── Типы результата ──────────────────────────────────────────────────────────

export interface ColorEntry {
  colorName: string;
  variantKeys: string[];
}

export interface ParsedCollection {
  config: CollectionConfig;
  found: boolean;
  prices: Record<string, number>;
  colors: ColorEntry[];
}

// ─── Функции парсинга ─────────────────────────────────────────────────────────

export function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  return isNaN(parseFloat(s)) ? 0 : parseFloat(s);
}

export function extractPrices(rows: unknown[][], variants: VariantDef[]): Record<string, number> {
  const prices: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineText = row.map(c => String(c ?? '')).join(' ').replace(/\s+/g, ' ').trim();
    for (const v of variants) {
      if (prices[v.key] !== undefined) continue;
      if (!v.pricePattern.test(lineText)) continue;
      for (const cell of row) {
        const p = parsePrice(cell);
        if (p > 1000) { prices[v.key] = p; break; }
      }
      if (prices[v.key] === undefined) {
        for (let di = 1; di <= 3 && i + di < rows.length; di++) {
          for (const cell of rows[i + di]) {
            const p = parsePrice(cell);
            if (p > 1000) { prices[v.key] = p; break; }
          }
          if (prices[v.key] !== undefined) break;
        }
      }
    }
  }
  return prices;
}

export function extractColorVariants(
  rows: unknown[][],
  cfg: CollectionConfig
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  if (cfg.allColorsInAllVariants) {
    let inSection = false;
    for (const row of rows) {
      const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
      const line = cells.join(' ').toLowerCase();
      if (!inSection && (line.includes('цвета фасадов') || line.includes('цвет фасадов'))) {
        inSection = true; continue;
      }
      if (!inSection) continue;
      if (line.includes('цвет кромки')) continue;
      const colorName = cells[0];
      if (!colorName || colorName.length < 2) continue;
      const allKeys = new Set(cfg.variants.map(v => v.key));
      result.set(colorName, allKeys);
    }
    return result;
  }

  let inColorSection = false;
  let currentVariantKey: string | null = null;

  for (const row of rows) {
    const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    const line = cells.join(' ').toLowerCase();

    if (!inColorSection && (line.includes('цвета фасадов') || line.includes('цвет фасадов'))) {
      inColorSection = true; continue;
    }
    if (!inColorSection) continue;

    let matched = false;
    for (const v of cfg.variants) {
      if (v.colorSection && v.colorSection.test(line)) {
        currentVariantKey = v.key;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (line.includes('цвет кромки') || line.includes('кромка')) continue;
    if (!currentVariantKey) continue;

    const colorName = cells[0];
    if (!colorName || colorName.length < 2) continue;
    if (/^\d/.test(colorName)) continue;

    if (!result.has(colorName)) result.set(colorName, new Set());
    result.get(colorName)!.add(currentVariantKey);
  }

  return result;
}
