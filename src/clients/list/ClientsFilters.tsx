import Icon from '@/components/ui/icon';
import { CLIENT_STATUSES } from '../types';
import type { Client, ClientStatus } from '../types';

type SortField = 'name' | 'created_at' | 'delivery_date' | 'total_amount';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortField, string> = {
  name: 'Имя', created_at: 'Дата создания', delivery_date: 'Доставка', total_amount: 'Сумма',
};

const INP = 'bg-[hsl(220,12%,14%)] border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors';

interface FiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: ClientStatus | 'all';
  onFilterStatusChange: (v: ClientStatus | 'all') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasAdvancedFilters: boolean;
  // Сортировка
  sortField: SortField;
  sortDir: SortDir;
  showSortMenu: boolean;
  onToggleSortMenu: () => void;
  onCloseSortMenu: () => void;
  onSort: (f: SortField) => void;
  // Расширенные фильтры
  filterDesigner: string;
  onFilterDesignerChange: (v: string) => void;
  filterMeasurer: string;
  onFilterMeasurerChange: (v: string) => void;
  filterDateFrom: string;
  onFilterDateFromChange: (v: string) => void;
  filterDateTo: string;
  onFilterDateToChange: (v: string) => void;
  filterDeliveryFrom: string;
  onFilterDeliveryFromChange: (v: string) => void;
  filterDeliveryTo: string;
  onFilterDeliveryToChange: (v: string) => void;
  filterAmountMin: string;
  onFilterAmountMinChange: (v: string) => void;
  filterAmountMax: string;
  onFilterAmountMaxChange: (v: string) => void;
  designers: string[];
  measurers: string[];
  onClearFilters: () => void;
}

interface CounterProps {
  totalCount: number;
  filteredCount: number;
  showCounter: boolean;
  selectedIds: Set<string>;
  showBulkMenu: boolean;
  bulkLoading: boolean;
  onToggleBulkMenu: () => void;
  onCloseBulkMenu: () => void;
  onBulkStatus: (status: ClientStatus) => void;
  onClearSelection: () => void;
}

