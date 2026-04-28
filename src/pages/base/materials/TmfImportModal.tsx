import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore, saveStateToDb } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';

// ─── Конфигурация коллекций ───────────────────────────────────────────────────
// variantKey → метка варианта покрытия для данной коллекции
// colorSections → названия секций в таблице цветов (к каким вариантам они относятся)

interface VariantDef {
  key: string;      // ключ варианта (используется в ID)
  label: string;    // отображается в карточке материала как «params»
  pricePattern: RegExp; // паттерн строки с ценой в прайсе
  colorSection?: RegExp; // паттерн заголовка секции цветов (если цвета разбиты на секции)
}

interface CollectionConfig {
  sheetName: string;
  label: string;
  variants: VariantDef[];
  // Если true — все цвета доступны во всех вариантах (нет разбивки по секциям)
  allColorsInAllVariants?: boolean;
}

const TMF_COLLECTIONS: CollectionConfig[] = [
  {
    sheetName: 'NanoШпон', label: 'NanoШпон',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'UltraPet', label: 'UltraPet',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'ExtraMat', label: 'ExtraMat',
    allColorsInAllVariants: true,
    variants: [
      { key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'SuperMat', label: 'SuperMat',
    allColorsInAllVariants: false,
    variants: [
      { key: 'одн',  label: 'Одностороннее', pricePattern: /одностороннее/i, colorSection: /одностороннее.*покрытие/i },
      { key: 'двух', label: 'Двухстороннее', pricePattern: /двухстороннее/i, colorSection: /двухстороннее.*покрытие/i },
    ],
  },
  {
    sheetName: 'SynchroWood', label: 'SynchroWood',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i, colorSection: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i, colorSection: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'SynchroStyle', label: 'SynchroStyle',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i, colorSection: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i, colorSection: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'Акрил', label: 'Акрил',
    allColorsInAllVariants: false,
    variants: [
      { key: '1кат_одн', label: '1 кат. одностороннее', pricePattern: /1\s*категория.*одностор/i,   colorSection: /1\s*категория.*одностор/i },
      { key: '2кат_одн', label: '2 кат. одностороннее', pricePattern: /2\s*категория.*одностор/i,   colorSection: /2\s*категория.*одностор/i },
      { key: '3кат',     label: '3 категория',           pricePattern: /3\s*категория/i,             colorSection: /3\s*категория/i },
    ],
  },
];

// ─── Стабильные ID ────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ID материала: tmf__коллекция__цвет
export function tmfColorMaterialId(collectionLabel: string, colorName: string): string {
  return `tmf__${norm(collectionLabel)}__${norm(colorName)}`;
}

// ID варианта: tmf__коллекция__цвет__вариант
function tmfColorVariantId(collectionLabel: string, colorName: string, variantKey: string): string {
  return `tmf__${norm(collectionLabel)}__${norm(colorName)}__${norm(variantKey)}`;
}

// ─── Парсинг Excel ────────────────────────────────────────────────────────────

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  return isNaN(parseFloat(s)) ? 0 : parseFloat(s);
}

// Извлекает цены по паттернам
function extractPrices(rows: unknown[][], variants: VariantDef[]): Record<string, number> {
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

// Возвращает Map: colorName → Set<variantKey> (в каких вариантах доступен цвет)
function extractColorVariants(
  rows: unknown[][],
  cfg: CollectionConfig
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  if (cfg.allColorsInAllVariants) {
    // Все цвета доступны во всех вариантах — просто читаем список цветов
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

  // Цвета разбиты по секциям — каждая секция = один вариант
  // Ищем секцию цветов, внутри неё подсекции по вариантам
  let inColorSection = false;
  let currentVariantKey: string | null = null;

  for (const row of rows) {
    const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    const line = cells.join(' ').toLowerCase();

    // Вход в секцию цветов
    if (!inColorSection && (line.includes('цвета фасадов') || line.includes('цвет фасадов'))) {
      inColorSection = true; continue;
    }
    if (!inColorSection) continue;

    // Проверяем — это заголовок подсекции варианта?
    let matched = false;
    for (const v of cfg.variants) {
      if (v.colorSection && v.colorSection.test(line)) {
        currentVariantKey = v.key;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Пропускаем строки кромки и пустые
    if (line.includes('цвет кромки') || line.includes('кромка')) continue;

    if (!currentVariantKey) continue;

    // Берём цвет из первой непустой ячейки
    const colorName = cells[0];
    if (!colorName || colorName.length < 2) continue;
    // Пропускаем явно не цвета
    if (/^\d/.test(colorName)) continue;

    if (!result.has(colorName)) result.set(colorName, new Set());
    result.get(colorName)!.add(currentVariantKey);
  }

  return result;
}

// ─── Типы результата ──────────────────────────────────────────────────────────

interface ColorEntry {
  colorName: string;
  variantKeys: string[]; // ключи доступных вариантов
}

interface ParsedCollection {
  config: CollectionConfig;
  found: boolean;
  prices: Record<string, number>; // variantKey → цена
  colors: ColorEntry[];
}

// ─── Компонент ────────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export default function TmfImportModal({ onClose }: Props) {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState<ParsedCollection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState({ created: 0, updated: 0 });

  const handleFile = (file: File) => {
    setLoading(true);
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const results: ParsedCollection[] = [];

        for (const cfg of TMF_COLLECTIONS) {
          const normName = (s: string) => s.toLowerCase().replace(/\s/g, '');
          const wsName = wb.SheetNames.find(n => normName(n) === normName(cfg.sheetName));

          if (!wsName) {
            results.push({ config: cfg, found: false, prices: {}, colors: [] });
            continue;
          }

          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
          const prices = extractPrices(rows, cfg.variants);
          const colorMap = extractColorVariants(rows, cfg);

          const colors: ColorEntry[] = [];
          colorMap.forEach((variantKeys, colorName) => {
            colors.push({ colorName, variantKeys: Array.from(variantKeys) });
          });

          results.push({
            config: cfg,
            found: Object.keys(prices).length > 0 && colors.length > 0,
            prices,
            colors,
          });
        }

        setCollections(results);
        setSelected(new Set(results.filter(r => r.found).map(r => r.config.sheetName)));
        setStep('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка чтения файла');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('Ошибка чтения файла'); setLoading(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    const tmfMfr = store.manufacturers.find(m =>
      m.name.toLowerCase() === 'тмф' || m.name.toLowerCase().includes('томск')
    );
    const evseyevVendor = store.vendors.find(v => v.name.toLowerCase().includes('евсеев'));
    const today = new Date().toISOString().slice(0, 10);
    let created = 0;
    let updated = 0;

    // Собираем все новые материалы батчем для одного setState
    const newMaterials: Parameters<typeof store.setState>[0] extends (s: infer S) => infer S
      ? never
      : never = null as never;
    void newMaterials;

    store.setState(s => {
      const materials = [...s.materials];

      for (const col of collections) {
        if (!selected.has(col.config.sheetName)) continue;
        if (!col.found) continue;

        for (const { colorName, variantKeys } of col.colors) {
          const matId = tmfColorMaterialId(col.config.label, colorName);
          const matName = `${col.config.label} ${colorName}`;

          // Варианты — только те которые доступны для этого цвета
          const variants = variantKeys
            .map(vk => {
              const vDef = col.config.variants.find(v => v.key === vk);
              if (!vDef || col.prices[vk] === undefined) return null;
              return {
                id: tmfColorVariantId(col.config.label, colorName, vk),
                params: vDef.label,
                basePrice: col.prices[vk],
                size: undefined as string | undefined,
                thickness: undefined as number | undefined,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

          if (variants.length === 0) continue;

          const existingIdx = materials.findIndex(m => m.id === matId);
          if (existingIdx >= 0) {
            // Обновляем варианты и цены
            materials[existingIdx] = {
              ...materials[existingIdx],
              vendorId: evseyevVendor?.id,
              typeId: 'mt2',
              variants,
              basePrice: variants[0].basePrice,
              priceUpdatedAt: today,
            };
            updated++;
          } else {
            materials.push({
              id: matId,
              name: matName,
              manufacturerId: tmfMfr?.id,
              vendorId: evseyevVendor?.id,
              typeId: 'mt2',
              unit: 'м²',
              basePrice: variants[0].basePrice,
              variants,
              priceUpdatedAt: today,
            });
            created++;
          }
        }
      }

      return { ...s, materials };
    });

    saveStateToDb();
    setResult({ created, updated });
    setStep('done');
  };

  return (
    <Modal title="Импорт фасадов ТМФ" onClose={onClose}>
      <div className="space-y-4">

        {/* Шаг 1: загрузка */}
        {step === 'upload' && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Каждый цвет будет создан как отдельный материал. Варианты = доступные покрытия для этого цвета.
            </p>
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-border hover:border-gold rounded-xl px-6 py-10 text-center cursor-pointer transition-colors group"
            >
              <Icon name="FileSpreadsheet" size={36} className="text-[hsl(var(--text-muted))] group-hover:text-gold mx-auto mb-3 transition-colors" />
              <p className="text-sm font-medium text-foreground">Перетащи файл или нажми для выбора</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">.xlsx — прайс-лист ТМФ</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-[hsl(var(--text-muted))]">
                <Icon name="Loader2" size={15} className="animate-spin text-gold" /> Читаю файл...
              </div>
            )}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</div>
            )}
          </>
        )}

        {/* Шаг 2: превью */}
        {step === 'preview' && (
          <>
            <div className="text-xs text-[hsl(var(--text-muted))] flex items-center gap-2">
              <Icon name="FileSpreadsheet" size={12} className="text-gold" /> {fileName}
            </div>

            <div className="space-y-2 max-h-80 overflow-auto scrollbar-thin">
              {collections.map(col => {
                const isSel = selected.has(col.config.sheetName);
                return (
                  <div
                    key={col.config.sheetName}
                    onClick={() => col.found && setSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(col.config.sheetName)) next.delete(col.config.sheetName);
                      else next.add(col.config.sheetName);
                      return next;
                    })}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      !col.found
                        ? 'opacity-40 border-border bg-[hsl(220,12%,13%)] cursor-not-allowed'
                        : isSel
                          ? 'border-gold/50 bg-gold/5 cursor-pointer'
                          : 'border-border bg-[hsl(220,12%,14%)] hover:border-gold/30 cursor-pointer'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isSel && col.found ? 'bg-gold border-gold' : 'border-border'}`}>
                      {isSel && col.found && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{col.config.label}</div>
                      {col.found ? (
                        <>
                          <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5 flex gap-3 flex-wrap">
                            <span className="text-gold font-medium">{col.colors.length} цветов</span>
                            {col.config.variants
                              .filter(v => col.prices[v.key] !== undefined)
                              .map(v => (
                                <span key={v.key}>{v.label}: <span className="text-foreground font-mono">{col.prices[v.key].toLocaleString('ru-RU')} ₽</span></span>
                              ))}
                          </div>
                          {/* Превью первых нескольких цветов */}
                          <div className="text-[10px] text-[hsl(var(--text-muted))] mt-1">
                            {col.colors.slice(0, 4).map(c => c.colorName).join(', ')}
                            {col.colors.length > 4 && ` и ещё ${col.colors.length - 4}...`}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-[hsl(var(--text-muted))]">лист не найден в файле</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2">
              Будет создано: <span className="text-foreground font-medium">
                {collections.filter(c => selected.has(c.config.sheetName)).reduce((sum, c) => sum + c.colors.length, 0)}
              </span> материалов
              · Поставщик: <span className="text-foreground">Евсеев</span>
              · Тип: <span className="text-foreground">МДФ</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Icon name="Database" size={14} />
                Импортировать
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Отмена
              </button>
            </div>
          </>
        )}

        {/* Шаг 3: готово */}
        {step === 'done' && (
          <div className="text-center py-4 space-y-3">
            <Icon name="CheckCircle" size={36} className="text-green-400 mx-auto" />
            <div className="text-sm font-medium text-foreground">Готово!</div>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              {result.created > 0 && (
                <div className="bg-green-400/10 border border-green-400/20 rounded p-2 text-center">
                  <div className="text-xl font-bold text-green-400">{result.created}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))]">создано</div>
                </div>
              )}
              {result.updated > 0 && (
                <div className="bg-gold/10 border border-gold/20 rounded p-2 text-center">
                  <div className="text-xl font-bold text-gold">{result.updated}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))]">обновлено</div>
                </div>
              )}
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90">
              Закрыть
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}
