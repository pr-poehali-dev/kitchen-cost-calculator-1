import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';

// ─── Парсер (переиспользуем логику из TmfImportModal) ────────────────────────

const TMF_VARIANT_SEARCHES: { label: string; searchLabel: string }[] = [
  { label: 'Одностороннее с кромкой',  searchLabel: 'одностороннее.*с кромкой' },
  { label: 'Одностороннее без кромки', searchLabel: 'одностороннее.*без кромки' },
  { label: 'Двухстороннее с кромкой',  searchLabel: 'двухстороннее.*с кромкой' },
  { label: 'Двухстороннее без кромки', searchLabel: 'двухстороннее.*без кромки' },
  { label: 'С кромкой [18мм]',         searchLabel: '^прямые фасады с кромкой' },
  { label: 'Без кромки [18мм]',        searchLabel: '^прямые фасады без кромки' },
  { label: '1 кат. с кромкой',         searchLabel: '1 категория.*с кромкой' },
  { label: '1 кат. без кромки',        searchLabel: '1 категория.*без кромки' },
  { label: '2 кат. с кромкой',         searchLabel: '2 категория.*с кромкой' },
  { label: '2 кат. без кромки',        searchLabel: '2 категория.*без кромки' },
  { label: '3 кат. с кромкой',         searchLabel: '3 категория.*с кромкой' },
  { label: '3 кат. без кромки',        searchLabel: '3 категория.*без кромки' },
  { label: '1 кат. одностор. с кромкой',  searchLabel: '1 категория.*односторонн.*с кромкой' },
  { label: '1 кат. одностор. без кромки', searchLabel: '1 категория.*односторонн.*без кромки' },
  { label: '2 кат. одностор. с кромкой',  searchLabel: '2 категория.*односторонн.*с кромкой' },
  { label: '2 кат. одностор. без кромки', searchLabel: '2 категория.*односторонн.*без кромки' },
];

