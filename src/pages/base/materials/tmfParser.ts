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

  // Для разделённых коллекций: ищем секцию цветов,
  // внутри — подсекции по вариантам (одностороннее/категория)
  // Поддерживаем два режима:
  // А) Последовательные подсекции (SynchroWood, SynchroStyle, Акрил)
  // Б) Параллельные колонки (SuperMat: одностор. | двухстор.)

  // Сначала определяем режим по colorSection паттернам
  // Находим строку-заголовок секции цветов
  let colorSectionStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].map(c => String(c ?? '').trim()).join(' ').toLowerCase();
    if (line.includes('цвета фасадов') || line.includes('цвет фасадов')) {
      colorSectionStart = i + 1;
      break;
    }
  }
  if (colorSectionStart < 0) return result;

  // Ищем заголовки подсекций и их колонки
  // variantColMap: variantKey → индекс колонки в таблице (для параллельного режима)
  const variantColMap = new Map<string, number>(); // key → colIndex в оригинальной строке

  // Сканируем строки начиная с colorSectionStart
  let currentVariantKey: string | null = null;
  let parallelMode = false; // true если несколько вариантов в одной строке-заголовке

  for (let i = colorSectionStart; i < rows.length; i++) {
    const rawRow = rows[i] as unknown[];
    const rawCells = rawRow.map(c => String(c ?? '').trim());
    const line = rawCells.join(' ').toLowerCase();

    // Пропускаем строки с кромками
    if (line.includes('цвет кромки')) continue;

    // Проверяем — строка-заголовок подсекции?
    let isHeader = false;
    const foundVariantsInRow: string[] = [];
    for (const v of cfg.variants) {
      if (v.colorSection && v.colorSection.test(line)) {
        foundVariantsInRow.push(v.key);
        isHeader = true;
      }
    }

    if (isHeader) {
      if (foundVariantsInRow.length > 1) {
        // Параллельный режим: несколько вариантов в одной заголовочной строке
        parallelMode = true;
        variantColMap.clear();
        for (const vKey of foundVariantsInRow) {
          const vDef = cfg.variants.find(v => v.key === vKey)!;
          // Ищем индекс колонки с этим заголовком
          const colIdx = rawCells.findIndex(c => vDef.colorSection!.test(c.toLowerCase()));
          if (colIdx >= 0) variantColMap.set(vKey, colIdx);
        }
      } else {
        // Последовательный режим
        parallelMode = false;
        currentVariantKey = foundVariantsInRow[0];
      }
      continue;
    }

    if (parallelMode && variantColMap.size > 0) {
      // Берём цвета из каждой колонки варианта
      for (const [vKey, colIdx] of variantColMap) {
        const colorName = rawCells[colIdx]?.trim();
        if (!colorName || colorName.length < 2) continue;
        if (/^\d/.test(colorName)) continue;
        if (colorName.toLowerCase().includes('кромк')) continue;
        if (!result.has(colorName)) result.set(colorName, new Set());
        result.get(colorName)!.add(vKey);
      }
    } else if (!parallelMode && currentVariantKey) {
      // Берём первую непустую ячейку как цвет
      const colorName = rawCells.find(c => c.length >= 2);
      if (!colorName) continue;
      if (/^\d/.test(colorName)) continue;
      if (colorName.toLowerCase().includes('кромк')) continue;
      if (!result.has(colorName)) result.set(colorName, new Set());
      result.get(colorName)!.add(currentVariantKey);
    }
  }

  return result;
}