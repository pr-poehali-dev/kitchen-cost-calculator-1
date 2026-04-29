import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { CLIENT_STATUSES, clientFullName } from '@/clients/types';
import type { Client } from '@/clients/types';

type Section = 'home' | 'clients' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings' | 'users';

interface Props {
  onNav: (s: Section) => void;
}

function StatCard({ label, value, sub, icon, color, onClick, hint }: {
  label: string; value: number | string; sub?: string; icon: string; color: string;
  onClick?: () => void; hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex items-center gap-4 w-full text-left transition-all ${
        onClick ? 'hover:border-[hsl(220,12%,26%)] hover:bg-[hsl(220,12%,14%)] cursor-pointer group' : 'cursor-default'
      }`}
      title={hint}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: color + '20' }}>
        <Icon name={icon} size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5 opacity-70">{sub}</div>}
      </div>
      {onClick && (
        <Icon name="ChevronRight" size={14} className="text-[hsl(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </button>
  );
}

const STATUS_FLOW = ['new', 'measure', 'agreement', 'production', 'delivery'] as const;

export default function HomePage({ onNav }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('kuhni_pro_token') || '';
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch(`https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7/?action=list&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active = clients.filter(c => !['done', 'cancelled'].includes(c.status));
  const todayDeliveries = clients.filter(c => c.delivery_date === today);
  const reminders = clients.filter(c => c.reminder_date === today);
  const doneClients = clients.filter(c => c.status === 'done');
  const totalRevenue = doneClients.reduce((s, c) => s + (c.total_amount || 0), 0);
  const avgDeal = doneClients.length > 0 ? Math.round(totalRevenue / doneClients.length) : 0;

  // Задачи на сегодня: доставки + напоминания
  const todayTasks = [
    ...todayDeliveries.map(c => ({ type: 'delivery' as const, client: c })),
    ...clients.filter(c => c.reminder_date === today && !todayDeliveries.find(d => d.id === c.id))
      .map(c => ({ type: 'reminder' as const, client: c })),
  ];

  // Воронка: считаем конверсию между статусами
  const funnelData = STATUS_FLOW.map(sid => {
    const info = CLIENT_STATUSES.find(s => s.id === sid)!;
    const count = clients.filter(c => c.status === sid).length;
    return { ...info, count };
  });

  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const upcomingDeliveries = clients
    .filter(c => c.delivery_date && c.delivery_date >= today && c.delivery_date <= soon.toISOString().slice(0, 10))
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
    .slice(0, 5);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const upcomingReminders = clients
    .filter(c => c.reminder_date && c.reminder_date >= today && c.reminder_date <= tomorrow.toISOString().slice(0, 10))
    .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
    .slice(0, 5);

  const recent = [...clients].sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-[hsl(var(--text-muted))]">
        <Icon name="Loader2" size={18} className="animate-spin" />
        <span className="text-sm">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-4 md:px-6 py-3 md:py-4 shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">Главная</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5 sm:hidden">
            {new Date().toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => onNav('clients')}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0"
        >
          <Icon name="UserPlus" size={14} />
          <span className="hidden sm:inline">Новый клиент</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6">

          {/* Задачи на сегодня */}
          {todayTasks.length > 0 && (
            <div className="bg-[hsl(220,14%,11%)] border border-amber-400/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-amber-400 uppercase tracking-wider font-medium">
                <Icon name="ListChecks" size={13} />
                Задачи на сегодня
                <span className="ml-auto bg-amber-400/20 text-amber-400 rounded-full px-2 py-0.5 text-[10px]">{todayTasks.length}</span>
              </div>
              <div className="space-y-1.5">
                {todayTasks.map(({ type, client: c }) => (
                  <button
                    key={`${type}-${c.id}`}
                    onClick={() => onNav('clients')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,18%)] transition-colors text-left"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${type === 'delivery' ? 'bg-cyan-400/20' : 'bg-amber-400/20'}`}>
                      <Icon name={type === 'delivery' ? 'Truck' : 'Bell'} size={12} className={type === 'delivery' ? 'text-cyan-400' : 'text-amber-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate">{clientFullName(c)}</span>
                      <span className="text-xs text-[hsl(var(--text-muted))] ml-2">{type === 'delivery' ? 'Доставка' : 'Напоминание'}</span>
                    </div>
                    {type === 'delivery' && c.delivery_city && (
                      <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">{c.delivery_city}</span>
                    )}
                    {type === 'reminder' && c.reminder_note && (
                      <span className="text-xs text-[hsl(var(--text-muted))] truncate max-w-32">{c.reminder_note}</span>
                    )}
                    {c.total_amount > 0 && (
                      <span className="text-xs font-medium text-gold shrink-0">{c.total_amount.toLocaleString('ru')} ₽</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Статистика */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Активных сделок"
              value={active.length}
              icon="TrendingUp"
              color="#f59e0b"
              onClick={() => onNav('clients')}
              hint="Открыть список клиентов"
            />
            <StatCard
              label="Доставок сегодня"
              value={todayDeliveries.length}
              icon="Truck"
              color="#06b6d4"
              onClick={todayDeliveries.length > 0 ? () => onNav('clients') : undefined}
            />
            <StatCard
              label="Напоминаний сегодня"
              value={reminders.length}
              icon="Bell"
              color="#8b5cf6"
              onClick={reminders.length > 0 ? () => onNav('clients') : undefined}
            />
            <StatCard
              label="Выручка (закрытых)"
              value={totalRevenue > 0 ? totalRevenue.toLocaleString('ru') + ' ₽' : '—'}
              sub={avgDeal > 0 ? `Средний чек: ${avgDeal.toLocaleString('ru')} ₽` : undefined}
              icon="Wallet"
              color="#10b981"
            />
          </div>

          {/* Воронка с конверсией */}
          {clients.length > 0 && (
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-5 flex items-center gap-2">
                <Icon name="Filter" size={13} />Воронка продаж
                <span className="ml-auto text-[hsl(var(--text-muted))]">Всего: {clients.length} клиентов</span>
              </div>

              <div className="flex items-stretch gap-1">
                {funnelData.map((s, i) => {
                  const nextCount = i < funnelData.length - 1 ? funnelData[i + 1].count : null;
                  const conv = nextCount !== null && s.count > 0
                    ? Math.round((nextCount / s.count) * 100)
                    : null;
                  const maxH = 64;
                  const total = clients.length;
                  const barH = total > 0 ? Math.max(16, Math.round((s.count / total) * maxH)) : 16;

                  return (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">{s.count}</span>
                      <button
                        onClick={() => onNav('clients')}
                        className="w-full rounded transition-opacity hover:opacity-80"
                        style={{ height: barH, background: s.color + '50', borderTop: `2px solid ${s.color}` }}
                        title={`${s.label}: ${s.count}`}
                      />
                      <span className="text-[10px] text-[hsl(var(--text-muted))] text-center leading-tight">{s.label}</span>
                      {conv !== null && (
                        <div className="flex items-center gap-0.5 text-[10px]">
                          <Icon name="ArrowRight" size={9} className="text-[hsl(var(--text-muted))]" />
                          <span className={conv >= 50 ? 'text-emerald-400' : conv >= 25 ? 'text-amber-400' : 'text-red-400'}>
                            {conv}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Закрытые */}
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">{doneClients.length}</span>
                  <div
                    className="w-full rounded"
                    style={{ height: Math.max(16, Math.round((doneClients.length / Math.max(clients.length, 1)) * 64)), background: '#10b98150', borderTop: '2px solid #10b981' }}
                  />
                  <span className="text-[10px] text-[hsl(var(--text-muted))] text-center leading-tight">Закрыт</span>
                  {clients.length > 0 && (
                    <div className="flex items-center gap-0.5 text-[10px]">
                      <span className="text-emerald-400">{Math.round((doneClients.length / clients.length) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Итоговая конверсия */}
              {clients.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-xs text-[hsl(var(--text-muted))]">
                  <span>Общая конверсия: <span className="text-foreground font-medium">{Math.round((doneClients.length / clients.length) * 100)}%</span></span>
                  <span>·</span>
                  <span>Закрыто сделок: <span className="text-foreground font-medium">{doneClients.length}</span></span>
                  {avgDeal > 0 && <>
                    <span>·</span>
                    <span>Средний чек: <span className="text-gold font-medium">{avgDeal.toLocaleString('ru')} ₽</span></span>
                  </>}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ближайшие доставки */}
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Icon name="Truck" size={13} />Доставки (7 дней)</div>
                {upcomingDeliveries.length > 0 && (
                  <button onClick={() => onNav('clients')} className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors flex items-center gap-1">
                    Все <Icon name="ChevronRight" size={11} />
                  </button>
                )}
              </div>
              {upcomingDeliveries.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-muted))] py-4 text-center">Нет запланированных доставок</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeliveries.map(c => {
                    const s = CLIENT_STATUSES.find(x => x.id === c.status);
                    const isToday = c.delivery_date === today;
                    return (
                      <button key={c.id} onClick={() => onNav('clients')}
                        className="flex items-center gap-3 py-2 border-b border-border last:border-0 w-full text-left hover:opacity-80 transition-opacity">
                        <div className="text-center shrink-0">
                          <div className={`text-sm font-bold ${isToday ? 'text-gold' : 'text-foreground'}`}>
                            {new Date(c.delivery_date + 'T00:00:00').toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })}
                          </div>
                          {isToday && <div className="text-[10px] text-gold">сегодня</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{clientFullName(c)}</div>
                          <div className="text-xs text-[hsl(var(--text-muted))]">{c.delivery_city || c.delivery_street || '—'}</div>
                        </div>
                        {s && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: s.color + '22', color: s.color }}>{s.label}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Напоминания */}
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Icon name="Bell" size={13} />Напоминания</div>
                {upcomingReminders.length > 0 && (
                  <button onClick={() => onNav('clients')} className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors flex items-center gap-1">
                    Все <Icon name="ChevronRight" size={11} />
                  </button>
                )}
              </div>
              {upcomingReminders.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-muted))] py-4 text-center">Нет напоминаний на сегодня</p>
              ) : (
                <div className="space-y-2">
                  {upcomingReminders.map(c => {
                    const isToday = c.reminder_date === today;
                    return (
                      <button key={c.id} onClick={() => onNav('clients')}
                        className="flex items-start gap-3 py-2 border-b border-border last:border-0 w-full text-left hover:opacity-80 transition-opacity">
                        <Icon name="Bell" size={14} className={`${isToday ? 'text-amber-400' : 'text-[hsl(var(--text-muted))]'} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{clientFullName(c)}</div>
                          {c.reminder_note && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{c.reminder_note}</div>}
                          <div className={`text-[10px] mt-0.5 ${isToday ? 'text-amber-400' : 'text-[hsl(var(--text-muted))]'}`}>
                            {isToday ? 'Сегодня' : 'Завтра'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Последние клиенты */}
          {recent.length > 0 && (
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Icon name="Clock" size={13} />Последние клиенты</div>
                <button onClick={() => onNav('clients')} className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors flex items-center gap-1">
                  Все клиенты <Icon name="ChevronRight" size={11} />
                </button>
              </div>
              <div className="space-y-0">
                {recent.map(c => {
                  const s = CLIENT_STATUSES.find(x => x.id === c.status);
                  return (
                    <button key={c.id} onClick={() => onNav('clients')}
                      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 w-full text-left hover:bg-[hsl(220,12%,13%)] transition-colors rounded px-2 -mx-2">
                      <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <span className="text-gold text-xs font-bold">{(c.last_name?.[0] || c.first_name?.[0] || '?').toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{clientFullName(c)}</div>
                        <div className="text-xs text-[hsl(var(--text-muted))]">{c.phone || '—'}</div>
                      </div>
                      {c.total_amount > 0 && (
                        <span className="text-sm font-medium text-foreground shrink-0">{c.total_amount.toLocaleString('ru')} ₽</span>
                      )}
                      {s && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: s.color + '22', color: s.color }}>{s.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Icon name="Users" size={40} className="text-[hsl(var(--text-muted))]" />
              <p className="text-[hsl(var(--text-muted))] text-sm">Клиентов пока нет</p>
              <p className="text-xs text-[hsl(var(--text-muted))]">Перейдите в раздел «Клиенты», чтобы добавить первого</p>
              <button onClick={() => onNav('clients')}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                <Icon name="UserPlus" size={14} /> Добавить клиента
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}