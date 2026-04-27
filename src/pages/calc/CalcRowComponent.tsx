import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/useStore';
import type { CalcRow, CalcColumnKey, Material, MaterialVariant } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_WIDTHS, fmt } from './constants';
import MaterialDropdown from './MaterialDropdown';
import VariantPicker from './VariantPicker';

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
                  <MaterialDropdown
                    materials={filteredMaterials}
                    pos={dropdownPos}
                    store={store}
                    onPick={applyMaterial}
                  />,
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