import { useState, useCallback } from 'react';
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
  // hiddenRows теперь управляется внутри компонента
  showSettings: boolean;
  onToggleSettings: () => void;
}

type DisplayMode = 'manager' | 'client';
type GroupingMode = 'groups' | 'types' | 'both';

const MODE_KEY       = 'kuhni_summary_display_mode';
const GROUPING_KEY   = 'kuhni_summary_grouping_mode';
const DISTRIBUTE_KEY = 'kuhni_summary_distribute_expenses';
const HIDDEN_MGR_KEY = 'kuhni_summary_hidden_manager';
const HIDDEN_CLI_KEY = 'kuhni_summary_hidden_client';

const load = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
};
const save = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

export default function CalcSummary({
  project, totals, totalServices, grandTotal,
  showSettings, onToggleSettings,
}: Props) {
  const store = useStore();
  const cur = store.settings.currency;
  const expGroups = store.expenseGroups || [];
  const allExpenses = store.expenses;

  const [displayMode,       setDisplayModeState]     = useState<DisplayMode>(() => load(MODE_KEY, 'manager'));
  const [groupingMode,      setGroupingModeState]     = useState<GroupingMode>(() => load(GROUPING_KEY, 'groups'));
  const [distributeExpenses,setDistributeState]       = useState<boolean>(() => load(DISTRIBUTE_KEY, false));
  const [hiddenMgr,         setHiddenMgr]             = useState<Set<string>>(() => new Set(load<string[]>(HIDDEN_MGR_KEY, [])));
  const [hiddenCli,         setHiddenCli]             = useState<Set<string>>(() => new Set(load<string[]>(HIDDEN_CLI_KEY, [])));

  const setMode = (m: DisplayMode) => { setDisplayModeState(m); save(MODE_KEY, m); };
  const setGrouping = (m: GroupingMode) => { setGroupingModeState(m); save(GROUPING_KEY, m); };
  const toggleDistribute = () => { const n = !distributeExpenses; setDistributeState(n); save(DISTRIBUTE_KEY, n); };

  const isClient = displayMode === 'client';
  const hiddenRows = isClient ? hiddenCli : hiddenMgr;

  const toggleRow = useCallback((id: string) => {
    if (isClient) {
      setHiddenCli(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        save(HIDDEN_CLI_KEY, [...next]);
        return next;
      });
    } else {
      setHiddenMgr(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        save(HIDDEN_MGR_KEY, [...next]);
        return next;
      });
    }
  }, [isClient]);

  const showAll = useCallback(() => {
    if (isClient) { setHiddenCli(new Set()); save(HIDDEN_CLI_KEY, []); }
    else          { setHiddenMgr(new Set()); save(HIDDEN_MGR_KEY, []); }
  }, [isClient]);

  // ── helpers ────────────────────────────────────────────────
  type SummaryRow = {
    id: string; label: string; value: number;
    pct?: number; sign?: '+' | '-'; color?: string;
    indent?: boolean; section?: 'materials' | 'types' | 'services' | 'expenses';
  };

  const activeExp = allExpenses.filter(e => e.enabled !== false);

  const groupByGid = <T extends { groupId?: string }>(items: T[]) => {
    const map: Record<string, T[]> = {};
    items.forEach(e => { const k = e.groupId || '__ug'; map[k] = [...(map[k] || []), e]; });
    return map;
  };

  // ── Строки менеджера ───────────────────────────────────────
  const managerRows: SummaryRow[] = [];

  if (groupingMode === 'groups' || groupingMode === 'both') {
    totals.blockExtras.forEach(b => {
      if (b.base <= 0) return;
      managerRows.push({ id: `block-${b.blockId}`, label: b.blockName, value: b.base, section: 'materials' });
      if (b.extra > 0)
        managerRows.push({ id: `block-extra-${b.blockId}`, label: '+ надбавка на блок', value: b.extra, sign: '+', color: 'gold', indent: true, section: 'materials' });
    });
  }

  if (groupingMode === 'types' || groupingMode === 'both') {
    const typeMap: Record<string, number> = {};
    project.blocks.forEach(block => block.rows.forEach(row => {
      if (!row.name.trim() || row.qty <= 0) return;
      const tid = row.typeId || '__other';
      typeMap[tid] = (typeMap[tid] || 0) + row.price * row.qty;
    }));
    const totalMat = Object.values(typeMap).reduce((s, v) => s + v, 0);
    Object.entries(typeMap).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
      .forEach(([tid, amount]) => {
        const name = tid === '__other' ? 'Прочие материалы' : store.getTypeName(tid) || 'Прочие материалы';
        const pct = totalMat > 0 ? Math.round(amount / totalMat * 100) : 0;
        managerRows.push({ id: `type-${tid}`, label: name, value: Math.round(amount), pct, section: 'types' });
      });
  }

  if (totalServices > 0)
    managerRows.push({ id: 'services', label: 'Услуги', value: totalServices, section: 'services' });

  if (totals.totalMarkupAmount !== 0) {
    const items = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
    Object.entries(groupByGid(items)).forEach(([gid, grpItems]) => {
      const grp = gid !== '__ug' ? expGroups.find(g => g.id === gid) : null;
      const pct = grpItems.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(totals.base * pct / 100);
      if (amt !== 0) {
        const label = pct < 0 ? 'Скидка на итог' : 'Надбавка на итог';
        managerRows.push({ id: `totalMarkup-${gid}`, label: `${grp?.name ?? label} (${pct}%)`, value: Math.abs(amt), sign: amt > 0 ? '+' : '-', color: amt > 0 ? 'gold' : 'green', section: 'expenses' });
      }
    });
  }

  const baseForOverhead = totals.base + totals.totalMarkupAmount + totals.blockExtraTotal;

  const percentItems = activeExp.filter(e => e.type === 'percent');
  if (percentItems.length > 0) {
    Object.entries(groupByGid(percentItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? expGroups.find(g => g.id === gid) : null;
      const pct = items.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(items.reduce((s, e) => s + baseForOverhead * e.value / 100, 0));
      if (amt > 0) managerRows.push({ id: `percent-${gid}`, label: `${grp?.name ?? 'Расходы'} (${pct}%)`, value: amt, sign: '+', color: 'blue', section: 'expenses' });
    });
  }

  const fixedItems = activeExp.filter(e => e.type === 'fixed');
  if (fixedItems.length > 0) {
    Object.entries(groupByGid(fixedItems)).forEach(([gid, items]) => {
      const grp = gid !== '__ug' ? expGroups.find(g => g.id === gid) : null;
      const amt = items.reduce((s, e) => s + e.value, 0);
      if (amt > 0) managerRows.push({ id: `fixed-${gid}`, label: grp?.name ?? 'Постоянные расходы', value: amt, sign: '+', section: 'expenses' });
    });
  }

  // ── Строки клиента ─────────────────────────────────────────
  const clientRows: SummaryRow[] = [];

  // Сумма блоков с надбавками на блок (реальная base для расчёта долей)
  const blocksTotal = totals.blockExtras.reduce((s, b) => s + b.base + b.extra, 0);

  if (distributeExpenses && blocksTotal > 0) {
    // Распределяем все расходы пропорционально в блоки
    const targetMaterialsTotal = grandTotal - totalServices;
    const distributed = totals.blockExtras
      .filter(b => b.base > 0)
      .map(b => ({
        ...b,
        value: Math.round((b.base + b.extra) / blocksTotal * targetMaterialsTotal),
      }));
    // Корректируем последний блок для точного совпадения
    const sum = distributed.reduce((s, b) => s + b.value, 0);
    if (distributed.length > 0) distributed[distributed.length - 1].value += targetMaterialsTotal - sum;
    distributed.forEach(b =>
      clientRows.push({ id: `client-block-${b.blockId}`, label: b.blockName, value: b.value, section: 'materials' })
    );
  } else {
    totals.blockExtras.forEach(b => {
      if (b.base <= 0) return;
      clientRows.push({ id: `client-block-${b.blockId}`, label: b.blockName, value: b.base, section: 'materials' });
    });
  }

  if (totalServices > 0)
    clientRows.push({ id: 'client-services', label: 'Услуги', value: totalServices, section: 'services' });

  // Скидки/надбавки на итог — опционально (только если не распределяем)
  if (!distributeExpenses && totals.totalMarkupAmount !== 0) {
    const items = activeExp.filter(e => e.type === 'markup' && e.applyTo === 'total');
    Object.entries(groupByGid(items)).forEach(([gid, grpItems]) => {
      const grp = gid !== '__ug' ? expGroups.find(g => g.id === gid) : null;
      const pct = grpItems.reduce((s, e) => s + e.value, 0);
      const amt = Math.round(totals.base * pct / 100);
      if (amt !== 0) {
        const label = pct < 0 ? 'Скидка' : 'Надбавка';
        clientRows.push({
          id: `client-markup-${gid}`,
          label: grp?.name ?? `${label} (${Math.abs(pct)}%)`,
          value: Math.abs(amt),
          sign: amt > 0 ? '+' : '-',
          color: amt < 0 ? 'green' : undefined,
          section: 'expenses',
        });
      }
    });
  }

  // ── Итоговые наборы ────────────────────────────────────────
  const rows = isClient ? clientRows : managerRows;
  const visibleRows = rows.filter(r => !hiddenRows.has(r.id));

  // Разрыв для подсказки: разница между суммой блоков (без доп. расходов) и итогом
  // Показываем только если это реально нужно (есть расходы сверху блоков)
  const clientBlocksRaw = totals.blockExtras.reduce((s, b) => s + b.base, 0);
  const hasGap = !distributeExpenses && (grandTotal - clientBlocksRaw - totalServices) > 1;

  const getSectionDivider = (row: SummaryRow, i: number) => {
    if (i === 0) return false;
    return visibleRows[i - 1]?.section !== row.section;
  };

  // ── Чекбокс-строка ─────────────────────────────────────────
  const ToggleRow = ({ r }: { r: SummaryRow }) => {
    const hidden = hiddenRows.has(r.id);
    return (
      <button onClick={() => toggleRow(r.id)} className="flex items-center gap-2 w-full text-left text-xs hover:text-foreground transition-colors">
        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${!hidden ? 'bg-gold border-gold' : 'border-border'}`}>
          {!hidden && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
        </span>
        <span className={`flex-1 truncate ${r.indent ? 'pl-3' : ''} ${!hidden ? 'text-foreground' : 'text-[hsl(var(--text-muted))]'}`}>{r.label}</span>
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

          {/* Режим */}
          <div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Режим</div>
            <div className="flex gap-2">
              {([{ id: 'manager', label: 'Для менеджера', icon: 'BarChart2' }, { id: 'client', label: 'Для клиента', icon: 'User' }] as const).map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${displayMode === m.id ? 'bg-gold/20 border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:border-gold/30 hover:text-foreground'}`}
                >
                  <Icon name={m.icon} size={11} />{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Группировка (менеджер) */}
          {!isClient && (
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Группировка материалов</div>
              <div className="flex gap-2 flex-wrap">
                {([{ id: 'groups', label: 'По блокам' }, { id: 'types', label: 'По типам' }, { id: 'both', label: 'Блоки + типы' }] as const).map(g => (
                  <button key={g.id} onClick={() => setGrouping(g.id)}
                    className={`px-3 py-1.5 rounded text-xs border transition-colors ${groupingMode === g.id ? 'bg-gold/20 border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:border-gold/30 hover:text-foreground'}`}
                  >{g.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Распределение расходов (клиент) */}
          {isClient && (
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Суммы блоков</div>
              <button onClick={toggleDistribute}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-xs w-full text-left transition-colors ${distributeExpenses ? 'bg-gold/15 border-gold/40 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:border-gold/30 hover:text-foreground'}`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${distributeExpenses ? 'bg-gold border-gold' : 'border-border'}`}>
                  {distributeExpenses && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                </span>
                <div>
                  <div className="font-medium">Распределить расходы по блокам</div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {distributeExpenses ? 'Блоки пересчитаны — совпадают с итогом' : hasGap ? 'Расходы не включены в блоки — суммы не сойдутся' : 'Блоки совпадают с итогом'}
                  </div>
                </div>
              </button>
              {distributeExpenses && (
                <p className="text-[10px] text-[hsl(var(--text-muted))] mt-1.5 leading-relaxed">
                  Все расходы пропорционально включены в суммы блоков. Клиент видит итоговые цены.
                </p>
              )}
            </div>
          )}

          {/* Видимость строк */}
          {rows.length > 0 && (
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">
                {isClient ? 'Показывать клиенту' : 'Показывать строки'}
              </div>
              <div className="space-y-1.5">
                {rows.map(r => <ToggleRow key={r.id} r={r} />)}
                <button onClick={showAll} className="text-xs text-gold hover:underline mt-1">Показать все</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Список строк */}
      <div className="space-y-1.5">
        {visibleRows.map((r, i) => {
          const hasDivider = getSectionDivider(r, i);
          const isTypes = r.section === 'types';
          const totalMat = visibleRows.filter(x => x.section === 'types').reduce((s, x) => s + x.value, 0);
          return (
            <div key={r.id}>
              {hasDivider && <div className="border-t border-border my-1.5" />}
              <div className={`flex justify-between text-sm ${r.indent ? 'pl-4' : ''} ${
                r.color === 'gold' ? 'text-gold' : r.color === 'blue' ? 'text-[hsl(200,60%,70%)]' :
                r.color === 'green' ? 'text-[hsl(140,60%,50%)]' : 'text-[hsl(var(--text-dim))]'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{r.label}</span>
                  {isTypes && r.pct !== undefined && r.pct > 0 && (
                    <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">{r.pct}%</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {isTypes && totalMat > 0 && (
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

        <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-1">
          <span>Итого</span>
          <span className="font-mono text-gold">{fmt(grandTotal)} {cur}</span>
        </div>
      </div>
    </div>
  );
}