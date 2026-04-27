import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt } from './constants';

interface Props {
  currentProjectId: string;
  onClose: () => void;
}

export default function ComparePanel({ currentProjectId, onClose }: Props) {
  const store = useStore();
  const [compareId, setCompareId] = useState<string>('');

  const projectA = store.projects.find(p => p.id === currentProjectId);
  const projectB = store.projects.find(p => p.id === compareId);

  const currency = store.settings.currency;

  const calcTotals = (p: typeof projectA) => {
    if (!p) return null;
    return store.calcProjectTotals(p);
  };

  const totalsA = calcTotals(projectA);
  const totalsB = calcTotals(projectB);

  const otherProjects = store.projects.filter(p => p.id !== currentProjectId);

  function DiffBadge({ a, b }: { a: number; b: number }) {
    if (!b) return null;
    const diff = b - a;
    const pct = a > 0 ? Math.round((diff / a) * 100) : 0;
    if (diff === 0) return <span className="text-xs text-[hsl(var(--text-muted))]">—</span>;
    return (
      <span className={`text-xs font-medium ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
        {diff > 0 ? '+' : ''}{fmt(diff)} ({diff > 0 ? '+' : ''}{pct}%)
      </span>
    );
  }

  const ROWS = [
    { label: 'Материалы (розн.)', keyA: totalsA?.rawMaterials ?? 0, keyB: totalsB?.rawMaterials ?? 0 },
    { label: 'Услуги (розн.)', keyA: totalsA?.rawServices ?? 0, keyB: totalsB?.rawServices ?? 0 },
    { label: 'Надбавки', keyA: (totalsA?.blockExtraTotal ?? 0) + (totalsA?.totalMarkupAmount ?? 0), keyB: (totalsB?.blockExtraTotal ?? 0) + (totalsB?.totalMarkupAmount ?? 0) },
    { label: 'Накладные %', keyA: totalsA?.percentAmount ?? 0, keyB: totalsB?.percentAmount ?? 0 },
    { label: 'Фиксированные расходы', keyA: totalsA?.fixedAmount ?? 0, keyB: totalsB?.fixedAmount ?? 0 },
  ];

  const blockRowsA = projectA?.blocks.map(b => ({
    name: b.name,
    total: b.rows.reduce((s, r) => s + r.qty * r.price, 0),
  })) ?? [];

  const blockRowsB = projectB?.blocks.map(b => ({
    name: b.name,
    total: b.rows.reduce((s, r) => s + r.qty * r.price, 0),
  })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl shadow-2xl w-full max-w-3xl mx-4 animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="GitCompare" size={15} className="text-gold" />
            <span className="font-semibold text-sm">Сравнение вариантов</span>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="overflow-auto scrollbar-thin flex-1 p-5 space-y-4">
          {/* Выбор второго проекта */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[hsl(220,12%,14%)] border border-gold/30 rounded-lg px-4 py-3">
              <div className="text-[10px] text-gold uppercase tracking-wider mb-1">Вариант А (текущий)</div>
              <div className="font-semibold text-sm truncate">{projectA?.object || 'Без названия'}</div>
              {projectA?.client && <div className="text-xs text-[hsl(var(--text-muted))]">{projectA.client}</div>}
            </div>
            <Icon name="ArrowLeftRight" size={16} className="text-[hsl(var(--text-muted))] shrink-0" />
            <div className="flex-1">
              {compareId ? (
                <div className="bg-[hsl(220,12%,14%)] border border-border rounded-lg px-4 py-3 group relative">
                  <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1">Вариант Б</div>
                  <div className="font-semibold text-sm truncate">{projectB?.object || 'Без названия'}</div>
                  {projectB?.client && <div className="text-xs text-[hsl(var(--text-muted))]">{projectB.client}</div>}
                  <button onClick={() => setCompareId('')} className="absolute top-2 right-2 text-[hsl(var(--text-muted))] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ) : (
                <select
                  value={compareId}
                  onChange={e => setCompareId(e.target.value)}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:border-gold transition-colors"
                >
                  <option value="">— выбрать проект для сравнения —</option>
                  {otherProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.object || p.client || 'Без названия'}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Сравнительная таблица */}
          {projectA && projectB && totalsA && totalsB && (
            <>
              {/* Итоги */}
              <div className="bg-[hsl(220,12%,14%)] rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-0 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider px-4 py-2 border-b border-border bg-[hsl(220,12%,12%)]">
                  <span>Статья</span>
                  <span className="text-right text-gold">Вариант А</span>
                  <span className="text-right">Вариант Б</span>
                  <span className="text-right">Разница</span>
                </div>
                {ROWS.filter(r => r.keyA > 0 || r.keyB > 0).map(r => (
                  <div key={r.label} className="grid grid-cols-4 gap-0 px-4 py-2.5 border-b border-[hsl(220,12%,16%)] last:border-0 text-sm">
                    <span className="text-[hsl(var(--text-dim))]">{r.label}</span>
                    <span className="text-right font-mono text-gold">{fmt(r.keyA)}</span>
                    <span className="text-right font-mono text-foreground">{fmt(r.keyB)}</span>
                    <span className="text-right"><DiffBadge a={r.keyA} b={r.keyB} /></span>
                  </div>
                ))}
                {/* Итого */}
                <div className="grid grid-cols-4 gap-0 px-4 py-3 bg-[hsl(220,12%,16%)] font-semibold">
                  <span className="text-foreground">Итого с расходами</span>
                  <span className="text-right font-mono text-gold text-base">{fmt(totalsA.grandTotal)} {currency}</span>
                  <span className="text-right font-mono text-foreground text-base">{fmt(totalsB.grandTotal)} {currency}</span>
                  <span className="text-right text-base"><DiffBadge a={totalsA.grandTotal} b={totalsB.grandTotal} /></span>
                </div>
              </div>

              {/* Блоки по проектам */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Вариант А', blocks: blockRowsA, total: totalsA.grandTotal, color: 'text-gold' },
                  { label: 'Вариант Б', blocks: blockRowsB, total: totalsB.grandTotal, color: 'text-foreground' },
                ].map(({ label, blocks, total, color }) => (
                  <div key={label} className="bg-[hsl(220,12%,14%)] rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">{label} — блоки</div>
                    {blocks.map((b, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-[hsl(220,12%,16%)] last:border-0 text-sm">
                        <span className="text-[hsl(var(--text-dim))] truncate flex-1 mr-2">{b.name}</span>
                        <span className={`font-mono shrink-0 ${color}`}>{fmt(b.total)}</span>
                      </div>
                    ))}
                    {blocks.length === 0 && <div className="px-4 py-3 text-xs text-[hsl(var(--text-muted))]">Нет блоков</div>}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,12%,12%)] text-sm font-semibold">
                      <span>Итого</span>
                      <span className={`font-mono ${color}`}>{fmt(total)} {currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!compareId && (
            <div className="text-center py-8 text-sm text-[hsl(var(--text-muted))]">
              Выберите второй проект для сравнения
            </div>
          )}

          {otherProjects.length === 0 && (
            <div className="text-center py-6 text-sm text-[hsl(var(--text-muted))]">
              Нет других проектов. Создайте дубликат текущего и измените его для сравнения.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
