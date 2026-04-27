import Icon from '@/components/ui/icon';
import type { Client, ClientStatus, ClientHistoryItem } from './types';
import { CLIENT_STATUSES } from './types';
import { INPUT, SELECT, TEXTAREA, Field, Section } from './ClientCardShared';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits.startsWith('7') ? digits : '7' + digits;
  const n = d.slice(0, 11);
  if (n.length === 0) return '';
  let result = '+' + n[0];
  if (n.length > 1) result += ' (' + n.slice(1, 4);
  if (n.length > 4) result += ') ' + n.slice(4, 7);
  if (n.length > 7) result += '-' + n.slice(7, 9);
  if (n.length > 9) result += '-' + n.slice(9, 11);
  return result;
}

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '+') { onChange(''); return; }
    onChange(formatPhone(raw));
  };
  return (
    <input
      className={INPUT}
      value={value}
      onChange={handleChange}
      placeholder={placeholder || '+7 (___) ___-__-__'}
      inputMode="tel"
    />
  );
}

const STATUS_FLOW: ClientStatus[] = ['new', 'measure', 'agreement', 'production', 'delivery', 'done'];

function StatusTimeline({ status, onStatusChange }: { status: string; onStatusChange: (s: ClientStatus) => void }) {
  const currentIdx = STATUS_FLOW.indexOf(status as ClientStatus);
  const isCancelled = status === 'cancelled';

  return (
    <div className="flex items-center gap-0 w-full">
      {STATUS_FLOW.map((s, i) => {
        const info = CLIENT_STATUSES.find(x => x.id === s)!;
        const isDone = !isCancelled && currentIdx > i;
        const isCurrent = !isCancelled && currentIdx === i;
        const isFuture = isCancelled || currentIdx < i;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => onStatusChange(s)}
              title={info.label}
              className="flex flex-col items-center gap-1.5 group flex-1 min-w-0"
            >
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold ${
                  isCurrent ? 'scale-110 shadow-md' : 'group-hover:scale-105'
                }`}
                style={
                  isDone
                    ? { background: info.color, borderColor: info.color, color: '#fff' }
                    : isCurrent
                    ? { background: info.color, borderColor: info.color, color: '#fff', boxShadow: `0 0 8px ${info.color}66` }
                    : { borderColor: info.color + '44', color: info.color + '88' }
                }
              >
                {isDone ? <Icon name="Check" size={11} /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-[10px] text-center leading-tight truncate w-full px-0.5 ${
                isCurrent ? 'font-semibold' : isFuture ? 'opacity-40' : ''
              }`} style={isCurrent || isDone ? { color: info.color } : {}}>
                {info.label}
              </span>
            </button>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`h-0.5 w-3 shrink-0 mx-0.5 rounded transition-colors ${isDone ? 'opacity-60' : 'opacity-20'}`}
                style={{ background: isDone ? CLIENT_STATUSES.find(x => x.id === s)!.color : '#888' }}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          <Icon name="XCircle" size={12} />
          Отменён
        </div>
      )}
    </div>
  );
}

// ── Вкладка: Сводка ────────────────────────────────────────────
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

