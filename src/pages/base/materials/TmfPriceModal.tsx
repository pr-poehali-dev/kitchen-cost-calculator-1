import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';

// Импортируем те же конфигурации и функции что и в TmfImportModal
// (дублируем чтобы не создавать лишней зависимости между файлами)

interface PriceRowConfig {
  variantKey: string;
  label: string;
  pattern: RegExp;
}

interface CollectionConfig {
  sheetName: string;
  label: string;
  priceRows: PriceRowConfig[];
}

const TMF_COLLECTIONS: CollectionConfig[] = [
  {
    sheetName: 'NanoШпон', label: 'NanoШпон',
    priceRows: [{ variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'UltraPet', label: 'UltraPet',
    priceRows: [{ variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'ExtraMat', label: 'ExtraMat',
    priceRows: [{ variantKey: 'с кромкой', label: 'С кромкой', pattern: /прямые фасады с кромкой/i }],
  },
  {
    sheetName: 'SuperMat', label: 'SuperMat',
    priceRows: [
      { variantKey: 'одн с кромкой',  label: 'Одностороннее с кромкой',  pattern: /одностороннее/i },
      { variantKey: 'двух с кромкой', label: 'Двухстороннее с кромкой',  pattern: /двухстороннее/i },
    ],
  },
  {
    sheetName: 'SynchroWood', label: 'SynchroWood',
    priceRows: [
      { variantKey: '1кат с кромкой', label: '1 категория с кромкой', pattern: /1\s*категория/i },
      { variantKey: '2кат с кромкой', label: '2 категория с кромкой', pattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'SynchroStyle', label: 'SynchroStyle',
    priceRows: [
      { variantKey: '1кат с кромкой', label: '1 категория с кромкой', pattern: /1\s*категория/i },
      { variantKey: '2кат с кромкой', label: '2 категория с кромкой', pattern: /2\s*категория/i },
    ],
  },
  {
    sheetName: 'Акрил', label: 'Акрил',
    priceRows: [
      { variantKey: '1кат одн с кромкой', label: '1 кат. одностороннее с кромкой', pattern: /1\s*категория.*одностор/i },
      { variantKey: '2кат одн с кромкой', label: '2 кат. одностороннее с кромкой', pattern: /2\s*категория.*одностор/i },
      { variantKey: '3кат с кромкой',     label: '3 категория с кромкой',           pattern: /3\s*категория/i },
    ],
  },
];

function tmfMaterialId(label: string): string {
  return `tmf__${label.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_')}`;
}

function tmfVariantId(label: string, variantKey: string): string {
  const col = label.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_');
  const vk = variantKey.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_');
  return `tmf__${col}__${vk}`;
}

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function extractPrices(rows: unknown[][], priceRows: PriceRowConfig[]): Record<string, number> {
  const prices: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineText = row.map(c => String(c ?? '')).join(' ').replace(/\s+/g, ' ').trim();
    for (const pr of priceRows) {
      if (prices[pr.variantKey] !== undefined) continue;
      if (!pr.pattern.test(lineText)) continue;
      for (const cell of row) {
        const p = parsePrice(cell);
        if (p > 1000) { prices[pr.variantKey] = p; break; }
      }
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

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface PriceChange {
  materialId: string;
  materialName: string;
  variantId: string;
  variantLabel: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

interface Props { onClose: () => void }

export default function TmfPriceModal({ onClose }: Props) {
  const store = useStore();
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
          const matId = tmfMaterialId(cfg.label);
          const mat = store.materials.find(m => m.id === matId);
          if (!mat) continue; // материал ещё не импортирован — пропускаем

          const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
          const wsName = wb.SheetNames.find(n => norm(n) === norm(cfg.sheetName));
          if (!wsName) continue;

          const ws = wb.Sheets[wsName];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
          const newPrices = extractPrices(rows, cfg.priceRows);

          for (const pr of cfg.priceRows) {
            const newPrice = newPrices[pr.variantKey];
            if (newPrice === undefined) continue;

            const variantId = tmfVariantId(cfg.label, pr.variantKey);
            const variant = mat.variants?.find(v => v.id === variantId);
            if (!variant) continue;

            if (Math.round(variant.basePrice) !== Math.round(newPrice)) {
              allChanges.push({
                materialId: mat.id,
                materialName: mat.name,
                variantId,
                variantLabel: pr.label,
                oldPrice: variant.basePrice,
                newPrice,
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

  const handleSave = () => {
    if (!changes) return;
    const sel = changes.filter(c => c.selected);

    // Группируем по materialId
    const byMat = new Map<string, Map<string, number>>();
    for (const c of sel) {
      if (!byMat.has(c.materialId)) byMat.set(c.materialId, new Map());
      byMat.get(c.materialId)!.set(c.variantId, c.newPrice);
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const [matId, variantPrices] of byMat) {
      const mat = store.materials.find(m => m.id === matId);
      if (!mat?.variants) continue;
      store.updateMaterial(matId, {
        variants: mat.variants.map(v =>
          variantPrices.has(v.id) ? { ...v, basePrice: variantPrices.get(v.id)! } : v
        ),
        basePrice: variantPrices.get(mat.variants[0]?.id) ?? mat.basePrice,
        priceUpdatedAt: today,
      });
    }

    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = changes?.filter(c => c.selected).length ?? 0;

  return (
    <Modal title="Обновить цены ТМФ из Excel" onClose={onClose}>
      <div className="space-y-4">

        {/* Загрузка файла */}
        {!fileName && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Загрузи новый прайс ТМФ — система сравнит цены и предложит обновить изменившиеся.
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

        {/* Индикатор файла */}
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
          <div className="flex items-center justify-center gap-2 py-4 text-[hsl(var(--text-muted))] text-sm">
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

        {/* Список изменений */}
        {changes !== null && !saved && (
          <>
            {changes.length === 0 ? (
              <div className="text-center py-6 flex flex-col items-center gap-2 text-sm text-green-400">
                <Icon name="CheckCircle" size={24} />
                Все цены актуальны — изменений нет
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
                  <span>Найдено изменений: <span className="text-gold font-medium">{changes.length}</span></span>
                  <div className="flex gap-3">
                    <button onClick={() => setChanges(c => c?.map(x => ({ ...x, selected: true })) ?? null)} className="hover:text-gold">все</button>
                    <button onClick={() => setChanges(c => c?.map(x => ({ ...x, selected: false })) ?? null)} className="hover:text-gold">снять</button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 1fr 1fr 60px 60px' }}>
                    <span /><span>Коллекция</span><span>Вариант</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                  </div>
                  {changes.map((c, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 1fr 60px 60px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${c.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {c.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-xs truncate">{c.materialName.replace('Фасад ТМФ ', '')}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{c.variantLabel}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(c.oldPrice)}</span>
                      <span className={`text-xs font-mono text-right font-medium ${c.newPrice > c.oldPrice ? 'text-red-400' : 'text-green-400'}`}>{fmt(c.newPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Выбрано: {selectedCount} из {changes.length}</span>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                      Отмена
                    </button>
                    <button onClick={handleSave} disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      <Icon name="Check" size={14} /> Обновить {selectedCount}
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
