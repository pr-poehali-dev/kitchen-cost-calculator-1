import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { CLIENT_STATUSES, clientFullName } from '@/clients/types';
import type { Client, ClientStatus } from '@/clients/types';

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
        <Icon name={icon} size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
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

  // Статистика
  const active = clients.filter(c => !['done', 'cancelled'].includes(c.status));
  const todayDeliveries = clients.filter(c => c.delivery_date === today);
  const reminders = clients.filter(c => c.reminder_date === today);
  const totalRevenue = clients.filter(c => c.status === 'done').reduce((s, c) => s + (c.total_amount || 0), 0);

  // Сделки по статусам (только активные)
  const statusCounts = CLIENT_STATUSES.filter(s => !['done', 'cancelled'].includes(s.id))
    .map(s => ({ ...s, count: clients.filter(c => c.status === s.id).length }))
    .filter(s => s.count > 0);

  // Ближайшие доставки (7 дней)
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const upcomingDeliveries = clients
    .filter(c => c.delivery_date && c.delivery_date >= today && c.delivery_date <= soon.toISOString().slice(0, 10))
    .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
    .slice(0, 5);

  // Напоминания на сегодня и завтра
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const upcomingReminders = clients
    .filter(c => c.reminder_date && c.reminder_date >= today && c.reminder_date <= tomorrow.toISOString().slice(0, 10))
    .sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
    .slice(0, 5);

  // Последние клиенты
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
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 shrink-0">
        <h1 className="text-base font-semibold text-foreground">Главная</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">
          {new Date().toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="p-6 max-w-5xl mx-auto space-y-6">

          {/* Статистика */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Активных сделок" value={active.length} icon="TrendingUp" color="#f59e0b" />
            <StatCard label="Доставок сегодня" value={todayDeliveries.length} icon="Truck" color="#06b6d4" />
            <StatCard label="Напоминаний сегодня" value={reminders.length} icon="Bell" color="#8b5cf6" />
            <StatCard label="Выручка (закрытых)" value={totalRevenue > 0 ? totalRevenue.toLocaleString('ru') + ' ₽' : '—'} icon="Wallet" color="#10b981" />
          </div>

          {/* Воронка активных */}
          {statusCounts.length > 0 && (
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon name="BarChart2" size={13} />Активные сделки по статусам
              </div>
              <div className="flex items-end gap-3">
                {statusCounts.map(s => {
                  const max = Math.max(...statusCounts.map(x => x.count));
                  const h = max > 0 ? Math.round((s.count / max) * 80) + 20 : 20;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-xs font-bold text-foreground">{s.count}</span>
                      <div className="w-full rounded-t" style={{ height: h, background: s.color + '60', borderTop: `2px solid ${s.color}` }} />
                      <span className="text-[10px] text-[hsl(var(--text-muted))] text-center leading-tight">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ближайшие доставки */}
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon name="Truck" size={13} />Доставки (7 дней)
              </div>
              {upcomingDeliveries.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-muted))] py-4 text-center">Нет запланированных доставок</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeliveries.map(c => {
                    const s = CLIENT_STATUSES.find(x => x.id === c.status);
                    const isToday = c.delivery_date === today;
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
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
                        {s && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: s.color + '22', color: s.color }}>{s.label}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Напоминания */}
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon name="Bell" size={13} />Напоминания
              </div>
              {upcomingReminders.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-muted))] py-4 text-center">Нет напоминаний на сегодня</p>
              ) : (
                <div className="space-y-2">
                  {upcomingReminders.map(c => {
                    const isToday = c.reminder_date === today;
                    return (
                      <div key={c.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <Icon name="Bell" size={14} className={isToday ? 'text-amber-400 mt-0.5' : 'text-[hsl(var(--text-muted))] mt-0.5'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{clientFullName(c)}</div>
                          {c.reminder_note && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{c.reminder_note}</div>}
                          <div className={`text-[10px] mt-0.5 ${isToday ? 'text-amber-400' : 'text-[hsl(var(--text-muted))]'}`}>
                            {isToday ? 'Сегодня' : 'Завтра'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Последние клиенты */}
          {recent.length > 0 && (
            <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon name="Clock" size={13} />Последние клиенты
              </div>
              <div className="space-y-0">
                {recent.map(c => {
                  const s = CLIENT_STATUSES.find(x => x.id === c.status);
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                      <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <span className="text-gold text-xs font-bold">
                          {(c.last_name?.[0] || c.first_name?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{clientFullName(c)}</div>
                        <div className="text-xs text-[hsl(var(--text-muted))]">{c.phone || '—'}</div>
                      </div>
                      {c.total_amount > 0 && (
                        <span className="text-sm font-medium text-foreground shrink-0">{c.total_amount.toLocaleString('ru')} ₽</span>
                      )}
                      {s && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: s.color + '22', color: s.color }}>{s.label}</span>}
                    </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
