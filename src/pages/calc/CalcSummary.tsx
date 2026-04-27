import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt } from './constants';
import type { Project } from '@/store/types';

interface Totals {
  rawMaterials: number;
  rawServices: number;
  base: number;
  grandTotal: number;
  totalMarkupAmount: number;
  blockExtraTotal: number;
  blockExtras: Array<{ blockId: string; blockName: string; base: number; extra: number }>;
}

interface Props {
  project: Project;
  totals: Totals;
  totalServices: number;
  grandTotal: number;
  hiddenRows: Set<string>;
  showSettings: boolean;
  onToggleSettings: () => void;
  onToggleRow: (id: string) => void;
  onShowAll: () => void;
}

export default function CalcSummary({
  totals, totalServices, grandTotal,
  hiddenRows, showSettings, onToggleSettings, onToggleRow, onShowAll,
}: Props) {
  const store = useStore();
  const cur = store.settings.currency;
  const groups = store.expenseGroups || [];
  const allExpenses = store.expenses;

  type SummaryRow = { id: string; label: string; value: number; sign?: '+'; color?: string; indent?: boolean };
  const rows: SummaryRow[] = [];
  const activeExp = allExpenses.filter(e => e.enabled !== false);

  const groupByGid = <T extends { groupId?: string }>(items: T[]) => {
    const map: Record<string, T[]> = {};
    items.forEach(e => { const k = e.groupId || '__ug'; map[k] = [...(map[k] || []), e]; });
    return map;
  };

  totals.blockExtras.forEach(b => {
    if (b.base <= 0) return;
    rows.push({ id: `block-${b.blockId}`, label: b.blockName, value: b.base });
    if (b.extra > 0) {
      rows.push({ id: `block-extra-${b.blockId}`, label: '+ надбавка на блок', value: b.extra, sign: '+', color: 'gold', indent: true });
    }
  });

  if (totalServices > 0) {
    rows.push({ id: 'services', label: 'Услуги', value: totalServices });
  }

  if (totals.totalMarkupAmount > 0) {
    const items = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
    Object.entries(groupByGid(items)).forEach(([gid, grpItems]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const pct = grpItems.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(totals.base * pct / 100);
      if (amt > 0) rows.push({ id: `totalMarkup-${gid}`, label: `${grp?.name ?? 'Надбавка на итог'} (${pct}%)`, value: amt, sign: '+', color: 'gold' });
    });
  }

  const baseForOverhead = totals.base + totals.totalMarkupAmount + totals.blockExtraTotal;

  const percentItems = activeExp.filter(e => e.type === 'percent');
  if (percentItems.length > 0) {
    Object.entries(groupByGid(percentItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const pct = items.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(items.reduce((s, e) => s + baseForOverhead * e.value / 100, 0));
      if (amt > 0) rows.push({ id: `percent-${gid}`, label: `${grp?.name ?? 'Расходы'} (${pct}%)`, value: amt, sign: '+', color: 'blue' });
    });
  }

  const fixedItems = activeExp.filter(e => e.type === 'fixed');
  if (fixedItems.length > 0) {
    Object.entries(groupByGid(fixedItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const amt = items.reduce((s, e) => s + e.value, 0);
      if (amt > 0) rows.push({ id: `fixed-${gid}`, label: grp?.name ?? 'Постоянные расходы', value: amt, sign: '+' });
    });
  }

  const allRowIds = rows.map(r => r.id);
  const visibleRows = rows.filter(r => !hiddenRows.has(r.id));

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Итоговая сводка</span>
        <button
          onClick={onToggleSettings}
          className={`flex items-center gap-1 text-xs transition-colors ${showSettings ? 'text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
        >
          <Icon name="SlidersHorizontal" size={12} />
          <span>Настроить</span>
        </button>
      </div>

      {showSettings && (
        <div className="mb-3 p-3 bg-[hsl(220,12%,14%)] rounded border border-border space-y-1.5">
          <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Показывать строки:</div>
          {rows.map(r => {
            const hidden = hiddenRows.has(r.id);
            return (
              <button key={r.id}
                onClick={() => onToggleRow(r.id)}
                className="flex items-center gap-2 w-full text-left text-xs hover:text-foreground transition-colors"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${!hidden ? 'bg-gold border-gold' : 'border-border'}`}>
                  {!hidden && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                </span>
                <span className={`${r.indent ? 'pl-3' : ''} ${!hidden ? 'text-foreground' : 'text-[hsl(var(--text-muted))]'}`}>{r.label}</span>
                <span className="ml-auto font-mono text-[hsl(var(--text-muted))]">{fmt(r.value)} {cur}</span>
              </button>
            );
          })}
          {allRowIds.length > 0 && (
            <button onClick={onShowAll} className="text-xs text-gold hover:underline mt-1">
              Показать все
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {visibleRows.map((r, i) => {
          const isFirst = i === 0;
          const isService = r.id === 'services';
          const addDivider = isService || (r.sign === '+' && (i === 0 || !visibleRows[i - 1]?.sign));
          return (
            <div key={r.id}
              className={`flex justify-between text-sm ${r.indent ? 'pl-4' : ''} ${addDivider && !isFirst ? 'border-t border-border pt-1.5' : ''} ${
                r.color === 'gold' ? 'text-gold' :
                r.color === 'blue' ? 'text-[hsl(200,60%,70%)]' :
                'text-[hsl(var(--text-dim))]'
              }`}
            >
              <span>{r.label}</span>
              <span className="font-mono shrink-0 ml-4">
                {r.sign ? `+${fmt(r.value)}` : fmt(r.value)} {cur}
              </span>
            </div>
          );
        })}
        <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-1">
          <span>Итого</span>
          <span className="font-mono text-gold">{fmt(grandTotal)} {cur}</span>
        </div>
      </div>
    </div>
  );
}