import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { Client, ClientStatus } from '../types';
import { TEXTAREA, Field, Section } from '../ClientCardShared';
import { INPUT } from '../ClientCardShared';
import { StatusTimeline } from './shared';
import { useManagers } from '../useManagers';

function ManagerCombobox({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { managers } = useManagers();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = managers.filter(m =>
    m.display.toLowerCase().includes(query.toLowerCase()) ||
    m.login.toLowerCase().includes(query.toLowerCase())
  );

  const hasPoA = (name: string) => managers.some(m => m.display === name && (m.poa_number || m.poa_date));

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input
          className={`${INPUT} pr-8`}
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {managers.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
          >
            <Icon name="ChevronDown" size={14} />
          </button>
        )}
      </div>
      {value && hasPoA(value) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
          <Icon name="ScrollText" size={10} /> Доверенность привязана
        </div>
      )}
      {open && managers.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[hsl(var(--text-muted))]">Не найден — будет сохранён как текст</div>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.display); setQuery(m.display); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,20%)] transition-colors flex items-center justify-between gap-2 ${
                  value === m.display ? 'bg-gold/10 text-gold' : ''
                }`}
              >
                <div>
                  <span className="font-medium">{m.display}</span>
                  {m.full_name && m.display !== m.login && (
                    <span className="ml-2 text-xs text-[hsl(var(--text-muted))]">@{m.login}</span>
                  )}
                </div>
                {(m.poa_number || m.poa_date) && (
                  <span className="text-[10px] text-emerald-400 shrink-0 flex items-center gap-0.5">
                    <Icon name="ScrollText" size={9} /> дов.
                  </span>
                )}
              </button>
            ))
          )}
          {query && !filtered.some(m => m.display === query) && (
            <button
              type="button"
              onClick={() => { onChange(query); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--text-muted))] hover:bg-[hsl(220,12%,20%)] border-t border-border"
            >
              Сохранить «{query}» как текст
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const SOURCES = ['Авито', 'Instagram', 'ВКонтакте', 'Сайт', 'Сарафан', 'Выставка', 'Звонок', 'Повторный', 'Другое'];
const PRESET_TAGS = ['ВИП', 'Повторный', 'Проблемный', 'Юрлицо', 'Рассрочка', 'Срочно'];
const PROPERTY_TYPES = ['Квартира', 'Частный дом', 'Таунхаус', 'Офис', 'Апартаменты', 'Новостройка'];

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="transition-transform hover:scale-110"
        >
          <Icon
            name="Star"
            size={20}
            className={
              (hovered ?? value ?? 0) >= star
                ? 'text-amber-400 fill-amber-400'
                : 'text-[hsl(var(--text-muted))]'
            }
          />
        </button>
      ))}
      {value && (
        <span className="ml-1 text-xs text-[hsl(var(--text-muted))]">
          {value === 5 ? 'Отлично' : value === 4 ? 'Хорошо' : value === 3 ? 'Нормально' : value === 2 ? 'Плохо' : 'Ужасно'}
        </span>
      )}
    </div>
  );
}

function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => tags.includes(t) ? onChange(tags.filter(x => x !== t)) : onChange([...tags, t])}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${
              tags.includes(t)
                ? 'bg-gold/20 border-gold/50 text-gold'
                : 'bg-transparent border-border text-[hsl(var(--text-muted))] hover:border-gold/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.filter(t => !PRESET_TAGS.includes(t)).map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gold/20 border border-gold/50 text-gold">
              {t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-white">
                <Icon name="X" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={`flex-1 bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]`}
          placeholder="Свой тег..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
        />
        <button
          type="button"
          onClick={() => add(input)}
          className="px-3 py-1.5 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-colors"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}

export function TabOverview({ client, onChange, onStatusChange }: {
  client: Client;
  onChange: (f: keyof Client, v: unknown) => void;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Менеджер (подпись в договоре)">
            <ManagerCombobox
              value={client.manager_name || ''}
              onChange={v => onChange('manager_name', v)}
              placeholder="Выбрать менеджера..."
            />
          </Field>
          <Field label="Дизайнер">
            <ManagerCombobox
              value={client.designer}
              onChange={v => onChange('designer', v)}
              placeholder="Выбрать дизайнера..."
            />
          </Field>
          <Field label="Замерщик">
            <ManagerCombobox
              value={client.measurer}
              onChange={v => onChange('measurer', v)}
              placeholder="Выбрать замерщика..."
            />
          </Field>
        </div>
      </Section>

      {/* Профиль клиента */}
      <Section title="Профиль клиента" icon="UserCheck">
        <div className="space-y-5">
          {/* Источник */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Откуда пришёл клиент">
              <select
                className="w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                value={client.source}
                onChange={e => onChange('source', e.target.value)}
              >
                <option value="">— не указан —</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Оценка сотрудничества">
              <div className="py-1">
                <StarRating value={client.rating} onChange={v => onChange('rating', v)} />
              </div>
            </Field>
          </div>

          {/* Теги */}
          <Field label="Теги">
            <TagsEditor tags={client.tags ?? []} onChange={t => onChange('tags', t)} />
          </Field>

          {/* Объект */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Тип помещения">
              <select
                className="w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                value={client.property_type}
                onChange={e => onChange('property_type', e.target.value)}
              >
                <option value="">— не указан —</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Площадь помещения, м²">
              <input
                className={INPUT}
                value={client.property_area}
                onChange={e => onChange('property_area', e.target.value)}
                placeholder="например: 18"
              />
            </Field>
          </div>

          {/* Семья */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => onChange('has_children', !client.has_children)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  client.has_children ? 'bg-gold border-gold' : 'border-border bg-transparent'
                }`}
              >
                {client.has_children && <Icon name="Check" size={12} className="text-black" />}
              </button>
              <span className="text-sm">Есть дети</span>
              <span className="text-xs text-[hsl(var(--text-muted))]">(влагостойкие материалы)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => onChange('has_pets', !client.has_pets)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  client.has_pets ? 'bg-gold border-gold' : 'border-border bg-transparent'
                }`}
              >
                {client.has_pets && <Icon name="Check" size={12} className="text-black" />}
              </button>
              <span className="text-sm">Есть животные</span>
              <span className="text-xs text-[hsl(var(--text-muted))]">(антивандальные)</span>
            </label>
          </div>
        </div>
      </Section>

      {/* Напоминание */}
      <Section title="Напоминание" icon="Bell">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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