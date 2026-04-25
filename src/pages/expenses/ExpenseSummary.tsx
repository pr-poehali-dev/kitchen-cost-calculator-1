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
  currency: string;
  project: Project | null;
  showRefreshBanner: boolean;
  refreshDone: boolean;
  onApplyRefresh: () => void;
  onDismissBanner: () => void;
}

export default function ExpenseSummary({
  totals, currency, project,
  showRefreshBanner, refreshDone,
  onApplyRefresh, onDismissBanner,
}: Props) {
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
              <button
                onClick={onDismissBanner}
                className="text-[hsl(var(--text-muted))] hover:text-foreground"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Влияние на расчёт */}
      {totals && (
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Влияние на расчёт</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[hsl(var(--text-dim))]">
              <span>Материалы (розн.)</span>
              <span className="font-mono">{fmt(totals.rawMaterials)} {currency}</span>
            </div>
            <div className="flex justify-between text-[hsl(var(--text-dim))]">
              <span>Услуги (розн.)</span>
              <span className="font-mono">{fmt(totals.rawServices)} {currency}</span>
            </div>
            {totals.blockExtraTotal > 0 && (
              <div className="flex justify-between text-gold">
                <span>Надбавки на блоки</span>
                <span className="font-mono">+{fmt(totals.blockExtraTotal)} {currency}</span>
              </div>
            )}
            {totals.totalMarkupAmount > 0 && (
              <div className="flex justify-between text-gold">
                <span>Надбавка на итог ({totals.totalMarkupPct}%)</span>
                <span className="font-mono">+{fmt(totals.totalMarkupAmount)} {currency}</span>
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
            <div className="border-t border-border mt-2 pt-2 space-y-1">
              <div className="flex justify-between text-xs text-[hsl(var(--text-muted))]">
                <span>Наценка на материалы/услуги заложена в розничные цены строк</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Итого с расходами</span>
                <span className="font-mono text-gold">{fmt(totals.grandTotal)} {currency}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
