import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { CalcRow, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_WIDTHS, fmt } from './constants';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameFilter(row.name); }, [row.name]);

  const rowTotal = row.qty * row.price;

  const filteredMaterials = store.materials.filter(m => {
    const typeOk = allowedTypeIds.length === 0 || allowedTypeIds.includes(m.typeId);
    const textOk = nameFilter === '' ||
      m.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      (m.color || '').toLowerCase().includes(nameFilter.toLowerCase()) ||
      (m.article || '').toLowerCase().includes(nameFilter.toLowerCase());
    return typeOk && textOk;
  });

  const applyMaterial = (matId: string) => {
    const mat = store.materials.find(m => m.id === matId);
    if (!mat) return;
    const price = store.calcPriceWithMarkup(mat.basePrice, 'materials');
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
      price,
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
              <div key={col} className="relative pr-2">
                <input
                  ref={inputRef}
                  value={nameFilter}
                  onChange={e => { setNameFilter(e.target.value); store.updateRow(projectId, blockId, row.id, { name: e.target.value, materialId: undefined }); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 160)}
                  placeholder="Выбрать материал..."
                  className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
                />
                {showSuggest && filteredMaterials.length > 0 && (
                  <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-96 max-h-52 overflow-auto scrollbar-thin">
                    {filteredMaterials.slice(0, 10).map(m => {
                      const t = store.getTypeById(m.typeId);
                      const mfr = store.getManufacturerById(m.manufacturerId);
                      const vendor = store.getVendorById(m.vendorId);
                      return (
                        <button
                          key={m.id}
                          onMouseDown={() => applyMaterial(m.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#888' }} />
                          <span className="flex-1 text-foreground truncate">{m.name}</span>
                          {mfr && <span className="text-[hsl(var(--text-dim))] text-xs shrink-0">{mfr.name}</span>}
                          {vendor && <span className="text-[hsl(var(--text-muted))] text-xs shrink-0">/ {vendor.name}</span>}
                          <span className="text-gold text-xs font-mono shrink-0">{store.calcPriceWithMarkup(m.basePrice, 'materials').toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
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
              <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.article || '—'}</div>
            );
          case 'color':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.color || '—'}</div>;
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return (
              <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.unit || '—'}</div>
            );
          case 'qty':
            return (
              <div key={col} className="flex items-center justify-end gap-1">
                <button
                  tabIndex={-1}
                  onClick={() => store.updateRow(projectId, blockId, row.id, { qty: Math.max(0, (row.qty || 0) - 1) })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >−</button>
                <input
                  type="number"
                  value={row.qty || ''}
                  onChange={e => store.updateRow(projectId, blockId, row.id, { qty: parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-mono text-center outline-none border-b border-transparent focus:border-[hsl(var(--gold))] w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  tabIndex={-1}
                  onClick={() => store.updateRow(projectId, blockId, row.id, { qty: (row.qty || 0) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >+</button>
              </div>
            );
          case 'price':
            return (
              <div key={col} className="text-right pr-1">
                <div className="text-sm font-mono text-foreground">{row.price > 0 ? row.price.toLocaleString() : '—'}</div>
                <div className="text-xs text-gold font-mono mt-0.5">{row.price > 0 && row.qty > 0 ? fmt(rowTotal) + ' ' + currency : ''}</div>
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
    </div>
  );
}