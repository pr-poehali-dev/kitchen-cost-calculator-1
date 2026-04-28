import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';

// ─── Конфигурация листов ТМФ ──────────────────────────────────────────────────

interface TmfSheet {
  key: string;
  label: string;
  // Варианты: { id варианта, label, признак поиска в прайсе }
  variants: { id: string; label: string; searchLabel: string }[];
}

// Листы с простой структурой: одна цена или с кромкой/без кромки
const TMF_SHEETS: TmfSheet[] = [
  {
    key: 'NanoШпон',
    label: 'NanoШпон',
    variants: [
      { id: 'с кромкой',   label: 'С кромкой [18мм]',   searchLabel: 'с кромкой' },
      { id: 'без кромки',  label: 'Без кромки [18мм]',  searchLabel: 'без кромки' },
    ],
  },
  {
    key: 'UltraPet',
    label: 'UltraPet',
    variants: [
      { id: 'с кромкой',   label: 'С кромкой [18мм]',   searchLabel: 'с кромкой' },
      { id: 'без кромки',  label: 'Без кромки [18мм]',  searchLabel: 'без кромки' },
    ],
  },
  {
    key: 'ExtraMat',
    label: 'ExtraMat',
    variants: [
      { id: 'с кромкой',   label: 'С кромкой [18мм]',   searchLabel: 'с кромкой' },
      { id: 'без кромки',  label: 'Без кромки [18мм]',  searchLabel: 'без кромки' },
    ],
  },
  {
    key: 'SuperMat',
    label: 'SuperMat',
    variants: [
      { id: 'одн с кромкой',   label: 'Одностороннее с кромкой',   searchLabel: 'одностороннее.*с кромкой' },
      { id: 'одн без кромки',  label: 'Одностороннее без кромки',  searchLabel: 'одностороннее.*без кромки' },
      { id: 'двух с кромкой',  label: 'Двухстороннее с кромкой',   searchLabel: 'двухстороннее.*с кромкой' },
      { id: 'двух без кромки', label: 'Двухстороннее без кромки',  searchLabel: 'двухстороннее.*без кромки' },
    ],
  },
  {
    key: 'SynchroWood',
    label: 'SynchroWood',
    variants: [
      { id: '1кат с кромкой',  label: '1 кат. с кромкой',  searchLabel: '1 категория' },
      { id: '1кат без кромки', label: '1 кат. без кромки', searchLabel: '1 категория' },
      { id: '2кат с кромкой',  label: '2 кат. с кромкой',  searchLabel: '2 категория' },
      { id: '2кат без кромки', label: '2 кат. без кромки', searchLabel: '2 категория' },
    ],
  },
  {
    key: 'SynchroStyle',
    label: 'SynchroStyle',
    variants: [
      { id: '1кат с кромкой',  label: '1 кат. с кромкой',  searchLabel: '1 категория' },
      { id: '1кат без кромки', label: '1 кат. без кромки', searchLabel: '1 категория' },
      { id: '2кат с кромкой',  label: '2 кат. с кромкой',  searchLabel: '2 категория' },
      { id: '2кат без кромки', label: '2 кат. без кромки', searchLabel: '2 категория' },
    ],
  },
  {
    key: 'Акрил',
    label: 'Акрил',
    variants: [
      { id: '1кат одн с кромкой',   label: '1 кат. одностор. с кромкой',   searchLabel: '1 категория.*односторонн.*с кромкой' },
      { id: '1кат одн без кромки',  label: '1 кат. одностор. без кромки',  searchLabel: '1 категория.*односторонн.*без кромки' },
      { id: '2кат одн с кромкой',   label: '2 кат. одностор. с кромкой',   searchLabel: '2 категория.*односторонн.*с кромкой' },
      { id: '2кат одн без кромки',  label: '2 кат. одностор. без кромки',  searchLabel: '2 категория.*односторонн.*без кромки' },
      { id: '3кат с кромкой',       label: '3 кат. с кромкой',              searchLabel: '3 категория.*с кромкой' },
      { id: '3кат без кромки',      label: '3 кат. без кромки',             searchLabel: '3 категория.*без кромки' },
    ],
  },
];

