import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useClients } from './useClients';
import { CLIENT_STATUSES, clientFullName, emptyClient } from './types';
import type { Client, ClientStatus } from './types';
import ClientCard from './ClientCard';

type View = 'list' | 'kanban';

function StatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT_STATUSES.find(x => x.id === status);
  if (!s) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: s.color + '22', color: s.color }}>
      {s.label}
    </span>
  );
}

function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  const name = clientFullName(client);
  const hasReminder = client.reminder_date && client.reminder_date >= new Date().toISOString().slice(0, 10);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-3.5 border-b border-border hover:bg-[hsl(220,12%,13%)] cursor-pointer transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
        <span className="text-gold text-xs font-bold">
          {(client.last_name?.[0] || client.first_name?.[0] || '?').toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{name}</div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex items-center gap-2">
          {client.phone && <span>{client.phone}</span>}
          {client.contract_number && <span>№{client.contract_number}</span>}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {client.total_amount > 0 && (
          <span className="text-sm font-medium text-foreground">
            {client.total_amount.toLocaleString('ru')} ₽
          </span>
        )}
        {hasReminder && (
          <div title={`Напоминание: ${client.reminder_date}`}>
            <Icon name="Bell" size={14} className="text-amber-400" />
          </div>
        )}
        <StatusBadge status={client.status as ClientStatus} />
        {client.delivery_date && (
          <span className="text-xs text-[hsl(var(--text-muted))]">
            <Icon name="Calendar" size={11} className="inline mr-1" />
            {client.delivery_date}
          </span>
        )}
      </div>
      <Icon name="ChevronRight" size={14} className="text-[hsl(var(--text-muted))] group-hover:text-gold transition-colors shrink-0" />
    </div>
  );
}

function KanbanColumn({ status, clients, onClient }: {
  status: typeof CLIENT_STATUSES[0];
  clients: Client[];
  onClient: (c: Client) => void;
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
          <div
            key={c.id}
            onClick={() => onClient(c)}
            className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-3 cursor-pointer hover:border-gold/40 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-gold text-[10px] font-bold">
                  {(c.last_name?.[0] || c.first_name?.[0] || '?').toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground leading-tight">{clientFullName(c)}</div>
                {c.phone && <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">{c.phone}</div>}
              </div>
            </div>
            {c.total_amount > 0 && (
              <div className="mt-2 text-xs font-semibold text-gold">{c.total_amount.toLocaleString('ru')} ₽</div>
            )}
            {c.delivery_date && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[hsl(var(--text-muted))]">
                <Icon name="Calendar" size={10} />
                {c.delivery_date}
              </div>
            )}
            {c.reminder_date && c.reminder_date >= new Date().toISOString().slice(0, 10) && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                <Icon name="Bell" size={10} />
                {c.reminder_date}
              </div>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-4 text-center text-[11px] text-[hsl(var(--text-muted))]">
            Нет клиентов
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { clients, loading, load, createClient } = useClients();
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = clients.filter(c => {
    const name = clientFullName(c).toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || c.phone.includes(q) || c.contract_number.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    setCreating(true);
    const id = await createClient(emptyClient());
    setCreating(false);
    if (id) setSelectedId(id);
  };

  if (selectedId) {
    return (
      <ClientCard
        clientId={selectedId}
        onBack={() => { setSelectedId(null); load(); }}
      />
    );
  }

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
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[hsl(220,12%,14%)] rounded p-0.5">
          <button
            onClick={() => setView('list')}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'list' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
          >
            <Icon name="List" size={13} />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'kanban' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
          >
            <Icon name="Columns3" size={13} />
          </button>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0 disabled:opacity-60"
        >
          <Icon name="Plus" size={14} />
          Новый клиент
        </button>
      </div>

      {/* Filters */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-3 shrink-0 bg-[hsl(220,16%,7%)]">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-8 pr-3 py-1.5 text-sm outline-none focus:border-gold transition-colors"
            placeholder="Поиск по имени, телефону..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-gold/20 text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
          >
            Все
          </button>
          {CLIENT_STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterStatus === s.id ? 'text-white' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
              style={filterStatus === s.id ? { background: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-[hsl(var(--text-muted))]">
            <Icon name="Loader2" size={18} className="animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Icon name="Users" size={32} className="text-[hsl(var(--text-muted))]" />
            <p className="text-[hsl(var(--text-muted))] text-sm">
              {search || filterStatus !== 'all' ? 'Нет клиентов по фильтру' : 'Нет клиентов. Создайте первого!'}
            </p>
            {!search && filterStatus === 'all' && (
              <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                <Icon name="Plus" size={14} /> Новый клиент
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <div>
            {filtered.map(c => (
              <ClientRow key={c.id} client={c} onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        ) : (
          <div className="p-6 flex gap-4 overflow-x-auto">
            {CLIENT_STATUSES.map(s => (
              <KanbanColumn
                key={s.id}
                status={s}
                clients={filtered.filter(c => c.status === s.id)}
                onClient={c => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