// ── Строка поиска + статусы + сортировка ────────────────────────
export function ClientsSearchBar({
  search, onSearchChange,
  filterStatus, onFilterStatusChange,
  showFilters, onToggleFilters, hasAdvancedFilters,
  sortField, sortDir, showSortMenu, onToggleSortMenu, onCloseSortMenu, onSort,
}: Pick<FiltersProps,
  'search' | 'onSearchChange' |
  'filterStatus' | 'onFilterStatusChange' |
  'showFilters' | 'onToggleFilters' | 'hasAdvancedFilters' |
  'sortField' | 'sortDir' | 'showSortMenu' | 'onToggleSortMenu' | 'onCloseSortMenu' | 'onSort'
>) {
  return (
    <div className="border-b border-border px-6 py-3 flex items-center gap-3 shrink-0 bg-[hsl(220,16%,7%)]">
      <div className="relative flex-1 max-w-xs">
        <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
        <input className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-8 pr-3 py-1.5 text-sm outline-none focus:border-gold transition-colors"
          placeholder="Поиск по имени, телефону..." value={search} onChange={e => onSearchChange(e.target.value)} />
        {search && <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={12} /></button>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        <button onClick={() => onFilterStatusChange('all')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-gold/20 text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>Все</button>
        {CLIENT_STATUSES.map(s => (
          <button key={s.id} onClick={() => onFilterStatusChange(filterStatus === s.id ? 'all' : s.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === s.id ? 'text-white' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            style={filterStatus === s.id ? { background: s.color } : {}}>
            {s.label}
          </button>
        ))}
      </div>
      {/* Кнопка расширенных фильтров */}
      <button
        onClick={onToggleFilters}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors shrink-0 ${(showFilters || hasAdvancedFilters) ? 'border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
      >
        <Icon name="SlidersHorizontal" size={13} />
        Фильтры
        {hasAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
      </button>
      {/* Сортировка */}
      <div className="relative shrink-0">
        <button onClick={onToggleSortMenu}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${showSortMenu ? 'border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
          <Icon name={sortDir === 'asc' ? 'ArrowUpAZ' : 'ArrowDownAZ'} size={13} />{SORT_LABELS[sortField]}
        </button>
        {showSortMenu && (<>
          <div className="fixed inset-0 z-10" onClick={onCloseSortMenu} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
            {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
              <button key={f} onClick={() => onSort(f)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[hsl(220,12%,18%)] transition-colors ${sortField === f ? 'text-gold' : 'text-[hsl(var(--text-dim))]'}`}>
                {SORT_LABELS[f]}
                {sortField === f && <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={11} />}
              </button>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Расширенные фильтры ─────────────────────────────────────────
export function ClientsAdvancedFilters({
  filterDesigner, onFilterDesignerChange,
  filterMeasurer, onFilterMeasurerChange,
  filterDateFrom, onFilterDateFromChange,
  filterDateTo, onFilterDateToChange,
  filterDeliveryFrom, onFilterDeliveryFromChange,
  filterDeliveryTo, onFilterDeliveryToChange,
  filterAmountMin, onFilterAmountMinChange,
  filterAmountMax, onFilterAmountMaxChange,
  designers, measurers,
  hasAdvancedFilters, onClearFilters,
}: Pick<FiltersProps,
  'filterDesigner' | 'onFilterDesignerChange' |
  'filterMeasurer' | 'onFilterMeasurerChange' |
  'filterDateFrom' | 'onFilterDateFromChange' |
  'filterDateTo' | 'onFilterDateToChange' |
  'filterDeliveryFrom' | 'onFilterDeliveryFromChange' |
  'filterDeliveryTo' | 'onFilterDeliveryToChange' |
  'filterAmountMin' | 'onFilterAmountMinChange' |
  'filterAmountMax' | 'onFilterAmountMaxChange' |
  'designers' | 'measurers' | 'hasAdvancedFilters' | 'onClearFilters'
>) {
  return (
    <div className="border-b border-border px-6 py-3 bg-[hsl(220,14%,10%)] shrink-0">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[hsl(var(--text-muted))]">Дизайнер:</span>
          <select value={filterDesigner} onChange={e => onFilterDesignerChange(e.target.value)} className={INP}>
            <option value="">Все</option>
            {designers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[hsl(var(--text-muted))]">Замерщик:</span>
          <select value={filterMeasurer} onChange={e => onFilterMeasurerChange(e.target.value)} className={INP}>
            <option value="">Все</option>
            {measurers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[hsl(var(--text-muted))]">Создан:</span>
          <input type="date" value={filterDateFrom} onChange={e => onFilterDateFromChange(e.target.value)} className={INP} />
          <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
          <input type="date" value={filterDateTo} onChange={e => onFilterDateToChange(e.target.value)} className={INP} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[hsl(var(--text-muted))]">Доставка:</span>
          <input type="date" value={filterDeliveryFrom} onChange={e => onFilterDeliveryFromChange(e.target.value)} className={INP} />
          <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
          <input type="date" value={filterDeliveryTo} onChange={e => onFilterDeliveryToChange(e.target.value)} className={INP} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[hsl(var(--text-muted))]">Сумма:</span>
          <input type="number" placeholder="от" value={filterAmountMin} onChange={e => onFilterAmountMinChange(e.target.value)} className={INP + ' w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'} />
          <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
          <input type="number" placeholder="до" value={filterAmountMax} onChange={e => onFilterAmountMaxChange(e.target.value)} className={INP + ' w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'} />
        </div>
        {hasAdvancedFilters && (
          <button onClick={onClearFilters} className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
            <Icon name="X" size={12} /> Сбросить
          </button>
        )}
      </div>
    </div>
  );
}

// ── Счётчик результатов + панель мультиселекта ──────────────────
export function ClientsCounter({
  totalCount, filteredCount, showCounter,
  selectedIds,
  showBulkMenu, bulkLoading,
  onToggleBulkMenu, onCloseBulkMenu, onBulkStatus, onClearSelection,
}: CounterProps) {
  if (!showCounter) return null;
  return (
    <div className="px-6 py-2 text-xs bg-[hsl(220,16%,7%)] border-b border-border shrink-0 flex items-center justify-between gap-3">
      <span className="text-[hsl(var(--text-muted))]">
        Найдено: <span className="text-foreground font-medium">{filteredCount}</span> из {totalCount}
      </span>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">{selectedIds.size} выбрано</span>
          <div className="relative">
            <button
              onClick={onToggleBulkMenu}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90 disabled:opacity-60"
            >
              {bulkLoading ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Tag" size={11} />}
              Изменить статус
            </button>
            {showBulkMenu && (<>
              <div className="fixed inset-0 z-10" onClick={onCloseBulkMenu} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
                {CLIENT_STATUSES.map(s => (
                  <button key={s.id} onClick={() => onBulkStatus(s.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(220,12%,18%)] transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </>)}
          </div>
          <button onClick={onClearSelection} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            <Icon name="X" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}