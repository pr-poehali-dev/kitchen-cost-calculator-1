import { useState } from 'react';
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

type DisplayMode = 'manager' | 'client';
type GroupingMode = 'groups' | 'types' | 'both';

const MODE_STORAGE_KEY = 'kuhni_summary_display_mode';
const GROUPING_STORAGE_KEY = 'kuhni_summary_grouping_mode';

function loadMode(): DisplayMode {
  return (localStorage.getItem(MODE_STORAGE_KEY) as DisplayMode) || 'manager';
}
function loadGrouping(): GroupingMode {
  return (localStorage.getItem(GROUPING_STORAGE_KEY) as GroupingMode) || 'groups';
}

export default function CalcSummary({
  project, totals, totalServices, grandTotal,
  hiddenRows, showSettings, onToggleSettings, onToggleRow, onShowAll,
}: Props) {
  const store = useStore();
  const cur = store.settings.currency;
  const groups = store.expenseGroups || [];
  const allExpenses = store.expenses;

  const [displayMode, setDisplayMode] = useState<DisplayMode>(loadMode);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>(loadGrouping);

  const setMode = (m: DisplayMode) => { setDisplayMode(m); localStorage.setItem(MODE_STORAGE_KEY, m); };
  const setGrouping = (m: GroupingMode) => { setGroupingMode(m); localStorage.setItem(GROUPING_STORAGE_KEY, m); };

  type SummaryRow = {
    id: string;
    label: string;
    value: number;
    pct?: number;
    sign?: '+' | '-';
    color?: string;
    indent?: boolean;
    section?: 'materials' | 'types' | 'services' | 'expenses';
  };

  const activeExp = allExpenses.filter(e => e.enabled !== false);

  const groupByGid = <T extends { groupId?: string }>(items: T[]) => {
    const map: Record<string, T[]> = {};
    items.forEach(e => { const k = e.groupId || '__ug'; map[k] = [...(map[k] || []), e]; });
    return map;
  };

  const isClient = displayMode === 'client';

  // ── Строки для режима менеджера ────────────────────────────
  const managerRows: SummaryRow[] = [];

  if (groupingMode === 'groups' || groupingMode === 'both') {
    totals.blockExtras.forEach(b => {
      if (b.base <= 0) return;
      managerRows.push({ id: `block-${b.blockId}`, label: b.blockName, value: b.base, section: 'materials' });
      if (b.extra > 0) {
        managerRows.push({ id: `block-extra-${b.blockId}`, label: '+ надбавка на блок', value: b.extra, sign: '+', color: 'gold', indent: true, section: 'materials' });
      }
    });
  }

  if (groupingMode === 'types' || groupingMode === 'both') {
    const typeMap: Record<string, number> = {};
    project.blocks.forEach(block => {
      block.rows.forEach(row => {
        if (!row.name.trim() || row.qty <= 0) return;
        const typeId = row.typeId || '__other';
        typeMap[typeId] = (typeMap[typeId] || 0) + row.price * row.qty;
      });
    });
    const totalMat = Object.values(typeMap).reduce((s, v) => s + v, 0);
    Object.entries(typeMap)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([typeId, amount]) => {
        const typeName = typeId === '__other' ? 'Прочие материалы' : store.getTypeName(typeId) || 'Прочие материалы';
        const pct = totalMat > 0 ? Math.round(amount / totalMat * 100) : 0;
        managerRows.push({ id: `type-${typeId}`, label: typeName, value: Math.round(amount), pct, section: 'types' });
      });
  }

  if (totalServices > 0) {
    managerRows.push({ id: 'services', label: 'Услуги', value: totalServices, section: 'services' });
  }

  if (totals.totalMarkupAmount !== 0) {
    const items = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
    Object.entries(groupByGid(items)).forEach(([gid, grpItems]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const pct = grpItems.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(totals.base * pct / 100);
      if (amt !== 0) {
        const isDiscount = pct < 0;
        const defaultLabel = isDiscount ? 'Скидка на итог' : 'Надбавка на итог';
        managerRows.push({ id: `totalMarkup-${gid}`, label: `${grp?.name ?? defaultLabel} (${pct}%)`, value: Math.abs(amt), sign: amt > 0 ? '+' : '-', color: amt > 0 ? 'gold' : 'green', section: 'expenses' });
      }
    });
  }

  const baseForOverhead = totals.base + totals.totalMarkupAmount + totals.blockExtraTotal;

  const percentItems = activeExp.filter(e => e.type === 'percent');
  if (percentItems.length > 0) {
    Object.entries(groupByGid(percentItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const pct = items.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(items.reduce((s, e) => s + baseForOverhead * e.value / 100, 0));
      if (amt > 0) managerRows.push({ id: `percent-${gid}`, label: `${grp?.name ?? 'Расходы'} (${pct}%)`, value: amt, sign: '+', color: 'blue', section: 'expenses' });
    });
  }

  const fixedItems = activeExp.filter(e => e.type === 'fixed');
  if (fixedItems.length > 0) {
    Object.entries(groupByGid(fixedItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const amt = items.reduce((s, e) => s + e.value, 0);
      if (amt > 0) managerRows.push({ id: `fixed-${gid}`, label: grp?.name ?? 'Постоянные расходы', value: amt, sign: '+', section: 'expenses' });
    });
  }

  // ── Строки для режима клиента ──────────────────────────────
  // Блоки материалов (каждый блок отдельно)
  const clientRows: SummaryRow[] = [];

  totals.blockExtras.forEach(b => {
    if (b.base <= 0) return;
    clientRows.push({ id: `client-block-${b.blockId}`, label: b.blockName, value: b.base, section: 'materials' });
  });

  if (totalServices > 0) {
    clientRows.push({ id: 'client-services', label: 'Услуги', value: totalServices, section: 'services' });
  }

  // Статьи расходов для клиента — только надбавки/скидки на итог (без внутренних расходов)
  if (totals.totalMarkupAmount !== 0) {
    const items = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
    Object.entries(groupByGid(items)).forEach(([gid, grpItems]) => {
      const grp = gid !== '__ug' ? groups.find(g => g.id === gid) : null;
      const pct = grpItems.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(totals.base * pct / 100);
      if (amt !== 0) {
        const isDiscount = pct < 0;
        const defaultLabel = isDiscount ? 'Скидка' : 'Надбавка';
        clientRows.push({
          id: `client-markup-${gid}`,
          label: grp?.name ?? `${defaultLabel} (${Math.abs(pct)}%)`,
          value: Math.abs(amt),
          sign: amt > 0 ? '+' : '-',
          color: amt < 0 ? 'green' : undefined,
          section: 'expenses',
        });
      }
    });
  }

  // ── Итоговые наборы с учётом скрытых строк ─────────────────
  const rows = isClient ? clientRows : managerRows;
  const allRowIds = rows.map(r => r.id);
  const visibleRows = rows.filter(r => !hiddenRows.has(r.id));

  const getSectionDivider = (row: SummaryRow, i: number): boolean => {
    if (i === 0) return false;
    const prev = visibleRows[i - 1];
    return !!prev && prev.section !== row.section;
  };

  // ── Чекбокс-строка ─────────────────────────────────────────
  const ToggleRow = ({ r }: { r: SummaryRow }) => {
    const hidden = hiddenRows.has(r.id);
    return (
      <button
        onClick={() => onToggleRow(r.id)}
        className="flex items-center gap-2 w-full text-left text-xs hover:text-foreground transition-colors"
      >
        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${!hidden ? 'bg-gold border-gold' : 'border-border'}`}>
          {!hidden && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
        </span>
        <span className={`${r.indent ? 'pl-3' : ''} ${!hidden ? 'text-foreground' : 'text-[hsl(var(--text-muted))]'} flex-1 truncate`}>{r.label}</span>
        <span className="ml-auto font-mono text-[hsl(var(--text-muted))] shrink-0">
          {r.sign === '+' ? `+${fmt(r.value)}` : r.sign === '-' ? `-${fmt(r.value)}` : fmt(r.value)} {cur}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
      {/* Заголовок */}
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

      {/* Панель настроек */}
      {showSettings && (
        <div className="mb-4 p-3 bg-[hsl(220,12%,14%)] rounded border border-border space-y-4">

          {/* Режим отображения */}
          <div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Режим</div>
            <div className="flex gap-2">
              {([
                { id: 'manager', label: 'Для менеджера', icon: 'BarChart2' },
                { id: 'client',  label: 'Для клиента',   icon: 'User' },
              ] as const).map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
                    displayMode === m.id
                      ? 'bg-gold/20 border-gold/50 text-gold'
                      : 'border-border text-[hsl(var(--text-muted))] hover:border-gold/30 hover:text-foreground'
                  }`}
                >
                  <Icon name={m.icon} size={11} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Группировка (только для менеджера) */}
          {!isClient && (
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Группировка материалов</div>
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'groups', label: 'По блокам' },
                  { id: 'types',  label: 'По типам' },
                  { id: 'both',   label: 'Блоки + типы' },
                ] as const).map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGrouping(g.id)}
                    className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                      groupingMode === g.id
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'border-border text-[hsl(var(--text-muted))] hover:border-gold/30 hover:text-foreground'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Видимость строк — для обоих режимов */}
          {rows.length > 0 && (
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
                {isClient ? 'Показывать клиенту' : 'Показывать строки'}
              </div>
              <div className="space-y-1.5">
                {rows.map(r => <ToggleRow key={r.id} r={r} />)}
                {allRowIds.length > 0 && (
                  <button onClick={onShowAll} className="text-xs text-gold hover:underline mt-1">
                    Показать все
                  </button>
                )}
              </div>
              {isClient && clientRows.some(r => r.section === 'expenses') && (
                <p className="text-[10px] text-[hsl(var(--text-muted))] mt-2">
                  Скидки и надбавки можно показать или скрыть в итоге для клиента
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Список строк (единый рендер для обоих режимов) */}
      <div className="space-y-1.5">
        {visibleRows.length === 0 && isClient && (
          <div className="text-sm text-[hsl(var(--text-dim))] flex justify-between">
            <span>Итого</span>
            <span className="font-mono text-gold">{fmt(grandTotal)} {cur}</span>
          </div>
        )}

        {visibleRows.map((r, i) => {
          const hasDivider = getSectionDivider(r, i);
          const isTypesSection = r.section === 'types';
          const totalMat = visibleRows.filter(x => x.section === 'types').reduce((s, x) => s + x.value, 0);

          return (
            <div key={r.id}>
              {hasDivider && <div className="border-t border-border my-1.5" />}
              <div
                className={`flex justify-between text-sm ${r.indent ? 'pl-4' : ''} ${
                  r.color === 'gold'  ? 'text-gold' :
                  r.color === 'blue'  ? 'text-[hsl(200,60%,70%)]' :
                  r.color === 'green' ? 'text-[hsl(140,60%,50%)]' :
                  r.color === 'red'   ? 'text-[hsl(0,70%,60%)]' :
                  'text-[hsl(var(--text-dim))]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{r.label}</span>
                  {isTypesSection && r.pct !== undefined && r.pct > 0 && (
                    <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">{r.pct}%</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {isTypesSection && totalMat > 0 && (
                    <div className="w-16 h-1 bg-[hsl(220,12%,20%)] rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-gold/50 rounded-full" style={{ width: `${Math.min(100, r.value / totalMat * 100)}%` }} />
                    </div>
                  )}
                  <span className="font-mono">
                    {r.sign === '+' ? `+${fmt(r.value)}` : r.sign === '-' ? `-${fmt(r.value)}` : fmt(r.value)} {cur}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {visibleRows.length > 0 && (
          <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-1">
            <span>Итого</span>
            <span className="font-mono text-gold">{fmt(grandTotal)} {cur}</span>
          </div>
        )}
      </div>
    </div>
  );
}
