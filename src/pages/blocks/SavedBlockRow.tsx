import { useStore } from '@/store/useStore';
import type { SavedBlock, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from '../calc/constants';

interface Props {
  block: SavedBlock;
  rowId: string;
  visibleCols: CalcColumnKey[];
  gridCols: string;
  currency: string;
}

export default function SavedBlockRow({ block, rowId, visibleCols, gridCols, currency: _currency }: Props) {
  const store = useStore();
  const row = block.rows.find(r => r.id === rowId);
  if (!row) return null;

  const allMaterials = store.materials;
  const filtered = block.allowedTypeIds.length > 0
    ? allMaterials.filter(m => block.allowedTypeIds.includes(m.typeId))
    : allMaterials;

  const upd = (data: Parameters<typeof store.updateSavedBlockRow>[2]) =>
    store.updateSavedBlockRow(block.id, rowId, data);

  const selectMaterial = (matId: string) => {
    const mat = allMaterials.find(m => m.id === matId);
    if (!mat) return;
    upd({
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
      price: store.calcPriceWithMarkup(mat.basePrice, 'materials'),
    });
  };

  return (
    <div
      className="px-4 py-1.5 border-b border-[hsl(220,12%,14%)] last:border-0 hover:bg-[hsl(220,12%,14%)] transition-colors group"
      style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', gap: '4px' }}
    >
      {visibleCols.map(col => {
        switch (col) {
          case 'material':
            return (
              <div key={col} className="relative min-w-0">
                {row.materialId ? (
                  <div className="flex items-center gap-1 min-w-0">
                    {row.typeId && (() => { const t = store.getTypeById(row.typeId); return t ? <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} /> : null; })()}
                    <span className="text-sm truncate">{row.name || '—'}</span>
                    <button onClick={() => upd({ materialId: undefined, name: '' })} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive shrink-0">
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={e => selectMaterial(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-[hsl(var(--text-muted))] cursor-pointer"
                  >
                    <option value="">— выбрать —</option>
                    {filtered.map(m => (
                      <option key={m.id} value={m.id}>{m.name}{m.thickness ? ` ${m.thickness}мм` : ''}{m.color ? ` ${m.color}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          case 'manufacturer':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{store.getManufacturerById(row.manufacturerId)?.name || '—'}</div>;
          case 'vendor':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{store.getVendorById(row.vendorId)?.name || '—'}</div>;
          case 'article':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{row.article || '—'}</div>;
          case 'color':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{row.color || '—'}</div>;
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.unit || '—'}</div>;
          case 'qty':
            return (
              <div key={col} className="flex items-center justify-between gap-1">
                <button
                  tabIndex={-1}
                  onClick={() => upd({ qty: Math.max(0, (row.qty || 0) - 1) })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >−</button>
                <input
                  type="number"
                  value={row.qty || ''}
                  onChange={e => upd({ qty: parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-mono text-center outline-none border-b border-transparent focus:border-[hsl(var(--gold))] w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  tabIndex={-1}
                  onClick={() => upd({ qty: (row.qty || 0) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >+</button>
              </div>
            );
          case 'baseprice':
            return (
              <input
                key={col}
                type="number"
                value={row.basePrice ?? ''}
                onChange={e => upd({ basePrice: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right w-full outline-none border-b border-transparent focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            );
          case 'price':
            return (
              <input
                key={col}
                type="number"
                value={row.price || ''}
                onChange={e => upd({ price: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right w-full outline-none border-b border-transparent focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            );
          case 'total':
            return <div key={col} className="text-sm font-mono text-right text-gold">{fmt(row.qty * row.price)}</div>;
          default:
            return <div key={col} />;
        }
      })}
      <button
        onClick={() => store.deleteSavedBlockRow(block.id, rowId)}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-destructive transition-all"
      >
        <Icon name="Trash2" size={13} />
      </button>
    </div>
  );
}
