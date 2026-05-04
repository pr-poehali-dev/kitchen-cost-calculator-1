import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Client } from '../types';
import { INPUT, Field, Section } from '../ClientCardShared';

export const SOURCES = ['Авито', 'Instagram', 'ВКонтакте', 'Сайт', 'Сарафан', 'Выставка', 'Звонок', 'Повторный', 'Другое'];
export const PRESET_TAGS = ['ВИП', 'Повторный', 'Проблемный', 'Юрлицо', 'Рассрочка', 'Срочно'];
export const PROPERTY_TYPES = ['Квартира', 'Частный дом', 'Таунхаус', 'Офис', 'Апартаменты', 'Новостройка'];

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

export function ClientProfileSection({ client, onChange }: {
  client: Client;
  onChange: (f: keyof Client, v: unknown) => void;
}) {
  return (
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
  );
}
