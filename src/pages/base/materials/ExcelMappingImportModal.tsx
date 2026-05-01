import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useCatalog, bulkUpsertMaterials } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';
import * as XLSX from 'xlsx';

interface Props {
  onClose: () => void;
}

type ColKey = 'name' | 'article' | 'color' | 'thickness' | 'unit' | 'basePrice' | 'manufacturer' | 'vendor' | 'type' | 'category' | 'skip';

const COL_OPTIONS: { value: ColKey; label: string }[] = [
  { value: 'skip',         label: '— пропустить —' },
  { value: 'name',         label: 'Наименование *' },
  { value: 'article',      label: 'Артикул' },
  { value: 'color',        label: 'Цвет' },
  { value: 'thickness',    label: 'Толщина (мм)' },
  { value: 'unit',         label: 'Единица измерения' },
  { value: 'basePrice',    label: 'Цена закупочная *' },
  { value: 'manufacturer', label: 'Производитель' },
  { value: 'vendor',       label: 'Поставщик' },
  { value: 'type',         label: 'Тип материала' },
  { value: 'category',     label: 'Категория' },
];

export default function ExcelMappingImportModal({ onClose }: Props) {
  const store = useStore();
  const catalog = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColKey[]>([]);
  const [typeId, setTypeId] = useState(store.settings.materialTypes[0]?.id || '');
  const [manufacturerId, setManufacturerId] = useState(catalog.manufacturers[0]?.id || '');
  const [headerRow, setHeaderRow] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
      if (!data.length) return;
      const hdrs = data[0].map(String);
      setHeaders(hdrs);
      setRows(data);
      // Автоматическое угадывание маппинга по имени колонки
      const auto: ColKey[] = hdrs.map(h => {
        const l = h.toLowerCase();
        if (l.includes('наим') || l.includes('назв') || l === 'name') return 'name';
        if (l.includes('артик') || l === 'article') return 'article';
        if (l.includes('цвет') || l === 'color') return 'color';
        if (l.includes('толщ') || l.includes('thickness')) return 'thickness';
        if (l.includes('ед') || l.includes('unit') || l.includes('изм')) return 'unit';
        if (l.includes('цен') || l.includes('price') || l.includes('стоим')) return 'basePrice';
        if (l.includes('произв') || l.includes('бренд') || l.includes('manufacturer')) return 'manufacturer';
        if (l.includes('поставщ') || l.includes('вендор') || l.includes('vendor') || l.includes('supplier')) return 'vendor';
        if (l.includes('тип') || l.includes('type') || l.includes('вид')) return 'type';
        if (l.includes('катег') || l.includes('category')) return 'category';
        return 'skip';
      });
      setMapping(auto);
    };
    reader.readAsArrayBuffer(file);
  };

  const dataRows = headerRow ? rows.slice(1) : rows;

  const handleImport = async () => {
    if (!mapping.includes('name') || !mapping.includes('basePrice')) return;
    setImporting(true);

    let created = 0; let skipped = 0;
    const today = new Date().toISOString().slice(0, 10);

    const findManufacturer = (val: string) => {
      const v = val.toLowerCase();
      return catalog.manufacturers.find(m => m.name.toLowerCase().includes(v) || v.includes(m.name.toLowerCase()));
    };
    const findVendor = (val: string) => {
      const v = val.toLowerCase();
      return catalog.vendors.find(m => m.name.toLowerCase().includes(v) || v.includes(m.name.toLowerCase()));
    };
    const findType = (val: string) => {
      const v = val.toLowerCase();
      return store.settings.materialTypes.find(t => t.name.toLowerCase().includes(v) || v.includes(t.name.toLowerCase()));
    };
    const findCategory = (val: string, resolvedTypeId?: string) => {
      const v = val.toLowerCase();
      const cats = store.getCategoriesForType(resolvedTypeId);
      return cats.find(c => c.name.toLowerCase().includes(v) || v.includes(c.name.toLowerCase()));
    };

    const newMaterials: Parameters<typeof bulkUpsertMaterials>[0] = [];

    dataRows.forEach(row => {
      const get = (key: ColKey) => {
        const idx = mapping.indexOf(key);
        return idx >= 0 ? String(row[idx] ?? '').trim() : '';
      };
      const name = get('name');
      const price = parseFloat(get('basePrice').replace(',', '.'));
      if (!name || isNaN(price)) { skipped++; return; }

      const mfrRaw = get('manufacturer');
      const resolvedMfr = mfrRaw ? findManufacturer(mfrRaw) : null;
      const resolvedMfrId = resolvedMfr?.id ?? manufacturerId;

      const vendorRaw = get('vendor');
      const resolvedVendor = vendorRaw ? findVendor(vendorRaw) : null;
      const resolvedVendorId = resolvedVendor?.id;

      const typeRaw = get('type');
      const resolvedType = typeRaw ? findType(typeRaw) : null;
      const resolvedTypeId = resolvedType?.id ?? typeId;

      const catRaw = get('category');
      const resolvedCategory = catRaw ? findCategory(catRaw, resolvedTypeId) : null;

      const article = get('article');
      const exists = article
        ? catalog.materials.some(m => m.article === article)
        : catalog.materials.some(m => m.name === name && m.typeId === resolvedTypeId);

      if (exists) { skipped++; return; }

      const thickness = parseFloat(get('thickness'));
      newMaterials.push({
        id: `excel_import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        manufacturerId: resolvedMfrId,
        vendorId: resolvedVendorId,
        typeId: resolvedTypeId,
        categoryId: resolvedCategory?.id,
        article: article || undefined,
        color: get('color') || undefined,
        thickness: isNaN(thickness) ? undefined : thickness,
        unit: get('unit') || store.settings.units[0] || 'м²',
        basePrice: price,
        priceUpdatedAt: today,
      });
      created++;
    });

    if (newMaterials.length > 0) {
      await bulkUpsertMaterials(newMaterials);
    }

    setResult({ created, skipped });
    setImporting(false);
  };

  const INP = 'bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="font-semibold text-sm">Импорт из Excel / CSV с маппингом колонок</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>

        <div className="overflow-auto scrollbar-thin flex-1 px-5 py-4 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${result.created > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-400/10 border border-amber-400/30'}`}>
                <Icon name={result.created > 0 ? 'CheckCircle' : 'AlertCircle'} size={18} className={result.created > 0 ? 'text-emerald-400' : 'text-amber-400'} />
                <div className="text-sm">
                  <div className={result.created > 0 ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                    {result.created > 0 ? `Импортировано ${result.created} материалов` : 'Ничего не импортировано'}
                  </div>
                  {result.skipped > 0 && <div className="text-[hsl(var(--text-muted))]">Пропущено (дубликаты / ошибки): {result.skipped}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                  Готово
                </button>
                <button onClick={() => { setResult(null); setRows([]); setHeaders([]); }} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                  Ещё раз
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Шаг 1: загрузка файла */}
              <div>
                <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">1. Выберите файл</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded text-sm text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-all w-full justify-center"
                >
                  <Icon name="Upload" size={14} />
                  {rows.length ? `${rows.length} строк загружено · нажмите для замены` : 'Нажмите для выбора .xlsx / .xls / .csv'}
                </button>
              </div>

              {rows.length > 0 && (
                <>
                  {/* Настройки */}
                  <div>
                    <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">2. Параметры по умолчанию</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mb-2 opacity-70">Применяются для строк, где соответствующая колонка не задана или не распознана</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Тип материала (по умолчанию)</label>
                        <select value={typeId} onChange={e => setTypeId(e.target.value)} className={INP + ' w-full'}>
                          {store.settings.materialTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Производитель (по умолчанию)</label>
                        <select value={manufacturerId} onChange={e => setManufacturerId(e.target.value)} className={INP + ' w-full'}>
                          <option value="">— не задан —</option>
                          {catalog.manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--text-dim))] cursor-pointer">
                      <input type="checkbox" checked={headerRow} onChange={e => setHeaderRow(e.target.checked)} className="accent-gold" />
                      Первая строка — заголовки (не импортировать)
                    </label>
                  </div>

                  {/* Маппинг колонок */}
                  <div>
                    <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">3. Сопоставьте колонки</div>
                    <div className="space-y-1.5">
                      {headers.map((h, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-32 shrink-0 text-xs text-foreground truncate" title={h}>{h || `Колонка ${i + 1}`}</div>
                          <Icon name="ArrowRight" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                          <select
                            value={mapping[i] || 'skip'}
                            onChange={e => {
                              const next = [...mapping];
                              next[i] = e.target.value as ColKey;
                              setMapping(next);
                            }}
                            className={INP + ' flex-1 text-xs py-1.5'}
                          >
                            {COL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {/* Превью первого значения */}
                          {dataRows[0]?.[i] && (
                            <span className="text-xs text-[hsl(var(--text-muted))] truncate max-w-[80px]" title={String(dataRows[0][i])}>
                              {String(dataRows[0][i]).slice(0, 15)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Превью */}
                  <div>
                    <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">
                      Превью ({Math.min(3, dataRows.length)} из {dataRows.length} строк)
                    </div>
                    <div className="border border-border rounded overflow-hidden text-xs">
                      <div className="grid bg-[hsl(220,12%,14%)] border-b border-border" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 6)}, 1fr)` }}>
                        {headers.slice(0, 6).map((h, i) => (
                          <div key={i} className="px-2 py-1.5 text-[hsl(var(--text-muted))] uppercase tracking-wider truncate">{h || `Кол. ${i+1}`}</div>
                        ))}
                      </div>
                      {dataRows.slice(0, 3).map((row, ri) => (
                        <div key={ri} className="grid border-b border-[hsl(220,12%,14%)] last:border-0" style={{ gridTemplateColumns: `repeat(${Math.min(headers.length, 6)}, 1fr)` }}>
                          {row.slice(0, 6).map((cell, ci) => (
                            <div key={ci} className="px-2 py-1.5 text-[hsl(var(--text-dim))] truncate">{String(cell)}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {(!mapping.includes('name') || !mapping.includes('basePrice')) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded text-xs text-amber-400">
                      <Icon name="AlertTriangle" size={13} />
                      Назначьте колонки «Наименование» и «Цена закупочная» для импорта
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleImport}
                      disabled={importing || !mapping.includes('name') || !mapping.includes('basePrice')}
                      className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {importing ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Download" size={14} />}
                      Импортировать {dataRows.length} строк
                    </button>
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                      Отмена
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}