// ─── Парсер прайса ТМФ ────────────────────────────────────────────────────────

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normStr(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface SheetPrices {
  sheetKey: string;
  prices: Record<string, number>; // variantId → цена
  colorsCount: number;
}

function parseTmfSheet(ws: XLSX.WorkSheet, sheet: TmfSheet): SheetPrices {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const prices: Record<string, number> = {};
  let colorsCount = 0;

  // Ищем строки с ценами — ищем ячейки которые содержат нужные метки
  // Для простых листов (NanoШпон, UltraPet, ExtraMat): ищем строки "Прямые фасады с кромкой" / "без кромки"
  // Для сложных (SuperMat, SynchroWood, SynchroStyle, Акрил): ищем по категориям

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];

    for (let j = 0; j < row.length; j++) {
      const cellStr = normStr(String(row[j] || ''));
      if (!cellStr) continue;

      for (const variant of sheet.variants) {
        // Уже нашли эту цену
        if (prices[variant.id] !== undefined) continue;

        const pattern = new RegExp(variant.searchLabel, 'i');
        if (!pattern.test(cellStr)) continue;

        // Ищем цену в этой строке — первое число > 1000
        for (let k = j + 1; k < Math.min(j + 6, row.length); k++) {
          const price = parsePrice(row[k]);
          if (price > 1000) {
            prices[variant.id] = price;
            break;
          }
        }
        // Если не нашли в строке — ищем в следующих строках (та же колонка или рядом)
        if (prices[variant.id] === undefined) {
          for (let di = 1; di <= 3; di++) {
            if (i + di >= rows.length) break;
            const nextRow = rows[i + di] as unknown[];
            for (let k = j; k < Math.min(j + 4, nextRow.length); k++) {
              const price = parsePrice(nextRow[k]);
              if (price > 1000) {
                prices[variant.id] = price;
                break;
              }
            }
            if (prices[variant.id] !== undefined) break;
          }
        }
      }
    }
  }

  // Считаем цвета — ищем секцию "Цвета фасадов" и считаем строки после неё
  let inColors = false;
  for (const row of rows) {
    const firstCell = normStr(String((row as unknown[])[0] || (row as unknown[])[1] || ''));
    if (firstCell.includes('цвета фасадов') || firstCell.includes('цвет фасадов')) {
      inColors = true;
      continue;
    }
    if (inColors) {
      const val = String((row as unknown[])[0] || (row as unknown[])[1] || '').trim();
      if (val && !val.toLowerCase().includes('цвет') && !val.toLowerCase().includes('кромк')) {
        colorsCount++;
      }
    }
  }

  return { sheetKey: sheet.key, prices, colorsCount };
}

// ─── Компонент ────────────────────────────────────────────────────────────────

interface ParsedResult {
  sheetKey: string;
  label: string;
  prices: Record<string, number>;
  colorsCount: number;
  found: boolean;
}

interface Props {
  onClose: () => void;
}

