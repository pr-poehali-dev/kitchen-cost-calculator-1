import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { useClients } from './useClients';
import { CLIENT_STATUSES, clientFullName, emptyClient } from './types';
import type { Client, ClientStatus } from './types';
import ClientCard from './ClientCard';
import { ClientsListSkeleton } from '@/components/Skeleton';
import * as XLSX from 'xlsx';

type View = 'list' | 'kanban';
type SortField = 'name' | 'created_at' | 'delivery_date' | 'total_amount';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT_STATUSES.find(x => x.id === status);
  if (!s) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: s.color + '22', color: s.color }}>
      {s.label}
    </span>
  );
}

function DeliveryBadge({ date }: { date: string }) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  let label = '', cls = '';
  if (diff < 0) { label = `${Math.abs(diff)} дн. назад`; cls = 'text-red-400'; }
  else if (diff === 0) { label = 'Сегодня'; cls = 'text-amber-400 font-semibold'; }
  else if (diff <= 3) { label = `через ${diff} дн.`; cls = 'text-amber-400'; }
  else if (diff <= 14) { label = `через ${diff} дн.`; cls = 'text-emerald-400'; }
  else { label = date; cls = 'text-[hsl(var(--text-muted))]'; }
  return <span className={`flex items-center gap-1 text-xs ${cls}`}><Icon name="Truck" size={11} />{label}</span>;
}

function ClientRow({ client, selected, onSelect, onClick }: {
  client: Client; selected: boolean;
  onSelect: (e: React.MouseEvent) => void; onClick: () => void;
}) {
  const name = clientFullName(client);
  const hasReminder = client.reminder_date && client.reminder_date >= new Date().toISOString().slice(0, 10);
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 border-b border-border cursor-pointer transition-colors group ${selected ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,13%)]'}`}
    >
      {/* Checkbox */}
      <div
        onClick={onSelect}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-gold border-gold' : 'border-border hover:border-gold/50'}`}
      >
        {selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
      </div>
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0" onClick={onClick}>
        <span className="text-gold text-xs font-bold">{(client.last_name?.[0] || client.first_name?.[0] || '?').toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="text-sm font-medium text-foreground truncate">{name}</div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex items-center gap-2">
          {client.phone && <span>{client.phone}</span>}
          {client.contract_number && <span>№{client.contract_number}</span>}
          {client.designer && <span className="text-[hsl(var(--text-muted))]">· {client.designer}</span>}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0" onClick={onClick}>
        {client.total_amount > 0 && <span className="text-sm font-medium text-foreground">{client.total_amount.toLocaleString('ru')} ₽</span>}
        {hasReminder && <div title={`Напоминание: ${client.reminder_date}`}><Icon name="Bell" size={14} className="text-amber-400" /></div>}
        <StatusBadge status={client.status as ClientStatus} />
        <DeliveryBadge date={client.delivery_date} />
      </div>
      <Icon name="ChevronRight" size={14} className="text-[hsl(var(--text-muted))] group-hover:text-gold transition-colors shrink-0" onClick={onClick} />
    </div>
  );
}

