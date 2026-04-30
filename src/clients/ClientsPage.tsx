import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useClients, PER_PAGE } from './useClients';
import type { ClientsFilter } from './useClients';
import { CLIENT_STATUSES, clientFullName, emptyClient } from './types';
import type { Client, ClientStatus } from './types';
import ClientCard from './ClientCard';
import { ClientsListSkeleton } from '@/components/Skeleton';
import { ClientRow, KanbanColumn } from './list/ClientListItems';
import { ClientsToolbar } from './list/ClientsToolbar';
import { ClientsSearchBar, ClientsAdvancedFilters, ClientsCounter } from './list/ClientsFilters';
import ClientsPagination from './list/ClientsPagination';

type View = 'list' | 'kanban';
type SortField = 'name' | 'created_at' | 'delivery_date' | 'total_amount';
type SortDir = 'asc' | 'desc';

export default function ClientsPage({ openClientId }: { openClientId?: string | null }) {
  const { clients, total, pages, page, loading, fetchClients, loadAll, createClient, updateStatus } = useClients();
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(openClientId ?? null);
  const [creating, setCreating] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Мультиселект
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Расширенные фильтры
  const [filterDesigner, setFilterDesigner] = useState('');
  const [filterMeasurer, setFilterMeasurer] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDeliveryFrom, setFilterDeliveryFrom] = useState('');
  const [filterDeliveryTo, setFilterDeliveryTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');

  // Списки дизайнеров/замерщиков из всех загруженных клиентов
  const [allDesigners, setAllDesigners] = useState<string[]>([]);
  const [allMeasurers, setAllMeasurers] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAdvancedFilters = !!(filterDesigner || filterMeasurer || filterDateFrom || filterDateTo || filterDeliveryFrom || filterDeliveryTo || filterAmountMin || filterAmountMax);

  const buildFilter = useCallback((): ClientsFilter => {
    const sortMap: Record<SortField, string> = {
      name: 'last_name',
      created_at: 'created_at',
      delivery_date: 'delivery_date',
      total_amount: 'total_amount',
    };
    return {
      q: search || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      designer: filterDesigner || undefined,
      measurer: filterMeasurer || undefined,
      date_from: filterDateFrom || undefined,
      date_to: filterDateTo || undefined,
      delivery_from: filterDeliveryFrom || undefined,
      delivery_to: filterDeliveryTo || undefined,
      amount_min: filterAmountMin || undefined,
      amount_max: filterAmountMax || undefined,
      sort: sortMap[sortField],
      sort_dir: sortDir,
    };
  }, [search, filterStatus, filterDesigner, filterMeasurer, filterDateFrom, filterDateTo, filterDeliveryFrom, filterDeliveryTo, filterAmountMin, filterAmountMax, sortField, sortDir]);

  // Дебаунс загрузки при изменении фильтров
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (view === 'kanban') {
        loadAll(buildFilter());
      } else {
        fetchClients(buildFilter(), 1);
      }
      setSelectedIds(new Set());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [buildFilter, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обновляем списки дизайнеров и замерщиков из текущей загрузки
  useEffect(() => {
    const designers = [...new Set(clients.map(c => c.designer).filter(Boolean))];
    const measurers = [...new Set(clients.map(c => c.measurer).filter(Boolean))];
    if (designers.length > 0) setAllDesigners(prev => [...new Set([...prev, ...designers])]);
    if (measurers.length > 0) setAllMeasurers(prev => [...new Set([...prev, ...measurers])]);
  }, [clients]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'total_amount' || field === 'created_at' ? 'desc' : 'asc'); }
    setShowSortMenu(false);
  };

  const handlePage = (p: number) => {
    fetchClients(buildFilter(), p);
    setSelectedIds(new Set());
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length && clients.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map(c => c.id)));
  };

  const handleBulkStatus = async (status: ClientStatus) => {
    setBulkLoading(true);
    for (const id of selectedIds) { await updateStatus(id, status); }
    setSelectedIds(new Set());
    setShowBulkMenu(false);
    setBulkLoading(false);
    fetchClients(buildFilter(), page);
  };

  const clearFilters = () => {
    setFilterDesigner(''); setFilterMeasurer('');
    setFilterDateFrom(''); setFilterDateTo('');
    setFilterDeliveryFrom(''); setFilterDeliveryTo('');
    setFilterAmountMin(''); setFilterAmountMax('');
  };

  const handleCreate = async () => {
    setCreating(true);
    const id = await createClient(emptyClient());
    setCreating(false);
    if (id) setSelectedId(id);
  };

  // Для канбана клиенты уже загружены через loadAll без пагинации
  const kanbanClients = clients;

  // Для экспорта нужен весь список — передаём текущие клиенты
  const filteredForExport = useMemo(() => clients, [clients]);

  if (loading && clients.length === 0) return <ClientsListSkeleton />;

  if (selectedId) {
    return <ClientCard clientId={selectedId} onBack={() => { setSelectedId(null); fetchClients(buildFilter(), page); }} />;
  }

  const showCounter = !!(search || filterStatus !== 'all' || hasAdvancedFilters || selectedIds.size > 0) && !loading;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ClientsToolbar
        clientsCount={total}
        loading={loading}
        view={view}
        onViewChange={(v) => { setView(v); }}
        filteredClients={filteredForExport}
        creating={creating}
        onCreate={handleCreate}
      />

      <ClientsSearchBar
        search={search}
        onSearchChange={setSearch}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        hasAdvancedFilters={hasAdvancedFilters}
        sortField={sortField}
        sortDir={sortDir}
        showSortMenu={showSortMenu}
        onToggleSortMenu={() => setShowSortMenu(v => !v)}
        onCloseSortMenu={() => setShowSortMenu(false)}
        onSort={handleSort}
      />

      {showFilters && (
        <ClientsAdvancedFilters
          filterDesigner={filterDesigner} onFilterDesignerChange={setFilterDesigner}
          filterMeasurer={filterMeasurer} onFilterMeasurerChange={setFilterMeasurer}
          filterDateFrom={filterDateFrom} onFilterDateFromChange={setFilterDateFrom}
          filterDateTo={filterDateTo} onFilterDateToChange={setFilterDateTo}
          filterDeliveryFrom={filterDeliveryFrom} onFilterDeliveryFromChange={setFilterDeliveryFrom}
          filterDeliveryTo={filterDeliveryTo} onFilterDeliveryToChange={setFilterDeliveryTo}
          filterAmountMin={filterAmountMin} onFilterAmountMinChange={setFilterAmountMin}
          filterAmountMax={filterAmountMax} onFilterAmountMaxChange={setFilterAmountMax}
          designers={allDesigners} measurers={allMeasurers}
          hasAdvancedFilters={hasAdvancedFilters}
          onClearFilters={clearFilters}
        />
      )}

      <ClientsCounter
        totalCount={total}
        filteredCount={clients.length}
        showCounter={showCounter}
        selectedIds={selectedIds}
        showBulkMenu={showBulkMenu}
        bulkLoading={bulkLoading}
        onToggleBulkMenu={() => setShowBulkMenu(v => !v)}
        onCloseBulkMenu={() => setShowBulkMenu(false)}
        onBulkStatus={handleBulkStatus}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {clients.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Icon name="Users" size={32} className="text-[hsl(var(--text-muted))]" />
            <p className="text-[hsl(var(--text-muted))] text-sm">{search || filterStatus !== 'all' || hasAdvancedFilters ? 'Нет клиентов по фильтру' : 'Нет клиентов. Создайте первого!'}</p>
            {!search && filterStatus === 'all' && !hasAdvancedFilters && (
              <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                <Icon name="Plus" size={14} /> Новый клиент
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <div>
            <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-[hsl(220,14%,10%)]">
              <div onClick={toggleSelectAll} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedIds.size === clients.length && clients.length > 0 ? 'bg-gold border-gold' : 'border-border hover:border-gold/50'}`}>
                {selectedIds.size === clients.length && clients.length > 0 && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                {selectedIds.size > 0 && selectedIds.size < clients.length && <Icon name="Minus" size={10} className="text-gold" />}
              </div>
              <span className="text-xs text-[hsl(var(--text-muted))]">Выбрать все ({clients.length})</span>
            </div>
            {clients.map(c => (
              <ClientRow key={c.id} client={c}
                selected={selectedIds.has(c.id)}
                onSelect={e => toggleSelect(e, c.id)}
                onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        ) : (
          <div className="p-3 md:p-6 flex gap-3 md:gap-4 overflow-x-auto">
            {CLIENT_STATUSES.map(s => (
              <KanbanColumn key={s.id} status={s} clients={kanbanClients.filter(c => c.status === s.id)} onClient={c => setSelectedId(c.id)} />
            ))}
          </div>
        )}
      </div>

      {view === 'list' && (
        <ClientsPagination
          page={page}
          pages={pages}
          total={total}
          perPage={PER_PAGE}
          loading={loading}
          onPage={handlePage}
        />
      )}
    </div>
  );
}
