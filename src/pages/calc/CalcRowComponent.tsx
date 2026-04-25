import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/useStore';
import type { CalcRow, CalcColumnKey, Material, MaterialVariant } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_WIDTHS, fmt } from './constants';

// Модалка выбора варианта (размера/толщины) для материалов с variants
function VariantPicker({ material, onPick, onCancel }: {
  material: Material;
  onPick: (variant: MaterialVariant) => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const variants = material.variants || [];

  // Определяем режим СКАТ: все варианты имеют params = "X кат"
  const isSkat = variants.length > 0 && /^\d\s*кат$/.test((variants[0].params || '').trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-semibold text-sm">{material.name}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              {isSkat ? 'Выберите категорию цены' : 'Выберите размер'}
            </div>
          </div>
          <button onClick={onCancel} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-auto scrollbar-thin">
          {isSkat ? (
            // Режим СКАТ: Описание | МДФ | Категория | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 55px 70px 90px' }}>
                <span>Фасад · Серия</span>
                <span className="text-center">МДФ</span>
                <span className="text-center">Кат.</span>
                <span className="text-right">Закуп. / Розн.</span>
              </div>
              {variants.map(v => {
                const retail = store.calcPriceWithMarkup(v.basePrice, 'materials');
                return (
                  <button
                    key={v.id}
                    onClick={() => onPick(v)}
                    className="w-full grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,16%)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 55px 70px 90px' }}
                  >
                    <span className="text-xs font-medium group-hover:text-gold transition-colors truncate">{v.size || material.name}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] text-center">{v.thickness ? `${v.thickness}мм` : '—'}</span>
                    <span className="text-xs text-gold font-semibold text-center">{v.params}</span>
                    <div className="text-right">
                      <div className="text-xs text-[hsl(var(--text-dim))] font-mono">{fmt(v.basePrice)}</div>
                      <div className="text-xs text-gold font-mono font-semibold">→ {fmt(retail)}</div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            // Стандартный режим: Размер | Толщ. | Параметры | Артикул | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 50px 0.8fr 0.7fr 90px' }}>
                <span>Размер</span><span className="text-center">Толщ.</span><span>Параметры</span><span>Артикул</span><span className="text-right">Закуп. / Розн.</span>
              </div>
              {variants.map(v => {
                const retail = store.calcPriceWithMarkup(v.basePrice, 'materials');
                return (
                  <button
                    key={v.id}
                    onClick={() => onPick(v)}
                    className="w-full grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,16%)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 50px 0.8fr 0.7fr 90px' }}
                  >
                    <span className="text-sm font-medium group-hover:text-gold transition-colors">{v.size || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] text-center">{v.thickness ? `${v.thickness}мм` : '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-muted))] truncate">{v.params || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] truncate">{v.article || '—'}</span>
                    <div className="text-right">
                      <div className="text-xs text-[hsl(var(--text-dim))] font-mono">{fmt(v.basePrice)}</div>
                      <div className="text-xs text-gold font-mono font-semibold">→ {fmt(retail)}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  row: CalcRow;
  projectId: string;
  blockId: string;
  visibleColumns: CalcColumnKey[];
  currency: string;
  allowedTypeIds: string[];
  onDelete: () => void;
}

export default function CalcRowComponent({ row, projectId, blockId, visibleColumns, currency, allowedTypeIds, onDelete }: Props) {
  const store = useStore();
  const [showSuggest, setShowSuggest] = useState(false);
  const [nameFilter, setNameFilter] = useState(row.name);
  const [variantPickerMat, setVariantPickerMat] = useState<Material | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameFilter(row.name); }, [row.name]);

  const updatePos = useCallback(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
  }, []);

  const rowTotal = row.qty * row.price;

  const filteredMaterials = store.materials.filter(m => {
    const typeOk = allowedTypeIds.length === 0 || allowedTypeIds.includes(m.typeId);
    const q = nameFilter.toLowerCase();
    const variantSizeMatch = q !== '' && m.variants?.some(v => (v.size || '').toLowerCase().includes(q));
    const textOk = q === '' ||
      m.name.toLowerCase().includes(q) ||
      (m.color || '').toLowerCase().includes(q) ||
      (m.article || '').toLowerCase().includes(q) ||
      !!variantSizeMatch;
    return typeOk && textOk;
  });

  const applyMaterialWithVariant = (mat: Material, variant: MaterialVariant) => {
    const retailPrice = store.calcPriceWithMarkup(variant.basePrice, 'materials');
    // Для СКАТ: "глухой 16мм · Classic/Optima (2 кат)"
    const isSkat = /^\d\s*кат$/.test((variant.params || '').trim());
    const label = isSkat
      ? [variant.size, variant.params ? `(${variant.params})` : ''].filter(Boolean).join(' ')
      : [mat.name, variant.size, variant.thickness ? `${variant.thickness}мм` : ''].filter(Boolean).join(' ');
    store.updateRow(projectId, blockId, row.id, {
      materialId: mat.id,
      variantId: variant.id,
      name: label,
      manufacturerId: mat.manufacturerId,
      vendorId: mat.vendorId,
      typeId: mat.typeId,
      color: mat.color,
      article: variant.article || mat.article,
      thickness: variant.thickness ?? mat.thickness,
      unit: mat.unit,
      basePrice: variant.basePrice,
      price: retailPrice,
    });
    setNameFilter(label);
    setVariantPickerMat(null);
    setShowSuggest(false);
  };

  const applyMaterial = (matId: string) => {
    const mat = store.materials.find(m => m.id === matId);
    if (!mat) return;
    // Если у материала есть варианты — показываем выбор размера
    if (mat.variants && mat.variants.length > 0) {
      setShowSuggest(false);
      setVariantPickerMat(mat);
      return;
    }
    const retailPrice = store.calcPriceWithMarkup(mat.basePrice, 'materials');
    store.updateRow(projectId, blockId, row.id, {
      materialId: mat.id,
      name: mat.name,
      manufacturerId: mat.manufacturerId,
      vendorId: mat.vendorId,
      typeId: mat.typeId,
      color: mat.color,
      article: mat.article,
      thickness: mat.thickness,
      unit: mat.unit,
      basePrice: mat.basePrice,
      price: retailPrice,
    });
    setNameFilter(mat.name);
    setShowSuggest(false);
  };

  const gridCols = [...visibleColumns.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');

  return (
    <div
      className="relative group border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] transition-colors"
      style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', padding: '6px 16px' }}
    >
      {visibleColumns.map(col => {
        switch (col) {
          case 'material':
            return (
              <div key={col} className="relative pr-2 flex items-center gap-1">
                <input
                  ref={inputRef}
                  value={nameFilter}
                  onChange={e => { setNameFilter(e.target.value); store.updateRow(projectId, blockId, row.id, { name: e.target.value, materialId: undefined, variantId: undefined }); setShowSuggest(true); }}
                  onFocus={() => { updatePos(); setShowSuggest(true); }}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 160)}
                  placeholder="Выбрать материал..."
                  className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
                />
                {row.materialId && row.variantId && (() => {
                  const mat = store.materials.find(m => m.id === row.materialId);
                  return mat ? (
                    <button
                      onMouseDown={e => { e.preventDefault(); setVariantPickerMat(mat); }}
                      className="shrink-0 text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
                      title="Сменить размер"
                    >
                      <Icon name="ChevronDown" size={11} />
                    </button>
                  ) : null;
                })()}
                {showSuggest && filteredMaterials.length > 0 && createPortal(
                  <div
                    className="fixed z-[9999] bg-[hsl(220,16%,10%)] border border-border rounded shadow-2xl w-[480px] max-h-80 overflow-auto scrollbar-thin"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  >
                    {filteredMaterials.slice(0, 20).map(m => {
                      const t = store.getTypeById(m.typeId);
                      const mfr = store.getManufacturerById(m.manufacturerId);
                      const isSkat = m.article?.startsWith('skat__');
                      const firstVariant = m.variants?.[0];
                      // Для СКАТ берём полное описание из size первого варианта
                      const skatSize = isSkat && firstVariant?.size ? firstVariant.size : null;
                      const skatThickness = isSkat && firstVariant?.thickness ? `${firstVariant.thickness}мм` : null;
                      return (
                        <button
                          key={m.id}
                          onMouseDown={() => applyMaterial(m.id)}
                          className="w-full text-left px-3 py-2 hover:bg-[hsl(220,12%,16%)] flex items-center gap-2 border-b border-[hsl(220,12%,14%)] last:border-0"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#888' }} />
                          <div className="flex-1 min-w-0">
                            {isSkat ? (
                              // СКАТ: показываем тип · серия + толщина
                              <>
                                <div className="text-sm text-foreground truncate">{skatSize || m.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {skatThickness && (
                                    <span className="text-[10px] bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))] px-1.5 py-0.5 rounded font-medium">{skatThickness}</span>
                                  )}
                                  {mfr && <span className="text-[10px] text-[hsl(var(--text-muted))]">{mfr.name}</span>}
                                  <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded">{m.variants!.length} кат.</span>
                                </div>
                              </>
                            ) : (
                              // Обычный материал
                              <span className="text-sm text-foreground truncate block">{m.name}</span>
                            )}
                          </div>
                          {!isSkat && m.variants && m.variants.length > 0 && (
                            <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded shrink-0">
                              {m.variants.length} разм.
                            </span>
                          )}
                          {!isSkat && mfr && <span className="text-[hsl(var(--text-dim))] text-xs shrink-0">{mfr.name}</span>}
                          {!isSkat && (!m.variants || m.variants.length === 0) && <>
                            <span className="text-[hsl(var(--text-dim))] text-xs font-mono shrink-0">{fmt(m.basePrice)}</span>
                            <span className="text-gold text-xs font-mono shrink-0">→ {fmt(store.calcPriceWithMarkup(m.basePrice, 'materials'))}</span>
                          </>}
                        </button>
                      );
                    })}
                  </div>,
                  document.body
                )}
              </div>
            );
          case 'manufacturer': {
            const mfr = store.getManufacturerById(row.manufacturerId);
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{mfr?.name || '—'}</div>;
          }
          case 'vendor': {
            const vendor = store.getVendorById(row.vendorId);
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{vendor?.name || '—'}</div>;
          }
          case 'article':
            return (
              <input
                key={col}
                value={row.article || ''}
                onChange={e => store.updateRow(projectId, blockId, row.id, { article: e.target.value || undefined })}
                placeholder="—"
                className="bg-transparent text-xs text-[hsl(var(--text-dim))] w-full outline-none border-b border-transparent focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))] pr-2"
              />
            );
          case 'color':
            return (
              <input
                key={col}
                value={row.color || ''}
                onChange={e => store.updateRow(projectId, blockId, row.id, { color: e.target.value || undefined })}
                placeholder="—"
                className="bg-transparent text-xs text-[hsl(var(--text-dim))] w-full outline-none border-b border-transparent focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))] pr-2"
              />
            );
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return (
              <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.unit || '—'}</div>
            );
          case 'qty':
            return (
              <div key={col} className="flex items-center justify-between gap-1">
                <button
                  tabIndex={-1}
                  onClick={() => store.updateRow(projectId, blockId, row.id, { qty: Math.max(0, parseFloat(((row.qty || 0) - 1).toFixed(4))) })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >−</button>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.qty === 0 ? '0' : (row.qty || '')}
                  onChange={e => store.updateRow(projectId, blockId, row.id, { qty: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-mono text-center outline-none border-b border-transparent focus:border-[hsl(var(--gold))] w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  tabIndex={-1}
                  onClick={() => store.updateRow(projectId, blockId, row.id, { qty: (row.qty || 0) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >+</button>
              </div>
            );
          case 'baseprice':
            return (
              <div key={col} className="text-right">
                <div className="text-sm font-mono text-[hsl(var(--text-dim))]">
                  {row.basePrice != null && row.basePrice > 0 ? fmt(row.basePrice) : '—'}
                </div>
              </div>
            );
          case 'price':
            return (
              <div key={col} className="text-right">
                <input
                  type="number"
                  value={row.price || ''}
                  onChange={e => store.updateRow(projectId, blockId, row.id, { price: parseFloat(e.target.value) || 0 })}
                  placeholder="—"
                  className="bg-transparent text-sm font-mono text-right text-foreground w-full outline-none border-b border-transparent focus:border-[hsl(var(--gold))] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-[hsl(var(--text-muted))]"
                />
              </div>
            );
          case 'total':
            return (
              <div key={col} className="text-right">
                <div className={`text-sm font-mono font-semibold ${row.price > 0 && row.qty > 0 ? 'text-gold' : 'text-[hsl(var(--text-muted))]'}`}>
                  {row.price > 0 && row.qty > 0 ? fmt(rowTotal) : '—'}
                </div>
              </div>
            );
          default:
            return null;
        }
      })}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive transition-all ml-1"
      >
        <Icon name="X" size={13} />
      </button>

      {variantPickerMat && createPortal(
        <VariantPicker
          material={variantPickerMat}
          onPick={v => applyMaterialWithVariant(variantPickerMat, v)}
          onCancel={() => setVariantPickerMat(null)}
        />,
        document.body
      )}
    </div>
  );
}