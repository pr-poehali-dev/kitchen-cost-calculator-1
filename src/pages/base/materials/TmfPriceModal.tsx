import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useCatalog, updatePricesBatch, loadCatalog } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';
import { tmfColorMaterialId } from './TmfImportModal';

// ─── Конфигурация (дублируется из TmfImportModal для независимости) ────────────

interface VariantDef {
  key: string;
  label: string;
  pricePattern: RegExp;
}

interface CollectionConfig {
  sheetName: string;
  label: string;
  variants: VariantDef[];
}

const TMF_COLLECTIONS: CollectionConfig[] = [
  {
    sheetName: 'NanoШпон', label: 'NanoШпон',
    variants: [{ key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'UltraPet', label: 'UltraPet',
    variants: [{ key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'ExtraMat', label: 'ExtraMat',
    variants: [{ key: 'с_кромкой', label: 'С кромкой', pricePattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'SuperMat', label: 'SuperMat',
    variants: [
      { key: 'одн',  label: 'Одностороннее', pricePattern: /одностороннее/i },
      { key: 'двух', label: 'Двухстороннее', pricePattern: /двухстороннее/i },
    ],
  },
  {
    sheetName: 'SynchroWood', label: 'SynchroWood',
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'SynchroStyle', label: 'SynchroStyle',
    variants: [
      { key: '1кат', label: '1 категория', pricePattern: /1\s*категория/i },
      { key: '2кат', label: '2 категория', pricePattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'Акрил', label: 'Акрил',
    variants: [
      { key: '1кат_одн', label: '1 кат. одностороннее', pricePattern: /1\s*категория.*одностор/i },
      { key: '2кат_одн', label: '2 кат. одностороннее', pricePattern: /2\s*категория.*одностор/i },
      { key: '3кат',     label: '3 категория',           pricePattern: /3\s*категория/i },
    ],
  },
];

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  return isNaN(parseFloat(s)) ? 0 : parseFloat(s);
}

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

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface PriceChange {
  collectionLabel: string;
  variantKey: string;
  variantLabel: string;
  oldPrice: number;
  newPrice: number;
  // Сколько материалов-цветов будет обновлено
  colorCount: number;
  selected: boolean;
}

interface Props { onClose: () => void }

export default function TmfPriceModal({ onClose }: Props) {
  const catalog = useCatalog();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changes, setChanges] = useState<PriceChange[] | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFile = (file: File) => {
    setLoading(true);
    setError('');
    setFileName(file.name);
    setChanges(null);
    setSaved(false);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const allChanges: PriceChange[] = [];

        for (const cfg of TMF_COLLECTIONS) {
          const normSheet = (s: string) => s.toLowerCase().replace(/\s/g, '');
          const wsName = wb.SheetNames.find(n => normSheet(n) === normSheet(cfg.sheetName));
          if (!wsName) continue;

          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
          const newPrices = extractPrices(rows, cfg.variants);

          // Ищем все материалы этой коллекции в базе (по префиксу id)
          const prefix = `tmf__${cfg.label.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}__`;
          const collMaterials = catalog.materials.filter(m => m.id.startsWith(prefix));

          for (const v of cfg.variants) {
            const newPrice = newPrices[v.key];
            if (newPrice === undefined) continue;

            // Ищем материалы у которых есть вариант с этим ключом
            const variantSuffix = `__${v.key.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
            const affectedMats = collMaterials.filter(m =>
              m.variants?.some(vr => vr.id.endsWith(variantSuffix))
            );

            if (affectedMats.length === 0) continue;

            // Берём текущую цену из первого материала (у всех одинаковая по варианту)
            const sampleVariant = affectedMats[0].variants?.find(vr => vr.id.endsWith(variantSuffix));
            const oldPrice = sampleVariant?.basePrice ?? 0;

            if (Math.round(oldPrice) !== Math.round(newPrice)) {
              allChanges.push({
                collectionLabel: cfg.label,
                variantKey: v.key,
                variantLabel: v.label,
                oldPrice,
                newPrice,
                colorCount: affectedMats.length,
                selected: true,
              });
            }
          }
        }

        setChanges(allChanges);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка чтения файла');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('Ошибка чтения файла'); setLoading(false); };
    reader.readAsArrayBuffer(file);
  };

  const toggle = (idx: number) =>
    setChanges(prev => prev?.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c) ?? null);

  const handleSave = async () => {
    if (!changes) return;
    const sel = changes.filter(c => c.selected);

    const updates: Array<{ materialId: string; variants: Array<{ variantId: string; basePrice: number }> }> = [];

    for (const mat of catalog.materials) {
      if (!mat.id.startsWith('tmf__')) continue;
      if (!mat.variants?.length) continue;

      const changedVariants: Array<{ variantId: string; basePrice: number }> = [];
      for (const v of mat.variants) {
        for (const chg of sel) {
          const variantSuffix = `__${chg.variantKey.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
          const collPrefix = `tmf__${chg.collectionLabel.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}__`;
          if (mat.id.startsWith(collPrefix) && v.id.endsWith(variantSuffix)) {
            changedVariants.push({ variantId: v.id, basePrice: chg.newPrice });
            break;
          }
        }
      }
      if (changedVariants.length > 0) {
        updates.push({ materialId: mat.id, variants: changedVariants });
      }
    }

    await updatePricesBatch(updates);
    await loadCatalog();
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = changes?.filter(c => c.selected).length ?? 0;
  const totalColors = changes?.filter(c => c.selected).reduce((sum, c) => sum + c.colorCount, 0) ?? 0;

  return (
    <Modal title="Обновить цены ТМФ из Excel" onClose={onClose}>
      <div className="space-y-4">

        {!fileName && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Загрузи новый прайс ТМФ — цены обновятся во всех материалах-цветах каждой коллекции.
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
          </>
        )}

        {fileName && !loading && (
          <div className="flex items-center gap-3 bg-[hsl(220,12%,14%)] rounded-lg px-4 py-3 border border-border">
            <Icon name="FileSpreadsheet" size={16} className="text-gold shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
            <button onClick={() => { setFileName(''); setChanges(null); setError(''); }}
              className="text-[hsl(var(--text-muted))] hover:text-foreground shrink-0">
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-[hsl(var(--text-muted))]">
            <Icon name="Loader2" size={15} className="animate-spin text-gold" /> Читаю файл...
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="AlertCircle" size={13} /> {error}
          </div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены ТМФ обновлены!
          </div>
        )}

        {changes !== null && !saved && (
          <>
            {changes.length === 0 ? (
              <div className="text-center py-6 flex flex-col items-center gap-2 text-sm text-green-400">
                <Icon name="CheckCircle" size={24} />
                Все цены актуальны
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
                  <span>Изменений: <span className="text-gold font-medium">{changes.length}</span></span>
                  <div className="flex gap-3">
                    <button onClick={() => setChanges(c => c?.map(x => ({ ...x, selected: true })) ?? null)} className="hover:text-gold">все</button>
                    <button onClick={() => setChanges(c => c?.map(x => ({ ...x, selected: false })) ?? null)} className="hover:text-gold">снять</button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 1fr 1fr 50px 50px 60px' }}>
                    <span /><span>Коллекция</span><span>Вариант</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                    <span className="text-right">Цветов</span>
                  </div>
                  {changes.map((c, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 1fr 50px 50px 60px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${c.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {c.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-xs font-medium truncate">{c.collectionLabel}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{c.variantLabel}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(c.oldPrice)}</span>
                      <span className={`text-xs font-mono text-right font-medium ${c.newPrice > c.oldPrice ? 'text-red-400' : 'text-green-400'}`}>{fmt(c.newPrice)}</span>
                      <span className="text-xs text-right text-[hsl(var(--text-muted))]">{c.colorCount} шт.</span>
                    </div>
                  ))}
                </div>

                {totalColors > 0 && (
                  <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2">
                    Будет обновлено <span className="text-foreground font-medium">{totalColors}</span> материалов
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Выбрано: {selectedCount} из {changes.length}</span>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
                    <button onClick={handleSave} disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      <Icon name="Check" size={14} /> Обновить {totalColors > 0 ? `(${totalColors} матер.)` : ''}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </Modal>
  );
}