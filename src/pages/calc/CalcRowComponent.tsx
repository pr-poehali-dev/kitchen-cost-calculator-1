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
      supplierId: mat.supplierId,
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
                  <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-80 max-h-52 overflow-auto scrollbar-thin">
                    {filteredMaterials.slice(0, 10).map(m => {
                      const t = store.getTypeById(m.typeId);
                      const sup = store.suppliers.find(s => s.id === m.supplierId);
                      return (
                        <button
                          key={m.id}
                          onMouseDown={() => applyMaterial(m.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex items-center gap-3"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#888' }} />
                          <span className="flex-1 text-foreground truncate">{m.name}</span>
                          <span className="text-[hsl(var(--text-muted))] text-xs shrink-0">{sup?.name}</span>
                          <span className="text-gold text-xs font-mono shrink-0">{store.calcPriceWithMarkup(m.basePrice).toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          case 'supplier': {
            const sup = store.suppliers.find(s => s.id === row.supplierId);
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{sup?.name || '—'}</div>;
          }
          case 'article':
            return (
              <div key={col} className="pr-1">
                <input
                  value={row.article || ''}
                  onChange={e => store.updateRow(projectId, blockId, row.id, { article: e.target.value })}
                  placeholder="—"
                  className="bg-transparent text-xs text-[hsl(var(--text-dim))] w-full outline-none border-b border-transparent focus:border-[hsl(var(--gold))] placeholder:text-[hsl(var(--text-muted))]"
                />
              </div>
            );
          case 'color':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.color || '—'}</div>;
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return (
              <select
                key={col}
                value={row.unit}
                onChange={e => store.updateRow(projectId, blockId, row.id, { unit: e.target.value })}
                className="bg-transparent text-xs text-[hsl(var(--text-dim))] border-0 outline-none w-full"
              >
                {store.settings.units.map(u => (
                  <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
                ))}
              </select>
            );
          case 'qty':
            return (
              <input
                key={col}
                type="number"
                value={row.qty || ''}
                onChange={e => store.updateRow(projectId, blockId, row.id, { qty: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right outline-none w-full border-b border-transparent focus:border-[hsl(var(--gold))] pr-1"
              />
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
