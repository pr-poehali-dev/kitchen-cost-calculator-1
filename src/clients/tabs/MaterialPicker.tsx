import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { INPUT } from '../ClientCardShared';
import { useStore } from '@/store/useStore';

interface Props {
  value: string;
  onChange: (v: string) => void;
  clientId: string;
  placeholder?: string;
}

export default function MaterialPicker({ value, onChange, clientId, placeholder }: Props) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const linked = store.projects.filter(p => p.clientId === clientId);

  // Собираем уникальные имена для проверки наличия
  const items: string[] = [];
  const seen = new Set<string>();
  linked.forEach(p => {
    p.blocks.forEach(b => {
      b.rows.forEach(r => {
        if (!r.name.trim()) return;
        const label = r.name.trim();
        if (!seen.has(label)) { seen.add(label); items.push(label); }
      });
    });
  });

  // Группируем по блокам расчётов
  const groups: { blockName: string; items: string[] }[] = [];
  linked.forEach(p => {
    p.blocks.forEach(b => {
      const blockItems: string[] = [];
      const blockSeen = new Set<string>();
      b.rows.forEach(r => {
        if (!r.name.trim()) return;
        const label = r.name.trim();
        if (!blockSeen.has(label)) { blockSeen.add(label); blockItems.push(label); }
      });
      if (blockItems.length > 0) {
        groups.push({ blockName: `${p.object ? p.object + ' — ' : ''}${b.name}`, items: blockItems });
      }
    });
  });

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1.5">
        <input
          className={INPUT + ' flex-1'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Введите или выберите из расчёта'}
        />
        {linked.length > 0 && items.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            title="Выбрать из расчёта"
            className={`px-2 rounded border transition-colors shrink-0 ${open ? 'border-gold/50 text-gold bg-gold/10' : 'border-border text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/40'}`}
          >
            <Icon name="Calculator" size={13} />
          </button>
        )}
      </div>
      {open && groups.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {groups.map((g, gi) => (
            <div key={gi}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] bg-[hsl(220,14%,10%)] sticky top-0">
                {g.blockName}
              </div>
              {g.items.map((item, ii) => (
                <button
                  key={ii}
                  type="button"
                  onClick={() => { onChange(item); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,20%)] transition-colors ${value === item ? 'text-gold bg-gold/5' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
