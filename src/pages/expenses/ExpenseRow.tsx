import type { ExpenseItem } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export const TYPE_META = {
  fixed:   { label: 'Фикс.',    color: 'bg-[hsl(220,12%,22%)] text-[hsl(var(--text-dim))]' },
  percent: { label: '%',        color: 'bg-[hsl(200,40%,20%)] text-[hsl(200,60%,70%)]' },
  markup:  { label: 'Наценка',  color: 'bg-[hsl(38,40%,20%)] text-gold' },
};

export const APPLY_OPTIONS = [
  { value: 'materials', label: 'На материалы' },
  { value: 'services',  label: 'На услуги' },
  { value: 'total',     label: 'На итог' },
  { value: 'block',     label: 'На блоки' },
];

export function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!enabled); }}
      className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${enabled ? 'bg-gold' : 'bg-[hsl(220,12%,22%)]'}`}
    >
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

interface Props {
  expense: ExpenseItem;
  currency: string;
  projectBlocks: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}

export default function ExpenseRow({ expense, currency, projectBlocks, onEdit, onDelete, onToggle }: Props) {
  const meta = TYPE_META[expense.type];
  const enabled = expense.enabled !== false;

  const applyLabel = () => {
    if (expense.type !== 'markup') return '—';
    if (expense.applyTo === 'block') {
      const names = (expense.blockIds || [])
        .map(id => projectBlocks.find(b => b.id === id)?.name || '?')
        .join(', ');
      return names || 'Блоки не выбраны';
    }
    return APPLY_OPTIONS.find(o => o.value === expense.applyTo)?.label || '—';
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm ${!enabled ? 'opacity-40' : ''}`}
    >
      <Toggle enabled={enabled} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="text-foreground truncate">{expense.name}</div>
        {expense.note && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{expense.note}</div>}
      </div>

      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${meta.color}`}>
        {meta.label}
      </span>

      {expense.type === 'markup' && (
        <span className="text-xs text-[hsl(var(--text-dim))] shrink-0 hidden sm:block max-w-[100px] truncate">
          {applyLabel()}
        </span>
      )}

      <div className="text-right font-mono shrink-0 w-20">
        {expense.type === 'fixed'
          ? <span className="text-foreground">{fmt(expense.value)}<span className="text-[hsl(var(--text-muted))] text-xs ml-0.5">{currency}</span></span>
          : <span className={expense.type === 'markup' ? 'text-gold' : 'text-[hsl(200,60%,70%)]'}>{expense.value}%</span>
        }
      </div>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 rounded">
          <Icon name="Pencil" size={12} />
        </button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 rounded">
          <Icon name="Trash2" size={12} />
        </button>
      </div>
    </div>
  );
}
