import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { useClients } from './useClients';
import { CLIENT_STATUSES, clientFullName, emptyClient } from './types';
import type { Client, ClientStatus } from './types';
import ClientCard from './ClientCard';
import { ClientsListSkeleton } from '@/components/Skeleton';
import { ClientRow, KanbanColumn } from './list/ClientListItems';
import { ClientsToolbar } from './list/ClientsToolbar';
import { ClientsSearchBar, ClientsAdvancedFilters, ClientsCounter } from './list/ClientsFilters';

type View = 'list' | 'kanban';
type SortField = 'name' | 'created_at' | 'delivery_date' | 'total_amount';
type SortDir = 'asc' | 'desc';

export default function ClientsPage({ openClientId }: { openClientId?: string | null }) {
  const { clients, loading, loadAll: load, createClient, updateStatus } = useClients();
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

  const designers = useMemo(() => [...new Set(clients.map(c => c.designer).filter(Boolean))], [clients]);
  const measurers = useMemo(() => [...new Set(clients.map(c => c.measurer).filter(Boolean))], [clients]);

  const hasAdvancedFilters = !!(filterDesigner || filterMeasurer || filterDateFrom || filterDateTo || filterDeliveryFrom || filterDeliveryTo || filterAmountMin || filterAmountMax);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'total_amount' || field === 'created_at' ? 'desc' : 'asc'); }
    setShowSortMenu(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const amountMin = filterAmountMin ? parseFloat(filterAmountMin) : null;
    const amountMax = filterAmountMax ? parseFloat(filterAmountMax) : null;
    let list = clients.filter(c => {
      const name = clientFullName(c).toLowerCase();
      // Поиск по имени, телефону (основной + доп.), номеру договора
      if (q && !name.includes(q) && !c.phone?.includes(q) && !c.phone2?.includes(q) && !c.contract_number?.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterDesigner && c.designer !== filterDesigner) return false;
      if (filterMeasurer && c.measurer !== filterMeasurer) return false;
      // Дата создания: сравниваем ISO-строки (YYYY-MM-DD prefix всегда первый)
      if (filterDateFrom && (c.created_at?.slice(0, 10) || '') < filterDateFrom) return false;
      if (filterDateTo && (c.created_at?.slice(0, 10) || '') > filterDateTo) return false;
      // Дата доставки: включаем обе граничные даты
      if (filterDeliveryFrom && c.delivery_date && c.delivery_date < filterDeliveryFrom) return false;
      if (filterDeliveryTo && c.delivery_date && c.delivery_date > filterDeliveryTo) return false;
      // Сумма: только если числа валидны
      if (amountMin !== null && !isNaN(amountMin) && c.total_amount < amountMin) return false;
      if (amountMax !== null && !isNaN(amountMax) && c.total_amount > amountMax) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (sortField === 'name') { va = clientFullName(a); vb = clientFullName(b); }
      else if (sortField === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else if (sortField === 'delivery_date') { va = a.delivery_date || '9999'; vb = b.delivery_date || '9999'; }
      else if (sortField === 'total_amount') { va = a.total_amount; vb = b.total_amount; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [clients, search, filterStatus, filterDesigner, filterMeasurer, filterDateFrom, filterDateTo, filterDeliveryFrom, filterDeliveryTo, filterAmountMin, filterAmountMax, sortField, sortDir]);

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const handleBulkStatus = async (status: ClientStatus) => {
    setBulkLoading(true);
    for (const id of selectedIds) { await updateStatus(id, status); }
    setSelectedIds(new Set());
    setShowBulkMenu(false);
    setBulkLoading(false);
    load();
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

  if (loading && clients.length === 0) return <ClientsListSkeleton />;

  if (selectedId) {
    return <ClientCard clientId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const showCounter = !!(search || filterStatus !== 'all' || hasAdvancedFilters || selectedIds.size > 0) && !loading;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ClientsToolbar
        clientsCount={clients.length}
        loading={loading}
        view={view}
        onViewChange={setView}
        filteredClients={filtered}
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
          designers={designers} measurers={measurers}
          hasAdvancedFilters={hasAdvancedFilters}
          onClearFilters={clearFilters}
        />
      )}

      <ClientsCounter
        totalCount={clients.length}
        filteredCount={filtered.length}
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
        {filtered.length === 0 ? (
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
            {/* Select all */}
            <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-[hsl(220,14%,10%)]">
              <div onClick={toggleSelectAll} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-gold border-gold' : 'border-border hover:border-gold/50'}`}>
                {selectedIds.size === filtered.length && filtered.length > 0 && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                {selectedIds.size > 0 && selectedIds.size < filtered.length && <Icon name="Minus" size={10} className="text-gold" />}
              </div>
              <span className="text-xs text-[hsl(var(--text-muted))]">Выбрать все ({filtered.length})</span>
            </div>
            {filtered.map(c => (
              <ClientRow key={c.id} client={c}
                selected={selectedIds.has(c.id)}
                onSelect={e => toggleSelect(e, c.id)}
                onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        ) : (
          <div className="p-3 md:p-6 flex gap-3 md:gap-4 overflow-x-auto">
            {CLIENT_STATUSES.map(s => (
              <KanbanColumn key={s.id} status={s} clients={filtered.filter(c => c.status === s.id)} onClient={c => setSelectedId(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}