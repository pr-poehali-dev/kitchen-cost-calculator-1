import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useClient } from './useClients';
import { CLIENT_STATUSES, clientFullName } from './types';
import type { ClientStatus } from './types';

interface Props {
  clientId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: ClientStatus) => void;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function ClientQuickPanel({ clientId, onClose, onOpen, onStatusChange }: Props) {
  const { client, loading } = useClient(clientId);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    setShowStatusMenu(false);
  }, [clientId]);

  if (!clientId) return null;

  if (loading || !client) {
    return (
      <div className="flex flex-col h-full bg-[hsl(220,14%,10%)] border-l border-border w-72 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="h-4 w-32 bg-[hsl(220,12%,16%)] rounded animate-pulse" />
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-[hsl(220,12%,16%)] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const name = clientFullName(client);
  const statusInfo = CLIENT_STATUSES.find(s => s.id === client.status);
  const initials = [client.last_name, client.first_name].filter(Boolean).map(s => s[0]).join('').toUpperCase() || '?';

  const deliveryAddr = [
    client.delivery_city,
    client.delivery_street,
    client.delivery_house && `д. ${client.delivery_house}`,
    client.delivery_apt && `кв. ${client.delivery_apt}`,
  ].filter(Boolean).join(', ');

  const mapUrl = deliveryAddr
    ? `https://maps.yandex.ru/?text=${encodeURIComponent(deliveryAddr)}`
    : undefined;

  const balance = client.total_amount - client.prepaid_amount;

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,10%)] border-l border-border w-72 shrink-0 overflow-hidden animate-fade-in">

      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
            <span className="text-gold font-bold text-xs">{initials}</span>
          </div>
          <span className="font-semibold text-sm truncate">{name || 'Новый клиент'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onOpen(client.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Icon name="ExternalLink" size={11} /> Открыть
          </button>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 ml-0.5">
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>

      {/* Статус */}
      <div className="px-4 pt-3 shrink-0 relative">
        <button
          onClick={() => setShowStatusMenu(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded bg-[hsl(220,12%,16%)] border border-border hover:border-[hsl(220,12%,26%)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusInfo?.color || '#888' }} />
            <span className="text-sm">{statusInfo?.label || client.status}</span>
          </div>
          <Icon name="ChevronDown" size={13} className="text-[hsl(var(--text-muted))]" />
        </button>
        {showStatusMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
            <div className="absolute left-4 right-4 top-full mt-1 z-20 bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-xl overflow-hidden">
              {CLIENT_STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onStatusChange(client.id, s.id); setShowStatusMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] transition-colors text-left ${s.id === client.status ? 'bg-[hsl(220,12%,14%)]' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                  {s.id === client.status && <Icon name="Check" size={12} className="ml-auto text-gold" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">

        {/* Контакты */}
        <section className="space-y-2">
          <SectionLabel>Контакты</SectionLabel>
          <InfoRow icon="Phone" label="Телефон" value={client.phone} href={client.phone ? `tel:${client.phone.replace(/\D/g, '')}` : undefined} />
          {client.phone2 && <InfoRow icon="Phone" label="Доп. телефон" value={client.phone2} href={`tel:${client.phone2.replace(/\D/g, '')}`} />}
          {client.email && <InfoRow icon="Mail" label="Email" value={client.email} href={`mailto:${client.email}`} />}
          {client.messenger && <InfoRow icon="MessageCircle" label="Мессенджер" value={client.messenger} />}
        </section>

        {/* Договор */}
        {(client.contract_number || client.total_amount > 0) && (
          <section className="space-y-2">
            <SectionLabel>Договор</SectionLabel>
            {client.contract_number && (
              <InfoRow
                icon="FileText"
                label="Номер"
                value={`№${client.contract_number}${client.contract_date ? ` от ${new Date(client.contract_date).toLocaleDateString('ru-RU')}` : ''}`}
              />
            )}
            {client.total_amount > 0 && (
              <div className="flex items-start gap-2.5">
                <Icon name="Banknote" size={13} className="text-[hsl(var(--text-muted))] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider leading-tight">Сумма</div>
                  <div className="text-xs text-foreground">{fmt(client.total_amount)} ₽</div>
                  {client.prepaid_amount > 0 && (
                    <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">
                      Аванс: {fmt(client.prepaid_amount)} ₽
                      {balance > 0 && <span className="text-[hsl(25,80%,60%)]"> · Долг: {fmt(balance)} ₽</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Сроки */}
        {(client.delivery_date || client.production_days > 0) && (
          <section className="space-y-2">
            <SectionLabel>Сроки</SectionLabel>
            {client.delivery_date && <DeliveryRow date={client.delivery_date} />}
            {client.production_days > 0 && (
              <InfoRow icon="Clock" label="Производство" value={`${client.production_days} дней`} />
            )}
          </section>
        )}

        {/* Адрес */}
        {deliveryAddr && (
          <section className="space-y-2">
            <SectionLabel>Адрес доставки</SectionLabel>
            <InfoRow icon="MapPin" label="Адрес" value={deliveryAddr} href={mapUrl} />
            {(client.delivery_floor || client.delivery_elevator) && (
              <div className="flex gap-3 text-xs text-[hsl(var(--text-dim))] pl-[26px]">
                {client.delivery_floor && <span>Этаж: {client.delivery_floor}</span>}
                {client.delivery_elevator && <span>Лифт: {client.delivery_elevator}</span>}
              </div>
            )}
          </section>
        )}

        {/* Ответственные */}
        {(client.designer || client.measurer || client.manager_name) && (
          <section className="space-y-2">
            <SectionLabel>Ответственные</SectionLabel>
            {client.designer && <InfoRow icon="Pencil" label="Дизайнер" value={client.designer} />}
            {client.measurer && <InfoRow icon="Ruler" label="Замерщик" value={client.measurer} />}
            {client.manager_name && <InfoRow icon="User" label="Менеджер" value={client.manager_name} />}
          </section>
        )}

        {/* Комментарий */}
        {client.comment && (
          <section className="space-y-1.5">
            <SectionLabel>Комментарий</SectionLabel>
            <p className="text-xs text-[hsl(var(--text-dim))] bg-[hsl(220,12%,14%)] rounded px-3 py-2 border-l-2 border-gold/30 italic">
              {client.comment}
            </p>
          </section>
        )}

        {/* Напоминание */}
        {client.reminder_date && new Date(client.reminder_date) > new Date() && (
          <section className="space-y-1.5">
            <SectionLabel>Напоминание</SectionLabel>
            <div className="flex items-start gap-2 px-3 py-2 rounded bg-[hsl(40,60%,18%)] border border-[hsl(40,40%,28%)]">
              <Icon name="Bell" size={12} className="text-[hsl(40,80%,60%)] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-[hsl(40,80%,70%)]">{new Date(client.reminder_date).toLocaleDateString('ru-RU')}</div>
                {client.reminder_note && <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">{client.reminder_note}</div>}
              </div>
            </div>
          </section>
        )}

        {/* Теги */}
        {client.tags && client.tags.length > 0 && (
          <section className="space-y-1.5">
            <SectionLabel>Теги</SectionLabel>
            <div className="flex flex-wrap gap-1">
              {client.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Мета */}
        <div className="text-[10px] text-[hsl(var(--text-muted))] pt-1 border-t border-border">
          Создан: {new Date(client.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold text-[hsl(var(--text-muted))] uppercase tracking-wider">{children}</div>;
}

function InfoRow({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={13} className="text-[hsl(var(--text-muted))] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider leading-tight">{label}</div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:text-gold transition-colors break-all">
            {value}
          </a>
        ) : (
          <div className="text-xs text-foreground break-words">{value}</div>
        )}
      </div>
    </div>
  );
}

function DeliveryRow({ date }: { date: string }) {
  const d = new Date(date);
  const diff = Math.floor((d.getTime() - Date.now()) / 86400000);
  let color = 'text-[hsl(var(--text-dim))]';
  let suffix = '';
  if (diff < 0) { color = 'text-destructive'; suffix = ' (просрочено)'; }
  else if (diff === 0) { color = 'text-[hsl(40,80%,60%)]'; suffix = ' (сегодня)'; }
  else if (diff <= 3) { color = 'text-[hsl(40,80%,60%)]'; }
  else if (diff <= 14) { color = 'text-[hsl(140,60%,50%)]'; }

  return (
    <div className="flex items-start gap-2.5">
      <Icon name="Calendar" size={13} className="text-[hsl(var(--text-muted))] mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider leading-tight">Дата доставки</div>
        <div className={`text-xs font-medium ${color}`}>{d.toLocaleDateString('ru-RU')}{suffix}</div>
      </div>
    </div>
  );
}
