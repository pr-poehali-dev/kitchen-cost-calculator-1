import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { INPUT } from '../ClientCardShared';
import { useManagers } from '../useManagers';

export function ManagerCombobox({ value, onChange, placeholder }: {
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
