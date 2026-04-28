import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';

// ─── Конфигурация коллекций ТМФ ───────────────────────────────────────────────
// Для каждой коллекции: как называется лист, какие ценовые строки искать
// Вариант = цвет × покрытие × категория (где есть)
// Берём только цену «с кромкой»

interface CollectionConfig {
  sheetName: string;       // название листа в Excel
  label: string;           // отображаемое название
  typeId: string;          // mt9 = Фасад
  // Какие ценовые строки искать: [ключ варианта, regexp для поиска строки с ценой]
  priceRows: { variantKey: string; label: string; pattern: RegExp }[];
}

const TMF_COLLECTIONS: CollectionConfig[] = [
  {
    sheetName: 'NanoШпон',
    label: 'NanoШпон',
    typeId: 'mt9',
    priceRows: [
      { variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'UltraPet',
    label: 'UltraPet',
    typeId: 'mt9',
    priceRows: [
      { variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'ExtraMat',
    label: 'ExtraMat',
    typeId: 'mt9',
    priceRows: [
      { variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i },
    ],
  },
  {
    sheetName: 'SuperMat',
    label: 'SuperMat',
    typeId: 'mt9',
    priceRows: [
      { variantKey: 'одн с кромкой',  label: 'Одностороннее с кромкой',  pattern: /одностороннее/i },
      { variantKey: 'двух с кромкой', label: 'Двухстороннее с кромкой',  pattern: /двухстороннее/i },
    ],
  },
  {
    sheetName: 'SynchroWood',
    label: 'SynchroWood',
    typeId: 'mt9',
    priceRows: [
      { variantKey: '1кат с кромкой', label: '1 категория с кромкой', pattern: /1\s*категория/i },
      { variantKey: '2кат с кромкой', label: '2 категория с кромкой', pattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'SynchroStyle',
    label: 'SynchroStyle',
    typeId: 'mt9',
    priceRows: [
      { variantKey: '1кат с кромкой', label: '1 категория с кромкой', pattern: /1\s*категория/i },
      { variantKey: '2кат с кромкой', label: '2 категория с кромкой', pattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'Акрил',
    label: 'Акрил',
    typeId: 'mt9',
    priceRows: [
      { variantKey: '1кат одн с кромкой', label: '1 кат. одностороннее с кромкой', pattern: /1\s*категория.*одностор/i },
      { variantKey: '2кат одн с кромкой', label: '2 кат. одностороннее с кромкой', pattern: /2\s*категория.*одностор/i },
      { variantKey: '3кат с кромкой',     label: '3 категория с кромкой',           pattern: /3\s*категория/i },
    ],
  },
];

// Стабильный ID материала ТМФ по коллекции
function tmfMaterialId(collectionLabel: string): string {
  return `tmf__${collectionLabel.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_')}`;
}

// Стабильный ID варианта
function tmfVariantId(collectionLabel: string, variantKey: string): string {
  const col = collectionLabel.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_');
  const vk = variantKey.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_');
  return `tmf__${col}__${vk}`;
}

// ─── Парсинг Excel ────────────────────────────────────────────────────────────

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Извлекает цены из листа по паттернам строк
// Ищет строку содержащую паттерн → берёт первое число > 1000 в строке или ближайших 3 строках
function extractPrices(
  rows: unknown[][],
  priceRows: CollectionConfig['priceRows']
): Record<string, number> {
  const prices: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Склеиваем все ячейки строки в одну строку для поиска паттерна
    const lineText = row.map(c => String(c ?? '')).join(' ').replace(/\s+/g, ' ').trim();

    for (const pr of priceRows) {
      if (prices[pr.variantKey] !== undefined) continue; // уже нашли
      if (!pr.pattern.test(lineText)) continue;

      // Ищем цену в этой строке
      for (const cell of row) {
        const p = parsePrice(cell);
        if (p > 1000) { prices[pr.variantKey] = p; break; }
      }

      // Если не нашли — смотрим 3 следующие строки
      if (prices[pr.variantKey] === undefined) {
        for (let di = 1; di <= 3 && i + di < rows.length; di++) {
          for (const cell of rows[i + di]) {
            const p = parsePrice(cell);
            if (p > 1000) { prices[pr.variantKey] = p; break; }
          }
          if (prices[pr.variantKey] !== undefined) break;
        }
      }
    }
  }

  return prices;
}

// Считает цвета в секции «Цвета фасадов»
function countColors(rows: unknown[][]): string[] {
  const colors: string[] = [];
  let inSection = false;
  for (const row of rows) {
    const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    const line = cells.join(' ').toLowerCase();

    if (!inSection && (line.includes('цвета фасадов') || line.includes('цвет фасадов'))) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;

    // Строки-заголовки секций пропускаем
    if (line.includes('цвет кромки') || line.includes('одностороннее') ||
        line.includes('двухстороннее') || line.includes('категория')) continue;

    // Берём первую непустую ячейку как название цвета
    const colorName = cells[0];
    if (colorName && colorName.length > 1) colors.push(colorName);
  }
  return colors;
}

// ─── Типы результата ──────────────────────────────────────────────────────────

interface ParsedCollection {
  config: CollectionConfig;
  found: boolean;           // лист найден в файле
  prices: Record<string, number>; // variantKey → цена
  colors: string[];         // список цветов
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
          // Ищем лист по имени (нормализованный)
          const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
          const wsName = wb.SheetNames.find(n => norm(n) === norm(cfg.sheetName));

          if (!wsName) {
            results.push({ config: cfg, found: false, prices: {}, colors: [] });
            continue;
          }

          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
          const prices = extractPrices(rows, cfg.priceRows);
          const colors = countColors(rows);

          results.push({
            config: cfg,
            found: Object.keys(prices).length > 0,
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
    // Ищем производителя ТМФ
    const tmfMfr = store.manufacturers.find(m =>
      m.name.toLowerCase() === 'тмф' || m.name.toLowerCase().includes('томск')
    );

    const today = new Date().toISOString().slice(0, 10);
    let created = 0;
    let updated = 0;

    for (const col of collections) {
      if (!selected.has(col.config.sheetName)) continue;
      if (!col.found) continue;

      const matId = tmfMaterialId(col.config.label);
      const matName = `Фасад ТМФ ${col.config.label}`;

      // Строим варианты: один вариант = одна ценовая строка (с кромкой)
      // params = label варианта (напр. «С кромкой», «Одностороннее с кромкой»)
      const variants = col.config.priceRows
        .filter(pr => col.prices[pr.variantKey] !== undefined)
        .map(pr => ({
          id: tmfVariantId(col.config.label, pr.variantKey),
          params: pr.label,
          basePrice: col.prices[pr.variantKey],
          size: undefined as string | undefined,
          thickness: undefined as number | undefined,
        }));

      if (variants.length === 0) continue;

      const existing = store.materials.find(m => m.id === matId);

      if (existing) {
        store.updateMaterial(matId, {
          variants,
          basePrice: variants[0].basePrice,
          priceUpdatedAt: today,
        });
        updated++;
      } else {
        // Добавляем с явным фиксированным id через setState
        store.setState(s => ({
          ...s,
          materials: [
            ...s.materials,
            {
              id: matId,
              name: matName,
              manufacturerId: tmfMfr?.id,
              typeId: col.config.typeId,
              unit: 'м²',
              basePrice: variants[0].basePrice,
              variants,
              priceUpdatedAt: today,
            },
          ],
        }));
        created++;
      }
    }

    setResult({ created, updated });
    setStep('done');
  };

  return (
    <Modal title="Импорт фасадов ТМФ" onClose={onClose}>
      <div className="space-y-4">

        {/* Шаг 1: загрузка */}
        {step === 'upload' && (
          <>
            <div className="text-xs text-[hsl(var(--text-muted))]">
              Загрузи Excel-прайс ТМФ. Будут созданы материалы по коллекциям с вариантами цен и списком цветов.
            </div>
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
              <div className="flex items-center justify-center gap-2 py-2 text-[hsl(var(--text-muted))] text-sm">
                <Icon name="Loader2" size={15} className="animate-spin text-gold" /> Читаю файл...
              </div>
            )}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {error}
              </div>
            )}
          </>
        )}

        {/* Шаг 2: превью */}
        {step === 'preview' && (
          <>
            <div className="text-xs text-[hsl(var(--text-muted))] flex items-center gap-2">
              <Icon name="FileSpreadsheet" size={12} className="text-gold" />
              {fileName}
            </div>

            <div className="space-y-2 max-h-72 overflow-auto scrollbar-thin">
              {collections.map(col => {
                const isSelected = selected.has(col.config.sheetName);
                const variantCount = Object.keys(col.prices).length;
                return (
                  <div
                    key={col.config.sheetName}
                    onClick={() => col.found && setSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(col.config.sheetName)) next.delete(col.config.sheetName);
                      else next.add(col.config.sheetName);
                      return next;
                    })}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      !col.found
                        ? 'opacity-40 border-border bg-[hsl(220,12%,13%)] cursor-not-allowed'
                        : isSelected
                          ? 'border-gold/50 bg-gold/5 cursor-pointer'
                          : 'border-border bg-[hsl(220,12%,14%)] hover:border-gold/30 cursor-pointer'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected && col.found ? 'bg-gold border-gold' : 'border-border'
                    }`}>
                      {isSelected && col.found && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{col.config.label}</div>
                      {col.found ? (
                        <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5 flex gap-3">
                          <span className="text-gold">{variantCount} вар. цен</span>
                          {col.colors.length > 0 && <span>{col.colors.length} цветов</span>}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[hsl(var(--text-muted))]">лист не найден в файле</div>
                      )}
                    </div>
                    {col.found && (
                      <div className="text-right text-xs shrink-0 space-y-0.5">
                        {col.config.priceRows
                          .filter(pr => col.prices[pr.variantKey] !== undefined)
                          .map(pr => (
                            <div key={pr.variantKey} className="text-[hsl(var(--text-dim))]">
                              {pr.label}: <span className="text-foreground font-mono">{col.prices[pr.variantKey].toLocaleString('ru-RU')} ₽</span>
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
                disabled={selected.size === 0}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Icon name="Database" size={14} />
                Импортировать {selected.size} коллекций
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