export default function TmfImportModal({ onClose }: Props) {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedResult[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [result, setResult] = useState({ created: 0, updated: 0 });

  const handleFile = (file: File) => {
    setLoading(true);
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const results: ParsedResult[] = [];

        for (const sheet of TMF_SHEETS) {
          // Ищем лист по имени (регистронезависимо)
          const wsName = wb.SheetNames.find(n =>
            n.toLowerCase().replace(/\s/g, '') === sheet.key.toLowerCase().replace(/\s/g, '')
          );
          if (!wsName) {
            results.push({ sheetKey: sheet.key, label: sheet.label, prices: {}, colorsCount: 0, found: false });
            continue;
          }

          const ws = wb.Sheets[wsName];
          const { prices, colorsCount } = parseTmfSheet(ws, sheet);
          const variantsFound = Object.keys(prices).length;

          results.push({
            sheetKey: sheet.key,
            label: sheet.label,
            prices,
            colorsCount,
            found: variantsFound > 0,
          });
        }

        setParsed(results);
        // Авто-выбираем все найденные листы
        setSelectedSheets(new Set(results.filter(r => r.found).map(r => r.sheetKey)));
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

  const toggleSheet = (key: string) => {
    setSelectedSheets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImport = () => {
    const tmfMfr = store.manufacturers.find(m => m.name.toLowerCase() === 'тмф') ||
                   store.manufacturers.find(m => m.name.toLowerCase().includes('томск'));

    // Тип материала — «Фасад» (ищем по имени)
    const facadeType = store.settings.materialTypes.find(t =>
      t.name.toLowerCase().includes('фасад') || t.name.toLowerCase().includes('facade')
    );

    const today = new Date().toISOString().slice(0, 10);
    let created = 0;
    let updated = 0;

    for (const res of parsed) {
      if (!selectedSheets.has(res.sheetKey)) continue;
      if (!res.found) continue;

      const sheet = TMF_SHEETS.find(s => s.key === res.sheetKey)!;
      const matName = `Фасад ТМФ ${res.label}`;

      // Варианты из распарсенных цен
      const variants = sheet.variants
        .filter(v => res.prices[v.id] !== undefined)
        .map((v, idx) => ({
          id: `tmf_${res.sheetKey.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_')}_v${idx + 1}`,
          size: undefined,
          thickness: undefined,
          params: v.label,
          basePrice: res.prices[v.id],
        }));

      if (variants.length === 0) continue;

      // Проверяем существует ли уже
      const existing = store.materials.find(m => m.name === matName);

      if (existing) {
        // Обновляем варианты
        store.updateMaterial(existing.id, {
          variants,
          basePrice: variants[0]?.basePrice ?? 0,
          priceUpdatedAt: today,
        });
        updated++;
      } else {
        // Создаём новый
        store.addMaterial({
          name: matName,
          manufacturerId: tmfMfr?.id,
          typeId: facadeType?.id ?? store.settings.materialTypes[0]?.id ?? '',
          unit: 'м²',
          basePrice: variants[0]?.basePrice ?? 0,
          variants,
          priceUpdatedAt: today,
        });
        created++;
      }
    }

    setResult({ created, updated });
    setStep('done');
  };

  const sheetConfig = (key: string) => TMF_SHEETS.find(s => s.key === key);

  return (
    <Modal title="Импорт фасадов ТМФ" onClose={onClose}>
      <div className="space-y-4">

        {/* Шаг 1: загрузка файла */}
        {step === 'upload' && (
          <>
            <div className="text-xs text-[hsl(var(--text-muted))]">
              Загрузи прайс-лист ТМФ (.xlsx). Система распознает листы:<br />
              <span className="text-foreground">NanoШпон, UltraPet, ExtraMat, SuperMat, SynchroWood, SynchroStyle, Акрил</span>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-gold rounded-xl px-6 py-8 text-center cursor-pointer transition-colors group"
            >
              <Icon name="FileSpreadsheet" size={32} className="text-[hsl(var(--text-muted))] group-hover:text-gold mx-auto mb-3 transition-colors" />
              <p className="text-sm text-foreground font-medium">Перетащи файл или нажми для выбора</p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">.xlsx — прайс-лист ТМФ</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-[hsl(var(--text-muted))]">
                <Icon name="Loader2" size={16} className="animate-spin text-gold" />
                <span className="text-sm">Читаю файл...</span>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
                <Icon name="AlertCircle" size={13} /> {error}
              </div>
            )}
          </>
        )}

        {/* Шаг 2: превью найденных листов */}
        {step === 'preview' && (
          <>
            <div className="flex items-center gap-2 bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2">
              <Icon name="FileSpreadsheet" size={14} className="text-gold shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{fileName}</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-auto scrollbar-thin">
              {parsed.map(res => {
                const cfg = sheetConfig(res.sheetKey);
                const isSelected = selectedSheets.has(res.sheetKey);
                return (
                  <div
                    key={res.sheetKey}
                    onClick={() => res.found && toggleSheet(res.sheetKey)}
                    className={`rounded border p-3 transition-all ${
                      !res.found
                        ? 'border-border opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'border-gold bg-gold/5 cursor-pointer'
                          : 'border-border hover:border-gold/40 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected && res.found ? 'bg-gold border-gold' : 'border-border'
                      }`}>
                        {isSelected && res.found && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-sm font-medium text-foreground">{res.label}</span>
                      {!res.found && <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">Лист не найден</span>}
                      {res.found && <span className="text-xs text-green-400 ml-auto">Найдено</span>}
                    </div>

                    {res.found && (
                      <div className="mt-2 ml-6 space-y-1">
                        {cfg?.variants.map(v => (
                          <div key={v.id} className="flex items-center justify-between text-xs">
                            <span className="text-[hsl(var(--text-dim))]">{v.label}</span>
                            {res.prices[v.id] !== undefined
                              ? <span className="text-foreground font-mono">{res.prices[v.id].toLocaleString('ru-RU')} ₽/м²</span>
                              : <span className="text-[hsl(var(--text-muted))]">не найдено</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleImport}
                disabled={selectedSheets.size === 0}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                Импортировать {selectedSheets.size} коллекций
              </button>
              <button onClick={() => { setStep('upload'); setFileName(''); setParsed([]); }}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Назад
              </button>
            </div>
          </>
        )}

        {/* Шаг 3: результат */}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Icon name="CheckCircle" size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                {result.created > 0 && <div className="text-emerald-400 font-medium">Создано {result.created} новых материалов</div>}
                {result.updated > 0 && <div className="text-gold font-medium">Обновлено {result.updated} существующих</div>}
                {result.created === 0 && result.updated === 0 && (
                  <div className="text-[hsl(var(--text-muted))]">Изменений нет</div>
                )}
                <div className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Цены добавлены как варианты (с/без кромки, по категориям)
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
              Готово
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}
