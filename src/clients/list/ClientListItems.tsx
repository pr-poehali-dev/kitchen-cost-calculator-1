import Icon from '@/components/ui/icon';
import { CLIENT_STATUSES, clientFullName } from '../types';
import type { Client, ClientStatus } from '../types';

// ── Бейдж статуса ───────────────────────────────────────────────
export function StatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT_STATUSES.find(x => x.id === status);
  if (!s) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: s.color + '22', color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Бейдж доставки ──────────────────────────────────────────────
export function DeliveryBadge({ date }: { date: string }) {
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

// ── Строка клиента в списке ─────────────────────────────────────
export function ClientRow({ client, selected, onSelect, onClick }: {
  client: Client; selected: boolean;
  onSelect: (e: React.MouseEvent) => void; onClick: () => void;
}) {
  const name = clientFullName(client);
  const hasReminder = client.reminder_date && client.reminder_date >= new Date().toISOString().slice(0, 10);
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 border-b border-border cursor-pointer transition-colors group ${selected ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,13%)]'}`}
    >
      <div
        onClick={onSelect}
        className={`w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
          selected
            ? 'bg-gold shadow-[0_0_0_1px_hsl(var(--gold))]'
            : 'bg-[hsl(220,12%,14%)] shadow-[0_0_0_1.5px_hsl(220,12%,26%)] hover:shadow-[0_0_0_1.5px_hsl(var(--gold))]'
        }`}
      >
        {selected && <Icon name="Check" size={9} className="text-[hsl(220,16%,8%)] stroke-[3]" />}
      </div>
      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0" onClick={onClick}>
        <span className="text-gold text-xs font-bold">{(client.last_name?.[0] || client.first_name?.[0] || '?').toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium text-foreground truncate">{name}</div>
          {client.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0 rounded text-[10px] bg-gold/15 text-gold border border-gold/30 leading-5">{tag}</span>
          ))}
          {(client.tags?.length ?? 0) > 2 && (
            <span className="text-[10px] text-[hsl(var(--text-muted))]">+{(client.tags?.length ?? 0) - 2}</span>
          )}
        </div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex items-center gap-2 flex-wrap">
          {client.phone && <span>{client.phone}</span>}
          {client.contract_number && <span>№{client.contract_number}</span>}
          {client.source && <span className="text-[hsl(var(--text-muted))] opacity-70">· {client.source}</span>}
          {client.designer && <span className="text-[hsl(var(--text-muted))]">· {client.designer}</span>}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0" onClick={onClick}>
        {client.total_amount > 0 && <span className="text-sm font-medium text-foreground">{client.total_amount.toLocaleString('ru')} ₽</span>}
        {hasReminder && <div title={`Напоминание: ${client.reminder_date}`}><Icon name="Bell" size={14} className="text-amber-400" /></div>}
        <StatusBadge status={client.status as ClientStatus} />
        <DeliveryBadge date={client.delivery_date} />
      </div>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[hsl(var(--text-muted))] group-hover:text-gold group-hover:bg-gold/10 transition-all shrink-0" onClick={onClick}>
        <Icon name="ChevronRight" size={13} />
      </div>
    </div>
  );
}

// ── Колонка канбана ─────────────────────────────────────────────
export function KanbanColumn({ status, clients, onClient }: {
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