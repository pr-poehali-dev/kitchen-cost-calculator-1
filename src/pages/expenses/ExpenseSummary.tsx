import type { Project } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Totals {
  rawMaterials: number;
  rawServices: number;
  blockExtraTotal: number;
  totalMarkupAmount: number;
  totalMarkupPct: number;
  percentAmount: number;
  fixedAmount: number;
  grandTotal: number;
}

interface Props {
  totals: Totals | null;
  totalPurchase?: number;
  currency: string;
  project: Project | null;
  showRefreshBanner: boolean;
  refreshDone: boolean;
  onApplyRefresh: () => void;
  onDismissBanner: () => void;
}

export default function ExpenseSummary({
  totals, totalPurchase, currency, project,
  showRefreshBanner, refreshDone,
  onApplyRefresh, onDismissBanner,
}: Props) {
  // Сегменты для диаграммы
  const segments = totals && totals.grandTotal > 0 ? (() => {
    const total = totals.grandTotal;
    const markupSum = totals.blockExtraTotal + totals.totalMarkupAmount;
    const items = [
      { label: 'Материалы', value: totals.rawMaterials, color: '#c8a96e' },
      { label: 'Услуги', value: totals.rawServices, color: '#3b82f6' },
      { label: markupSum >= 0 ? 'Надбавки' : 'Скидки/надбавки', value: markupSum, color: markupSum >= 0 ? '#8b5cf6' : '#ef4444' },
      { label: 'Накладные %', value: totals.percentAmount, color: '#06b6d4' },
      { label: 'Фиксированные', value: totals.fixedAmount, color: '#10b981' },
    ].filter(s => s.value !== 0);

    let offset = 0;
    return items.map(s => {
      const absPct = (Math.abs(s.value) / total) * 100;
      const seg = { ...s, pct: absPct, offset };
      offset += absPct;
      return seg;
    });
  })() : [];

  return (
    <>
      {/* Баннер: предложение обновить цены в проекте */}
      {showRefreshBanner && project && (
        <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded border transition-colors ${
          refreshDone
            ? 'bg-[hsl(140,40%,12%)] border-[hsl(140,40%,25%)]'
            : 'bg-[hsl(38,40%,12%)] border-[hsl(38,50%,30%)]'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <Icon name={refreshDone ? 'CheckCircle' : 'AlertCircle'} size={15} className={refreshDone ? 'text-[hsl(140,50%,50%)]' : 'text-gold'} />
            <span className={refreshDone ? 'text-[hsl(140,50%,60%)]' : 'text-[hsl(38,80%,70%)]'}>
              {refreshDone
                ? 'Цены в проекте обновлены'
                : `Наценка изменена — обновить розничные цены в «${project.object}»?`
              }
            </span>
          </div>
          {!refreshDone && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onApplyRefresh}
                className="px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90"
              >
                Обновить
              </button>
              <button onClick={onDismissBanner} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Влияние на расчёт */}
      {totals && (
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-4">Структура итоговой цены</div>

          <div className="flex gap-6 items-start">
            {/* Диаграмма */}
            {segments.length > 0 && (
              <div className="shrink-0">
                {/* Горизонтальный стек-бар */}
                <div className="flex h-6 rounded overflow-hidden w-64 mb-3">
                  {segments.map((s, i) => (
                    <div
                      key={i}
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                      className="transition-all"
                      title={`${s.label}: ${fmt(s.value)} ${currency} (${s.pct.toFixed(1)}%)`}
                    />
                  ))}
                </div>
                {/* Легенда */}
                <div className="space-y-1.5">
                  {segments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-[hsl(var(--text-dim))]">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[hsl(var(--text-muted))]">{s.pct.toFixed(1)}%</span>
                        <span className="text-foreground">{fmt(s.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Числовая разбивка */}
            <div className="flex-1 space-y-1.5 text-sm min-w-0">
              <div className="flex justify-between text-[hsl(var(--text-dim))]">
                <span>Материалы (розн.)</span>
                <span className="font-mono">{fmt(totals.rawMaterials)} {currency}</span>
              </div>
              {totals.rawServices > 0 && (
                <div className="flex justify-between text-[hsl(var(--text-dim))]">
                  <span>Услуги (розн.)</span>
                  <span className="font-mono">{fmt(totals.rawServices)} {currency}</span>
                </div>
              )}
              {totals.blockExtraTotal > 0 && (
                <div className="flex justify-between text-[hsl(var(--gold))]">
                  <span>Надбавки на блоки</span>
                  <span className="font-mono">+{fmt(totals.blockExtraTotal)} {currency}</span>
                </div>
              )}
              {totals.totalMarkupAmount !== 0 && (
                <div className={`flex justify-between ${totals.totalMarkupAmount > 0 ? 'text-[hsl(var(--gold))]' : 'text-[hsl(140,60%,50%)]'}`}>
                  <span>{totals.totalMarkupAmount > 0 ? 'Надбавка' : 'Скидка'} на итог ({totals.totalMarkupPct}%)</span>
                  <span className="font-mono">{totals.totalMarkupAmount > 0 ? '+' : ''}{fmt(totals.totalMarkupAmount)} {currency}</span>
                </div>
              )}
              {totals.percentAmount > 0 && (
                <div className="flex justify-between text-[hsl(200,60%,70%)]">
                  <span>Накладные расходы (%)</span>
                  <span className="font-mono">+{fmt(totals.percentAmount)} {currency}</span>
                </div>
              )}
              {totals.fixedAmount > 0 && (
                <div className="flex justify-between text-[hsl(var(--text-dim))]">
                  <span>Фиксированные расходы</span>
                  <span className="font-mono">+{fmt(totals.fixedAmount)} {currency}</span>
                </div>
              )}
              <div className="border-t border-border mt-2 pt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Итого с расходами</span>
                  <span className="font-mono text-gold">{fmt(totals.grandTotal)} {currency}</span>
                </div>
                {totalPurchase != null && totalPurchase > 0 && totals.grandTotal > 0 && (
                  <div className="text-xs text-[hsl(var(--text-muted))] mt-1">
                    Наценка к закупке: ×{(totals.grandTotal / totalPurchase).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}