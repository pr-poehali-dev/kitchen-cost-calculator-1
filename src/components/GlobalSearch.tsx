import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';

type Section = 'home' | 'clients' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings';

interface Result {
  id: string;
  type: 'client' | 'project' | 'material' | 'section';
  label: string;
  sub?: string;
  icon: string;
  section: Section;
  color?: string;
}

interface Props {
  clients: { id: string; last_name: string; first_name: string; middle_name: string; phone: string; status: string }[];
  onNav: (s: Section) => void;
  onClose: () => void;
}

export default function GlobalSearch({ clients, onNav, onClose }: Props) {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const SECTIONS: Result[] = [
    { id: 'nav-home',     type: 'section', label: 'Главная',   icon: 'House',       section: 'home' },
    { id: 'nav-clients',  type: 'section', label: 'Клиенты',   icon: 'Users',       section: 'clients' },
    { id: 'nav-calc',     type: 'section', label: 'Расчёт',    icon: 'Calculator',  section: 'calc' },
    { id: 'nav-base',     type: 'section', label: 'База',       icon: 'Database',    section: 'base' },
    { id: 'nav-expenses', type: 'section', label: 'Расходы',   icon: 'TrendingUp',  section: 'expenses' },
    { id: 'nav-settings', type: 'section', label: 'Настройки', icon: 'Settings',    section: 'settings' },
  ];

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();

    if (!q) return SECTIONS;

    const out: Result[] = [];

    // Навигация по разделам
    SECTIONS.forEach(s => {
      if (s.label.toLowerCase().includes(q)) out.push(s);
    });

    // Клиенты
    clients.forEach(c => {
      const name = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
      if (
        name.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      ) {
        out.push({
          id: `client-${c.id}`,
          type: 'client',
          label: name || 'Без имени',
          sub: c.phone || c.status,
          icon: 'User',
          section: 'clients',
        });
      }
    });

    // Проекты
    store.projects.forEach(p => {
      const name = p.object || p.client || '';
      if (
        name.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q)
      ) {
        out.push({
          id: `project-${p.id}`,
          type: 'project',
          label: name || 'Без названия',
          sub: p.client || p.address || '',
          icon: 'FolderOpen',
          section: 'calc',
        });
      }
    });

    // Материалы
    store.materials.forEach(m => {
      if (
        m.name.toLowerCase().includes(q) ||
        (m.article || '').toLowerCase().includes(q) ||
        (m.color || '').toLowerCase().includes(q)
      ) {
        const type = store.getTypeById(m.typeId);
        out.push({
          id: `mat-${m.id}`,
          type: 'material',
          label: m.name,
          sub: [m.article, m.color, type?.name].filter(Boolean).join(' · '),
          icon: 'Package',
          section: 'base',
          color: type?.color,
        });
      }
    });

    return out.slice(0, 12);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clients, store.projects, store.materials]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selected]) pick(results[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const pick = (r: Result) => {
    if (r.type === 'project') {
      // Активируем проект
      const projectId = r.id.replace('project-', '');
      store.setState(s => ({ ...s, activeProjectId: projectId }));
    }
    onNav(r.section);
    onClose();
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const TYPE_LABELS: Record<Result['type'], string> = {
    client: 'Клиент',
    project: 'Проект',
    material: 'Материал',
    section: 'Раздел',
  };

  const groupedResults = useMemo(() => {
    const groups: { type: Result['type']; items: Result[] }[] = [];
    results.forEach(r => {
      const g = groups.find(g => g.type === r.type);
      if (g) g.items.push(r);
      else groups.push({ type: r.type, items: [r] });
    });
    return groups;
  }, [results]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[hsl(220,14%,11%)] border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Icon name="Search" size={16} className="text-[hsl(var(--text-muted))] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск клиентов, проектов, материалов..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[hsl(var(--text-muted))]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
              <Icon name="X" size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-[hsl(220,12%,16%)] rounded text-[10px] text-[hsl(var(--text-muted))] border border-border shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-auto scrollbar-thin py-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-[hsl(var(--text-muted))]">
              Ничего не найдено
            </div>
          ) : (
            groupedResults.map(group => {
              let globalIdx = 0;
              results.forEach((r, i) => { if (r.id === group.items[0].id) globalIdx = i; });

              return (
                <div key={group.type}>
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-medium">
                    {TYPE_LABELS[group.type]}
                  </div>
                  {group.items.map((r, localIdx) => {
                    const idx = results.indexOf(r);
                    const isSelected = idx === selected;
                    return (
                      <button
                        key={r.id}
                        onClick={() => pick(r)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-[hsl(220,12%,18%)]' : 'hover:bg-[hsl(220,12%,15%)]'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={r.color
                            ? { backgroundColor: r.color + '22', color: r.color }
                            : { backgroundColor: 'hsl(220,12%,18%)', color: 'hsl(var(--text-muted))' }
                          }
                        >
                          <Icon name={r.icon} size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{r.label}</div>
                          {r.sub && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{r.sub}</div>}
                        </div>
                        {isSelected && (
                          <kbd className="flex items-center gap-1 px-1.5 py-0.5 bg-[hsl(220,12%,22%)] rounded text-[10px] text-[hsl(var(--text-muted))] border border-border shrink-0">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-[hsl(var(--text-muted))]">
          <span className="flex items-center gap-1"><kbd className="bg-[hsl(220,12%,16%)] px-1 rounded border border-border">↑↓</kbd> навигация</span>
          <span className="flex items-center gap-1"><kbd className="bg-[hsl(220,12%,16%)] px-1 rounded border border-border">↵</kbd> открыть</span>
          <span className="flex items-center gap-1"><kbd className="bg-[hsl(220,12%,16%)] px-1 rounded border border-border">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}