// ── Вкладка: Данные ────────────────────────────────────────────
export function TabData({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string) => void }) {
  return (
    <div className="space-y-4">
      {/* ФИО */}
      <Section title="Личные данные" icon="User">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Фамилия">
              <input className={INPUT} value={client.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Иванов" />
            </Field>
            <Field label="Имя">
              <input className={INPUT} value={client.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="Иван" />
            </Field>
            <Field label="Отчество">
              <input className={INPUT} value={client.middle_name} onChange={e => onChange('middle_name', e.target.value)} placeholder="Иванович" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Телефон (основной)">
              <PhoneInput value={client.phone} onChange={v => onChange('phone', v)} />
            </Field>
            <Field label="Телефон (доп.)">
              <PhoneInput value={client.phone2} onChange={v => onChange('phone2', v)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мессенджер">
              <select className={SELECT} value={client.messenger} onChange={e => onChange('messenger', e.target.value)}>
                {['WhatsApp', 'Telegram', 'Viber', 'Звонок'].map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Email">
              <input className={INPUT} value={client.email} onChange={e => onChange('email', e.target.value)} placeholder="email@example.com" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Паспорт */}
      <Section title="Паспортные данные" icon="CreditCard">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Серия">
              <input className={INPUT} value={client.passport_series} onChange={e => onChange('passport_series', e.target.value)} placeholder="1234" maxLength={4} />
            </Field>
            <Field label="Номер">
              <input className={INPUT} value={client.passport_number} onChange={e => onChange('passport_number', e.target.value)} placeholder="567890" maxLength={6} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата выдачи">
              <input type="date" className={INPUT} value={client.passport_issued_date} onChange={e => onChange('passport_issued_date', e.target.value)} />
            </Field>
            <Field label="Код подразделения">
              <input className={INPUT} value={client.passport_dept_code} onChange={e => onChange('passport_dept_code', e.target.value)} placeholder="123-456" maxLength={7} />
            </Field>
          </div>
          <Field label="Кем выдан">
            <textarea rows={2} className={TEXTAREA} value={client.passport_issued_by} onChange={e => onChange('passport_issued_by', e.target.value)} placeholder="ОУФМС России..." />
          </Field>
        </div>
      </Section>

      {/* Адрес регистрации */}
      <Section title="Адрес регистрации (по паспорту)" icon="MapPin">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Город / нас. пункт">
              <input className={INPUT} value={client.reg_city} onChange={e => onChange('reg_city', e.target.value)} placeholder="Москва" />
            </Field>
            <Field label="Улица">
              <input className={INPUT} value={client.reg_street} onChange={e => onChange('reg_street', e.target.value)} placeholder="ул. Ленина" />
            </Field>
            <Field label="Дом / корп.">
              <input className={INPUT} value={client.reg_house} onChange={e => onChange('reg_house', e.target.value)} placeholder="12А" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Квартира">
              <input className={INPUT} value={client.reg_apt} onChange={e => onChange('reg_apt', e.target.value)} placeholder="45" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Адрес доставки */}
      <Section title="Адрес доставки" icon="Truck" action={
        <button
          onClick={() => {
            onChange('delivery_city', client.reg_city);
            onChange('delivery_street', client.reg_street);
            onChange('delivery_house', client.reg_house);
            onChange('delivery_apt', client.reg_apt);
          }}
          className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          title="Скопировать из адреса регистрации"
        >
          <Icon name="Copy" size={12} />
          Как у регистрации
        </button>
      }>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Город">
              <input className={INPUT} value={client.delivery_city} onChange={e => onChange('delivery_city', e.target.value)} placeholder="Москва" />
            </Field>
            <Field label="Улица">
              <input className={INPUT} value={client.delivery_street} onChange={e => onChange('delivery_street', e.target.value)} placeholder="ул. Ленина" />
            </Field>
            <Field label="Дом / корп.">
              <input className={INPUT} value={client.delivery_house} onChange={e => onChange('delivery_house', e.target.value)} placeholder="12А" />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Квартира">
              <input className={INPUT} value={client.delivery_apt} onChange={e => onChange('delivery_apt', e.target.value)} placeholder="45" />
            </Field>
            <Field label="Подъезд">
              <input className={INPUT} value={client.delivery_entrance} onChange={e => onChange('delivery_entrance', e.target.value)} placeholder="2" />
            </Field>
            <Field label="Этаж">
              <input className={INPUT} value={client.delivery_floor} onChange={e => onChange('delivery_floor', e.target.value)} placeholder="5" />
            </Field>
            <Field label="Лифт">
              <select className={SELECT} value={client.delivery_elevator} onChange={e => onChange('delivery_elevator', e.target.value)}>
                <option value="нет">Нет</option>
                <option value="есть">Есть</option>
                <option value="грузовой">Грузовой</option>
              </select>
            </Field>
          </div>
          <Field label="Доп. инструкции (домофон, шлагбаум...)">
            <textarea rows={2} className={TEXTAREA} value={client.delivery_note} onChange={e => onChange('delivery_note', e.target.value)} placeholder="Домофон 45, въезд со двора..." />
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ── Вкладка: Договор ───────────────────────────────────────────
export function TabContract({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string | number | object) => void }) {
  const addProduct = () => {
    const products = [...(client.products || []), { id: Date.now().toString(), name: '', qty: 1 }];
    onChange('products', products);
  };
  const removeProduct = (id: string) => onChange('products', client.products.filter(p => p.id !== id));
  const updateProduct = (id: string, field: 'name' | 'qty', value: string | number) => {
    onChange('products', client.products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const showBalance = client.payment_type === '50% предоплата' || client.payment_type === 'Рассрочка';

  return (
    <div className="space-y-4">
      {/* Договор */}
      <Section title="Договор" icon="FileText">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Номер договора">
            <input className={INPUT} value={client.contract_number} onChange={e => onChange('contract_number', e.target.value)} placeholder="№ договора" />
          </Field>
          <Field label="Дата заключения">
            <input type="date" className={INPUT} value={client.contract_date} onChange={e => onChange('contract_date', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Изделия */}
      <Section title="Изделия" icon="Package">
        <div className="space-y-2">
          {client.products?.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input className={INPUT + ' flex-1'} value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} placeholder="Наименование изделия" />
              <input type="number" min={1} className={INPUT + ' w-20 text-center'} value={p.qty} onChange={e => updateProduct(p.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))} />
              <button onClick={() => removeProduct(p.id)} className="p-2 text-[hsl(var(--text-muted))] hover:text-red-400 transition-colors">
                <Icon name="Trash2" size={13} />
              </button>
            </div>
          ))}
          <button onClick={addProduct} className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center">
            <Icon name="Plus" size={13} /> Добавить изделие
          </button>
        </div>
      </Section>

      {/* Оплата */}
      <Section title="Оплата" icon="CreditCard">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Сумма договора (₽)">
              <input type="number" min={0} className={INPUT} value={client.total_amount || ''} onChange={e => onChange('total_amount', parseFloat(e.target.value) || 0)} placeholder="0" />
            </Field>
            <Field label="Схема оплаты">
              <select className={SELECT} value={client.payment_type} onChange={e => onChange('payment_type', e.target.value)}>
                {['100% предоплата', '50% предоплата', 'Рассрочка', 'Своя схема'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          {showBalance && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Внесено (₽)">
                <input type="number" min={0} className={INPUT} value={client.prepaid_amount || ''} onChange={e => onChange('prepaid_amount', parseFloat(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="Остаток (₽)">
                <input type="number" readOnly className={INPUT + ' opacity-60'} value={Math.max(0, client.total_amount - client.prepaid_amount)} />
              </Field>
            </div>
          )}
          {client.payment_type === 'Своя схема' && (
            <Field label="Описание схемы">
              <textarea rows={2} className={TEXTAREA} value={client.custom_payment_scheme} onChange={e => onChange('custom_payment_scheme', e.target.value)} placeholder="Опишите схему оплаты..." />
            </Field>
          )}
        </div>
      </Section>

      {/* Сроки */}
      <Section title="Сроки" icon="Calendar">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Дата доставки">
            <input type="date" className={INPUT} value={client.delivery_date} onChange={e => onChange('delivery_date', e.target.value)} />
          </Field>
          <Field label="Срок изготовления (дни)">
            <input type="number" min={0} className={INPUT} value={client.production_days || ''} onChange={e => onChange('production_days', parseInt(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Срок монтажа (дни)">
            <input type="number" min={0} className={INPUT} value={client.assembly_days || ''} onChange={e => onChange('assembly_days', parseInt(e.target.value) || 0)} placeholder="0" />
          </Field>
        </div>
      </Section>

      {/* Стоимость услуг */}
      <Section title="Стоимость доставки и монтажа" icon="Truck">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Стоимость доставки (₽)">
            <input type="number" min={0} className={INPUT} value={client.delivery_cost || ''} onChange={e => onChange('delivery_cost', parseFloat(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Стоимость монтажа (₽)">
            <input type="number" min={0} className={INPUT} value={client.assembly_cost || ''} onChange={e => onChange('assembly_cost', parseFloat(e.target.value) || 0)} placeholder="0" />
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ── Вкладка: История ───────────────────────────────────────────
export function TabHistory({ history }: { history: ClientHistoryItem[] }) {
  const ACTION_ICONS: Record<string, string> = {
    created: 'UserPlus',
    updated: 'Edit3',
    status_changed: 'ArrowRight',
    photo_added: 'Image',
    comment_added: 'MessageSquare',
  };

  if (history.length === 0) {
    return <div className="text-center text-[hsl(var(--text-muted))] text-sm py-12">История действий пуста</div>;
  }

  return (
    <div className="space-y-1">
      {history.map(item => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(220,12%,13%)] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[hsl(220,12%,16%)] flex items-center justify-center shrink-0 mt-0.5">
            <Icon name={ACTION_ICONS[item.action] || 'Clock'} size={12} className="text-[hsl(var(--text-muted))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground">{item.description}</div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[hsl(var(--text-muted))]">
              <span>{item.user_name || 'Система'}</span>
              <span>·</span>
              <span>{new Date(item.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}