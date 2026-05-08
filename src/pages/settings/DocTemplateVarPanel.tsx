import { useState } from 'react';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { VARS, VAR_GROUPS } from './docTemplateTypes';

interface Props {
  onInsert: ((v: string) => void) | null;
}

export default function DocTemplateVarPanel({ onInsert }: Props) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const hasTarget = !!onInsert;

  const filtered = VAR_GROUPS
    .filter(g => !activeGroup || g.label === activeGroup)
    .map(g => ({
      ...g,
      vars: q ? g.vars.filter(v => v.key.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)) : g.vars,
    }))
    .filter(g => g.vars.length > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Шапка */}
      <div className="px-3 py-2 bg-[hsl(220,14%,10%)] border-b border-border flex items-center gap-2">
        <Icon name="Braces" size={12} className="text-blue-400 shrink-0" />
        <span className="text-[11px] font-medium text-foreground">Доступные переменные</span>
        {hasTarget ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Icon name="MousePointerClick" size={10} />
            вставится в блок
          </span>
        ) : (
          <span className="text-[10px] text-[hsl(var(--text-muted))]">— открой блок для вставки</span>
        )}
        <span className="ml-auto text-[10px] text-[hsl(var(--text-muted))]">{VARS.length} шт.</span>
      </div>

      {/* Поиск + фильтр групп */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-[hsl(220,14%,12%)] border border-border rounded pl-6 pr-6 py-1 text-[11px] text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-blue-500/50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
              <Icon name="X" size={10} />
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveGroup(null)}
          className={`px-2 py-1 rounded text-[10px] transition-all shrink-0 ${!activeGroup ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'text-[hsl(var(--text-muted))] border border-border hover:text-foreground'}`}
        >
          Все
        </button>
      </div>

      {/* Группы — горизонтальный скролл */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border scrollbar-none">
        {VAR_GROUPS.map(g => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(activeGroup === g.label ? null : g.label)}
            className={`shrink-0 px-2 py-0.5 rounded border text-[10px] transition-all ${activeGroup === g.label ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'text-[hsl(var(--text-muted))] border-border hover:text-foreground hover:border-border/80'}`}
          >
            {g.label.replace(' — основное', '')}
            <span className="ml-1 opacity-60">{g.vars.length}</span>
          </button>
        ))}
      </div>

      {/* Переменные */}
      <div className="p-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-[hsl(var(--text-muted))] px-1 py-2">Ничего не найдено</p>
        ) : (
          filtered.flatMap(g => g.vars).map(v => (
            <button
              key={v.key}
              onClick={() => {
                if (onInsert) {
                  onInsert(v.key);
                  toast.success(`Вставлено: ${v.key}`);
                } else {
                  navigator.clipboard.writeText(v.key);
                  toast.success(`Скопировано: ${v.key}`);
                }
              }}
              title={`${v.desc}\nПример: ${v.preview}`}
              className={`px-2 py-0.5 border rounded text-[10px] transition-all ${
                hasTarget
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/60'
              }`}
            >
              {v.key}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
