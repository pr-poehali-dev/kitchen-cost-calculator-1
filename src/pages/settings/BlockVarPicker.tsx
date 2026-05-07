import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { VAR_GROUPS } from './docTemplateTypes';

export default function BlockVarPicker({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filtered = q
    ? VAR_GROUPS.map(g => ({
        ...g,
        vars: g.vars.filter(v =>
          v.key.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q) || v.preview.toLowerCase().includes(q)
        ),
      })).filter(g => g.vars.length > 0)
    : VAR_GROUPS;

  const totalCount = VAR_GROUPS.reduce((s, g) => s + g.vars.length, 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(p => !p); setQuery(''); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
        title="Вставить переменную"
      >
        <Icon name="Braces" size={10} /> Переменная
      </button>
      {open && (
        <>
          {/* Оверлей для закрытия */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-2xl flex flex-col"
               style={{ width: 320, maxHeight: 440 }}>
            {/* Шапка */}
            <div className="px-3 pt-2.5 pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Braces" size={12} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground">Переменные</span>
                <span className="ml-auto text-[10px] text-[hsl(var(--text-muted))]">{totalCount} шт.</span>
              </div>
              {/* Поиск */}
              <div className="relative">
                <Icon name="Search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="w-full bg-[hsl(220,14%,10%)] border border-border rounded pl-6 pr-2 py-1 text-[11px] text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-emerald-500/50"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
                    <Icon name="X" size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Список */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-[hsl(var(--text-muted))]">
                  Ничего не найдено
                </div>
              ) : (
                filtered.map(group => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-[10px] text-[hsl(var(--text-muted))] font-semibold uppercase tracking-wide border-b border-border/40 bg-[hsl(220,14%,10%)] sticky top-0">
                      {group.label}
                      <span className="ml-1.5 normal-case font-normal opacity-60">({group.vars.length})</span>
                    </div>
                    {group.vars.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => { onInsert(v.key); setOpen(false); setQuery(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 transition-colors group border-b border-border/20 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-emerald-400 font-mono group-hover:text-emerald-300">{v.key}</span>
                          <span className="text-[10px] text-[hsl(var(--text-muted))] truncate text-right">{v.preview}</span>
                        </div>
                        <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Подсказка */}
            <div className="px-3 py-2 border-t border-border shrink-0 flex items-center gap-1.5">
              <Icon name="Info" size={10} className="text-[hsl(var(--text-muted))] shrink-0" />
              <span className="text-[10px] text-[hsl(var(--text-muted))]">Кликни — вставится в позицию курсора</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
