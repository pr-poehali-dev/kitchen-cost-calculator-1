import Icon from '@/components/ui/icon';
import type { Client, ClientStatus } from '../types';
import { TEXTAREA, Field, Section } from '../ClientCardShared';
import { INPUT } from '../ClientCardShared';
import { StatusTimeline } from './shared';

export function TabOverview({ client, onChange, onStatusChange }: {
  client: Client;
  onChange: (f: keyof Client, v: string) => void;
  onStatusChange: (s: ClientStatus) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const hasReminder = client.reminder_date && client.reminder_date >= today;

  const deliveryDiff = client.delivery_date
    ? Math.round((new Date(client.delivery_date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
    : null;

  return (
    <div className="space-y-4">
      {/* Статус — таймлайн */}
      <Section title="Статус сделки" icon="Activity">
        <StatusTimeline status={client.status} onStatusChange={onStatusChange} />
        {client.status === 'cancelled' && (
          <div className="mt-3">
            <button
              onClick={() => onStatusChange('new')}
              className="text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              ← Восстановить как «Новый лид»
            </button>
          </div>
        )}
      </Section>

      {/* Ключевые даты */}
      {(client.delivery_date || client.contract_date) && (
        <Section title="Ключевые даты" icon="Calendar">
          <div className="flex flex-wrap gap-3">
            {client.contract_date && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220,12%,14%)] rounded-lg">
                <Icon name="FileText" size={13} className="text-[hsl(var(--text-muted))]" />
                <div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider">Договор</div>
                  <div className="text-sm font-medium">{new Date(client.contract_date).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            )}
            {client.delivery_date && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                deliveryDiff !== null && deliveryDiff < 0 ? 'bg-red-500/10 border-red-500/30' :
                deliveryDiff !== null && deliveryDiff <= 3 ? 'bg-amber-400/10 border-amber-400/30' :
                'bg-[hsl(220,12%,14%)] border-transparent'
              }`}>
                <Icon name="Truck" size={13} className={
                  deliveryDiff !== null && deliveryDiff < 0 ? 'text-red-400' :
                  deliveryDiff !== null && deliveryDiff <= 3 ? 'text-amber-400' :
                  'text-[hsl(var(--text-muted))]'
                } />
                <div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider">Доставка</div>
                  <div className={`text-sm font-medium ${
                    deliveryDiff !== null && deliveryDiff < 0 ? 'text-red-400' :
                    deliveryDiff !== null && deliveryDiff <= 3 ? 'text-amber-400' : ''
                  }`}>
                    {new Date(client.delivery_date).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {deliveryDiff !== null && (
                      <span className="ml-1.5 text-[11px] opacity-70">
                        {deliveryDiff === 0 ? '· сегодня' : deliveryDiff > 0 ? `· через ${deliveryDiff} дн.` : `· ${Math.abs(deliveryDiff)} дн. назад`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {client.total_amount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220,12%,14%)] rounded-lg">
                <Icon name="Banknote" size={13} className="text-gold" />
                <div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider">Сумма</div>
                  <div className="text-sm font-semibold text-gold">{client.total_amount.toLocaleString('ru')} ₽</div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Ответственные */}
      <Section title="Ответственные" icon="Users">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Дизайнер">
            <input className={INPUT} value={client.designer} onChange={e => onChange('designer', e.target.value)} placeholder="Имя дизайнера" />
          </Field>
          <Field label="Замерщик">
            <input className={INPUT} value={client.measurer} onChange={e => onChange('measurer', e.target.value)} placeholder="Имя замерщика" />
          </Field>
        </div>
      </Section>

      {/* Напоминание */}
      <Section title="Напоминание" icon="Bell">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата следующего контакта">
              <input type="date" className={INPUT} value={client.reminder_date} onChange={e => onChange('reminder_date', e.target.value)} />
            </Field>
            <div className="flex items-end">
              {hasReminder && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded text-xs text-amber-400 w-full">
                  <Icon name="Bell" size={12} />
                  Напоминание активно
                </div>
              )}
            </div>
          </div>
          <Field label="Заметка к напоминанию">
            <textarea rows={2} className={TEXTAREA} value={client.reminder_note} onChange={e => onChange('reminder_note', e.target.value)} placeholder="О чём напомнить..." />
          </Field>
        </div>
      </Section>

      {/* Комментарий */}
      <Section title="Комментарий" icon="MessageSquare">
        <textarea rows={4} className={TEXTAREA} value={client.comment} onChange={e => onChange('comment', e.target.value)} placeholder="Общие заметки по клиенту..." />
      </Section>
    </div>
  );
}
