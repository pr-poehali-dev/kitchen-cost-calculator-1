import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ServiceRow, Unit } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props {
  row: ServiceRow;
  currency: string;
  services: ReturnType<typeof useStore>['services'];
  onUpdate: (data: Partial<ServiceRow>) => void;
  onDelete: () => void;
  onApplyService: (id: string) => void;
}

export default function ServiceRowComponent({ row, currency, services, onUpdate, onDelete, onApplyService }: Props) {
  const store = useStore();
  const [showSuggest, setShowSuggest] = useState(false);
  const [nameFilter, setNameFilter] = useState(row.name);
  const rowTotal = row.qty * row.price;

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
    s.category.toLowerCase().includes(nameFilter.toLowerCase())
  );

  const sv = services.find(s => s.id === row.serviceId);

  return (
    <div className="relative grid items-center px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] transition-colors group"
      style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}>

      <div className="relative pr-2">
        <input
          value={nameFilter}
          onChange={e => { setNameFilter(e.target.value); onUpdate({ name: e.target.value }); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Наименование услуги..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
        />
        {showSuggest && filtered.length > 0 && (
          <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-64 max-h-40 overflow-auto scrollbar-thin">
            {filtered.slice(0, 6).map(s => (
              <button
                key={s.id}
                onMouseDown={() => { onApplyService(s.id); setNameFilter(s.name); setShowSuggest(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex justify-between"
              >
                <span>{s.name}</span>
                <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{s.basePrice.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{sv?.category || '—'}</div>

      <select
        value={row.unit}
        onChange={e => onUpdate({ unit: e.target.value as Unit })}
        className="bg-transparent text-xs text-[hsl(var(--text-dim))] border-0 outline-none"
      >
        {store.settings.units.map(u => (
          <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
        ))}
      </select>

      <div className="flex items-center justify-end gap-1">
        <button
          tabIndex={-1}
          onClick={() => onUpdate({ qty: Math.max(0, (row.qty || 0) - 1) })}
          className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
        >−</button>
        <input
          type="number"
          value={row.qty || ''}
          onChange={e => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
          className="bg-transparent text-sm font-mono text-center outline-none border-b border-transparent focus:border-[hsl(var(--gold))] w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          tabIndex={-1}
          onClick={() => onUpdate({ qty: (row.qty || 0) + 1 })}
          className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
        >+</button>
      </div>

      <div className="text-right pr-1">
        <input
          type="number"
          value={row.price || ''}
          onChange={e => onUpdate({ price: parseFloat(e.target.value) || 0 })}
          className="bg-transparent text-sm font-mono text-right outline-none w-full border-b border-transparent focus:border-[hsl(var(--gold))] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="text-xs text-gold font-mono mt-0.5">{fmt(rowTotal)} {currency}</div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive transition-all ml-1"
      >
        <Icon name="X" size={13} />
      </button>
    </div>
  );
}