function KanbanColumn({ status, clients, onClient }: {
  status: typeof CLIENT_STATUSES[0]; clients: Client[]; onClient: (c: Client) => void;
}) {
  return (
    <div className="flex flex-col min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
        <span className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{status.label}</span>
        <span className="ml-auto text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded-full px-1.5 py-0.5">{clients.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {clients.map(c => (
          <div key={c.id} onClick={() => onClient(c)}
            className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-3 cursor-pointer hover:border-gold/40 transition-colors">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-gold text-[10px] font-bold">{(c.last_name?.[0] || c.first_name?.[0] || '?').toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground leading-tight">{clientFullName(c)}</div>
                {c.phone && <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">{c.phone}</div>}
              </div>
            </div>
            {c.total_amount > 0 && <div className="mt-2 text-xs font-semibold text-gold">{c.total_amount.toLocaleString('ru')} ₽</div>}
            {c.delivery_date && <div className="mt-1.5"><DeliveryBadge date={c.delivery_date} /></div>}
            {c.reminder_date && c.reminder_date >= new Date().toISOString().slice(0, 10) && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400"><Icon name="Bell" size={10} />{c.reminder_date}</div>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-4 text-center text-[11px] text-[hsl(var(--text-muted))]">Нет клиентов</div>
        )}
      </div>
    </div>
  );
}

const SORT_LABELS: Record<SortField, string> = {
  name: 'Имя', created_at: 'Дата создания', delivery_date: 'Доставка', total_amount: 'Сумма',
};

function exportCSV(clients: Client[]) {
  const headers = ['Имя', 'Телефон', 'Статус', 'Дизайнер', 'Замерщик', 'Договор №', 'Сумма', 'Дата доставки', 'Дата создания'];
  const rows = clients.map(c => [
    clientFullName(c),
    c.phone || '',
    CLIENT_STATUSES.find(s => s.id === c.status)?.label || c.status,
    c.designer || '',
    c.measurer || '',
    c.contract_number || '',
    c.total_amount ? String(c.total_amount) : '',
    c.delivery_date || '',
    c.created_at?.slice(0, 10) || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `clients_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

function exportExcel(clients: Client[]) {
  const headers = ['Имя', 'Телефон', 'Доп. телефон', 'Email', 'Статус', 'Дизайнер', 'Замерщик',
    'Договор №', 'Дата договора', 'Сумма', 'Схема оплаты', 'Внесено', 'Остаток',
    'Дата доставки', 'Город доставки', 'Адрес доставки',
    'Комментарий', 'Дата создания'];
  const rows = clients.map(c => [
    clientFullName(c),
    c.phone || '',
    c.phone2 || '',
    c.email || '',
    CLIENT_STATUSES.find(s => s.id === c.status)?.label || c.status,
    c.designer || '',
    c.measurer || '',
    c.contract_number || '',
    c.contract_date || '',
    c.total_amount || 0,
    c.payment_type || '',
    c.prepaid_amount || 0,
    Math.max(0, (c.total_amount || 0) - (c.prepaid_amount || 0)),
    c.delivery_date || '',
    c.delivery_city || '',
    [c.delivery_street, c.delivery_house, c.delivery_apt ? `кв.${c.delivery_apt}` : ''].filter(Boolean).join(', '),
    c.comment || '',
    c.created_at?.slice(0, 10) || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Ширина колонок
  ws['!cols'] = [22,16,14,22,14,14,14,14,14,12,18,12,12,14,16,24,30,14].map(w => ({ wch: w }));
  // Стиль заголовка (жирный)
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3E6C8' } } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Клиенты');
  XLSX.writeFile(wb, `clients_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export default function ClientsPage() {
  const { clients, loading, load, createClient, updateStatus } = useClients();
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const hasAdvancedFilters = filterDesigner || filterMeasurer || filterDateFrom || filterDateTo || filterDeliveryFrom || filterDeliveryTo || filterAmountMin || filterAmountMax;

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

  const INP = 'bg-[hsl(220,12%,14%)] border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors';

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center gap-4 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground">Клиенты</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">
            {loading ? 'Загрузка...' : `${clients.length} клиентов`}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[hsl(220,12%,14%)] rounded p-0.5">
          <button onClick={() => setView('list')} className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'list' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
            <Icon name="List" size={13} />
          </button>
          <button onClick={() => setView('kanban')} className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'kanban' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
            <Icon name="Columns3" size={13} />
          </button>
        </div>
        {/* Экспорт */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportExcel(filtered)}
            title="Экспорт в Excel (.xlsx)"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-400/50 transition-colors"
          >
            <Icon name="FileSpreadsheet" size={13} /> Excel
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            title="Экспорт в CSV"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/50 transition-colors"
          >
            <Icon name="FileDown" size={13} /> CSV
          </button>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0 disabled:opacity-60">
          <Icon name="Plus" size={14} /> Новый клиент
        </button>
      </div>

      {/* Filters row */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3 shrink-0 bg-[hsl(220,16%,7%)]">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-8 pr-3 py-1.5 text-sm outline-none focus:border-gold transition-colors"
            placeholder="Поиск по имени, телефону..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={12} /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <button onClick={() => setFilterStatus('all')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-gold/20 text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>Все</button>
          {CLIENT_STATUSES.map(s => (
            <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === s.id ? 'text-white' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
              style={filterStatus === s.id ? { background: s.color } : {}}>
              {s.label}
            </button>
          ))}
        </div>
        {/* Кнопка расширенных фильтров */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors shrink-0 ${(showFilters || hasAdvancedFilters) ? 'border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
        >
          <Icon name="SlidersHorizontal" size={13} />
          Фильтры
          {hasAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
        </button>
        {/* Сортировка */}
        <div className="relative shrink-0">
          <button onClick={() => setShowSortMenu(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${showSortMenu ? 'border-gold/50 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
            <Icon name={sortDir === 'asc' ? 'ArrowUpAZ' : 'ArrowDownAZ'} size={13} />{SORT_LABELS[sortField]}
          </button>
          {showSortMenu && (<>
            <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
              {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
                <button key={f} onClick={() => handleSort(f)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[hsl(220,12%,18%)] transition-colors ${sortField === f ? 'text-gold' : 'text-[hsl(var(--text-dim))]'}`}>
                  {SORT_LABELS[f]}
                  {sortField === f && <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={11} />}
                </button>
              ))}
            </div>
          </>)}
        </div>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className="border-b border-border px-6 py-3 bg-[hsl(220,14%,10%)] shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Дизайнер */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[hsl(var(--text-muted))]">Дизайнер:</span>
              <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className={INP}>
                <option value="">Все</option>
                {designers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Замерщик */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[hsl(var(--text-muted))]">Замерщик:</span>
              <select value={filterMeasurer} onChange={e => setFilterMeasurer(e.target.value)} className={INP}>
                <option value="">Все</option>
                {measurers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Дата создания */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[hsl(var(--text-muted))]">Создан:</span>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={INP} />
              <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={INP} />
            </div>
            {/* Дата доставки */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[hsl(var(--text-muted))]">Доставка:</span>
              <input type="date" value={filterDeliveryFrom} onChange={e => setFilterDeliveryFrom(e.target.value)} className={INP} />
              <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
              <input type="date" value={filterDeliveryTo} onChange={e => setFilterDeliveryTo(e.target.value)} className={INP} />
            </div>
            {/* Сумма */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[hsl(var(--text-muted))]">Сумма:</span>
              <input type="number" placeholder="от" value={filterAmountMin} onChange={e => setFilterAmountMin(e.target.value)} className={INP + ' w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'} />
              <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
              <input type="number" placeholder="до" value={filterAmountMax} onChange={e => setFilterAmountMax(e.target.value)} className={INP + ' w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'} />
            </div>
            {hasAdvancedFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
                <Icon name="X" size={12} /> Сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Счётчик + мультиселект панель */}
      {(search || filterStatus !== 'all' || hasAdvancedFilters || selectedIds.size > 0) && !loading && (
        <div className="px-6 py-2 text-xs bg-[hsl(220,16%,7%)] border-b border-border shrink-0 flex items-center justify-between gap-3">
          <span className="text-[hsl(var(--text-muted))]">
            Найдено: <span className="text-foreground font-medium">{filtered.length}</span> из {clients.length}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{selectedIds.size} выбрано</span>
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(v => !v)}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {bulkLoading ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Tag" size={11} />}
                  Изменить статус
                </button>
                {showBulkMenu && (<>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl py-1 min-w-[160px]">
                    {CLIENT_STATUSES.map(s => (
                      <button key={s.id} onClick={() => handleBulkStatus(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[hsl(220,12%,18%)] transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>)}
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
                <Icon name="X" size={13} />
              </button>
            </div>
          )}
        </div>
      )}

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
          <div className="p-6 flex gap-4 overflow-x-auto">
            {CLIENT_STATUSES.map(s => (
              <KanbanColumn key={s.id} status={s} clients={filtered.filter(c => c.status === s.id)} onClient={c => setSelectedId(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}