function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normStr(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Парсим один лист и возвращаем map: label варианта → новая цена
function parseSheetPrices(ws: XLSX.WorkSheet): Map<string, number> {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const result = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    for (let j = 0; j < row.length; j++) {
      const cellStr = normStr(String(row[j] || ''));
      if (!cellStr) continue;

      for (const variant of TMF_VARIANT_SEARCHES) {
        if (result.has(variant.label)) continue;
        const pattern = new RegExp(variant.searchLabel, 'i');
        if (!pattern.test(cellStr)) continue;

        // Ищем цену в этой строке
        for (let k = j + 1; k < Math.min(j + 6, row.length); k++) {
          const price = parsePrice(row[k]);
          if (price > 1000) { result.set(variant.label, price); break; }
        }
        // Или в следующих строках
        if (!result.has(variant.label)) {
          for (let di = 1; di <= 3; di++) {
            if (i + di >= rows.length) break;
            const nextRow = rows[i + di] as unknown[];
            for (let k = j; k < Math.min(j + 4, nextRow.length); k++) {
              const price = parsePrice(nextRow[k]);
              if (price > 1000) { result.set(variant.label, price); break; }
            }
            if (result.has(variant.label)) break;
          }
        }
      }
    }
  }

  return result;
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface PriceMatch {
  materialId: string;
  materialName: string;
  variantId: string;
  variantLabel: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function TmfPriceModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<PriceMatch[] | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setError('');
    setMatches(null);
    setSaved(false);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const found: PriceMatch[] = [];

        // Ищем материалы ТМФ (по имени начинающемуся с "Фасад ТМФ")
        const tmfMaterials = store.materials.filter(m =>
          m.name.toLowerCase().startsWith('фасад тмф') && m.variants?.length
        );

        for (const mat of tmfMaterials) {
          if (!mat.variants?.length) continue;

          // Определяем к какому листу относится этот материал
          // Имя формата: "Фасад ТМФ NanoШпон", "Фасад ТМФ SuperMat" и т.д.
          const sheetKeyMatch = mat.name.match(/фасад тмф\s+(.+)/i);
          if (!sheetKeyMatch) continue;
          const sheetKey = sheetKeyMatch[1].trim();

          // Ищем лист в файле
          const wsName = wb.SheetNames.find(n =>
            n.toLowerCase().replace(/\s/g, '') === sheetKey.toLowerCase().replace(/\s/g, '')
          );
          if (!wsName) continue;

          const priceMap = parseSheetPrices(wb.Sheets[wsName]);

          for (const variant of mat.variants) {
            const newPrice = priceMap.get(variant.params || '');
            if (newPrice === undefined) continue;
            if (Math.round(newPrice) === Math.round(variant.basePrice)) continue;

            found.push({
              materialId: mat.id,
              materialName: mat.name,
              variantId: variant.id,
              variantLabel: variant.params || variant.id,
              oldPrice: variant.basePrice,
              newPrice,
              selected: true,
            });
          }
        }

        setMatches(found);
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
    setMatches(prev => prev?.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m) ?? null);

  const handleSave = () => {
    if (!matches) return;
    const selected = matches.filter(m => m.selected);

    const byMaterial = new Map<string, Map<string, number>>();
    for (const m of selected) {
      if (!byMaterial.has(m.materialId)) byMaterial.set(m.materialId, new Map());
      byMaterial.get(m.materialId)!.set(m.variantId, m.newPrice);
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const [materialId, variantPrices] of byMaterial) {
      const mat = store.materials.find(x => x.id === materialId);
      if (!mat?.variants) continue;
      store.updateMaterial(materialId, {
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

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  return (
    <Modal title="Обновить цены ТМФ из Excel" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-[hsl(var(--text-muted))]">
          Загрузи новый прайс ТМФ — система найдёт изменения по коллекциям и обновит цены.
        </p>

        {/* Зона загрузки */}
        {!fileName && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-border hover:border-gold rounded-xl px-6 py-8 text-center cursor-pointer transition-colors group"
          >
            <Icon name="FileSpreadsheet" size={32} className="text-[hsl(var(--text-muted))] group-hover:text-gold mx-auto mb-3 transition-colors" />
            <p className="text-sm text-foreground font-medium">Перетащи файл или нажми для выбора</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">.xlsx — прайс-лист ТМФ</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {fileName && !loading && (
          <div className="flex items-center gap-3 bg-[hsl(220,12%,14%)] rounded-lg px-4 py-3 border border-border">
            <Icon name="FileSpreadsheet" size={16} className="text-gold shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
            <button onClick={() => { setFileName(''); setMatches(null); setError(''); }}
              className="text-[hsl(var(--text-muted))] hover:text-foreground shrink-0">
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Icon name="Loader2" size={16} className="animate-spin text-gold" />
            <span className="text-sm text-[hsl(var(--text-muted))]">Сравниваю цены...</span>
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

        {matches !== null && !saved && (
          <>
            {matches.length === 0 ? (
              <div className="text-center py-6 flex flex-col items-center gap-2 text-sm text-green-400">
                <Icon name="CheckCircle" size={22} />
                Все цены актуальны — изменений нет
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--text-muted))]">
                    Изменений: <span className="text-gold font-medium">{matches.length}</span>
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: true })) ?? null)}
                      className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">все</button>
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: false })) ?? null)}
                      className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">снять</button>
                  </div>
                </div>

                <div className="max-h-64 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}>
                    <span /><span>Материал</span><span>Вариант</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                  </div>
                  {matches.map((m, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-xs truncate">{m.materialName.replace('Фасад ТМФ ', '')}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.variantLabel}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(m.oldPrice)}</span>
                      <span className={`text-xs font-mono text-right font-medium ${m.newPrice > m.oldPrice ? 'text-red-400' : 'text-green-400'}`}>
                        {fmt(m.newPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Выбрано: {selectedCount}</span>
                  <div className="flex gap-2">
                    <button onClick={onClose}
                      className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                      Отмена
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <Icon name="Check" size={14} /> Обновить {selectedCount} цен
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