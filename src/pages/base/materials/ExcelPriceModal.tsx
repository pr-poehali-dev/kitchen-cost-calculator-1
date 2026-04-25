import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';

interface PriceRow {
  name: string;
  article: string;
  price: number;
  raw: Record<string, string>;
}

interface Match {
  materialId: string;
  materialName: string;
  article: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

// Нормализация строки для сравнения
function norm(s: string) {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

// Попытка найти числовую цену в строке
function parsePrice(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Автоматически определить колонки: наименование, артикул, цена
function detectColumns(headers: string[]): { nameCol: number; articleCol: number; priceCol: number } {
  const h = headers.map(x => norm(x));
  const nameCol = h.findIndex(x =>
    x.includes('наим') || x.includes('назв') || x.includes('товар') || x.includes('материал') || x.includes('name')
  );
  const articleCol = h.findIndex(x =>
    x.includes('артик') || x.includes('код') || x.includes('sku') || x.includes('арт') || x.includes('article')
  );
  const priceCol = h.findIndex(x =>
    x.includes('цена') || x.includes('price') || x.includes('стоим') || x.includes('руб')
  );
  return { nameCol, articleCol, priceCol };
}

function parseExcel(file: File): Promise<PriceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rows.length < 2) { resolve([]); return; }

        // Ищем строку-заголовок — первую, где есть хотя бы 3 непустых ячейки
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const nonEmpty = (rows[i] as string[]).filter(c => String(c).trim()).length;
          if (nonEmpty >= 3) { headerIdx = i; break; }
        }

        const headers = (rows[headerIdx] as string[]).map(x => String(x));
        const { nameCol, articleCol, priceCol } = detectColumns(headers);

        if (priceCol === -1) { reject(new Error('Не найдена колонка с ценой. Убедитесь что в заголовке есть слово «Цена» или «Price»')); return; }

        const result: PriceRow[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i] as string[];
          const price = parsePrice(row[priceCol]);
          if (price <= 0) continue;

          const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
          const article = articleCol >= 0 ? String(row[articleCol] || '').trim() : '';
          if (!name && !article) continue;

          const raw: Record<string, string> = {};
          headers.forEach((h, idx) => { raw[h] = String(row[idx] || ''); });

          result.push({ name, article, price, raw });
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
}

function findMatches(priceRows: PriceRow[], materials: ReturnType<typeof useStore>['materials']): Match[] {
  const matches: Match[] = [];

  for (const mat of materials) {
    // Сначала ищем по артикулу (точное совпадение)
    if (mat.article) {
      const byArticle = priceRows.find(r => r.article && norm(r.article) === norm(mat.article!));
      if (byArticle && byArticle.price !== mat.basePrice) {
        matches.push({
          materialId: mat.id,
          materialName: mat.name,
          article: mat.article,
          oldPrice: mat.basePrice,
          newPrice: byArticle.price,
          selected: true,
        });
        continue;
      }
    }

    // Затем по наименованию (нечёткое — содержит)
    const matNorm = norm(mat.name);
    const byName = priceRows.find(r => {
      const rNorm = norm(r.name);
      return rNorm && (rNorm === matNorm || rNorm.includes(matNorm) || matNorm.includes(rNorm));
    });
    if (byName && byName.price !== mat.basePrice) {
      matches.push({
        materialId: mat.id,
        materialName: mat.name,
        article: mat.article || '',
        oldPrice: mat.basePrice,
        newPrice: byName.price,
        selected: true,
      });
    }
  }

  return matches;
}

export default function ExcelPriceModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [saved, setSaved] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError('');
    setMatches(null);
    setSaved(false);
    try {
      const rows = await parseExcel(file);
      setTotalRows(rows.length);
      const found = findMatches(rows, store.materials);
      setMatches(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggle = (idx: number) =>
    setMatches(prev => prev?.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m) ?? null);

  const handleSave = () => {
    if (!matches) return;
    matches.filter(m => m.selected).forEach(m => {
      store.updateMaterial(m.materialId, { basePrice: m.newPrice });
    });
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  return (
    <Modal title="Обновить цены из Excel" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-[hsl(var(--text-muted))]">
          Загрузи прайс-лист ТМФ в формате .xlsx или .xls. Система найдёт совпадения по артикулу или названию и обновит закупочные цены.
        </p>

        {/* Зона загрузки */}
        {!fileName && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-gold rounded-xl px-6 py-8 text-center cursor-pointer transition-colors group"
          >
            <Icon name="FileSpreadsheet" size={32} className="text-[hsl(var(--text-muted))] group-hover:text-gold mx-auto mb-3 transition-colors" />
            <p className="text-sm text-foreground font-medium">Перетащи файл или нажми для выбора</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">.xlsx, .xls — прайс-лист поставщика</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Файл выбран */}
        {fileName && !loading && (
          <div className="flex items-center gap-3 bg-[hsl(220,12%,14%)] rounded-lg px-4 py-3 border border-border">
            <Icon name="FileSpreadsheet" size={16} className="text-gold shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
            <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">{totalRows} строк</span>
            <button
              onClick={() => { setFileName(''); setMatches(null); setError(''); }}
              className="text-[hsl(var(--text-muted))] hover:text-foreground shrink-0"
            >
              <Icon name="X" size={14} />
            </button>
          </div>
        )}

        {/* Загрузка */}
        {loading && (
          <div className="flex items-center gap-2 text-[hsl(var(--text-muted))] text-sm py-2">
            <Icon name="Loader2" size={14} className="animate-spin" />
            Обрабатываю файл...
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-start gap-2">
            <Icon name="AlertCircle" size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Успех */}
        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены обновлены!
          </div>
        )}

        {/* Результаты */}
        {matches !== null && !saved && (
          <>
            {matches.length === 0 ? (
              <div className="text-center py-6 text-[hsl(var(--text-muted))] text-sm space-y-1">
                <Icon name="SearchX" size={24} className="mx-auto opacity-40 mb-2" />
                <p>Совпадений не найдено</p>
                <p className="text-xs">Проверь что в базе есть материалы с такими же артикулами или названиями как в прайсе</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--text-muted))]">
                    Найдено совпадений: <span className="text-gold font-medium">{matches.length}</span>
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: true })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">все</button>
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: false })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">снять</button>
                  </div>
                </div>

                <div className="max-h-64 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 1fr 80px 65px 65px' }}>
                    <span /><span>Материал</span><span>Артикул</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                  </div>
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="grid items-center gap-2 px-3 py-2 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 80px 65px 65px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-xs truncate">{m.materialName}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate font-mono">{m.article || '—'}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(m.oldPrice)}</span>
                      <span className={`text-xs font-mono text-right font-semibold ${m.newPrice > m.oldPrice ? 'text-red-400' : 'text-green-400'}`}>
                        {fmt(m.newPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={selectedCount === 0}
                    className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                  >
                    Обновить {selectedCount > 0 ? `(${selectedCount})` : ''} позиций
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
