import { useStore } from '@/store/useStore';
import type { Project } from '@/store/types';
import Icon from '@/components/ui/icon';
import { MESSENGERS, fmt } from './constants';

interface Props {
  project: Project;
  totalMaterials: number;
  totalServices: number;
  total: number;
  showProjects: boolean;
  onToggleProjects: () => void;
  onStopPropagation: (e: React.MouseEvent) => void;
}

function InlineEdit({ value, onChange, placeholder = '', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--gold))] outline-none transition-colors duration-150 ${className}`}
    />
  );
}

export default function CalcHeader({ project, totalMaterials, totalServices, total, showProjects, onToggleProjects, onStopPropagation }: Props) {
  const store = useStore();

  return (
    <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="relative" onClick={onStopPropagation}>
          <button
            onClick={onToggleProjects}
            className="flex items-center gap-2 text-[hsl(var(--text-dim))] hover:text-foreground transition-colors text-sm"
          >
            <Icon name="FolderOpen" size={14} />
            <span className="font-medium">{project.object || 'Проект'}</span>
            <Icon name="ChevronDown" size={12} />
          </button>
          {showProjects && (
            <div className="absolute top-8 left-0 z-50 bg-[hsl(220,14%,11%)] border border-border rounded shadow-xl min-w-64">
              {store.projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { store.setState(s => ({ ...s, activeProjectId: p.id })); onToggleProjects(); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[hsl(220,12%,16%)] flex items-center justify-between ${p.id === project.id ? 'text-gold' : 'text-foreground'}`}
                >
                  <span>{p.object || 'Без названия'}</span>
                  <span className="text-[hsl(var(--text-muted))] text-xs ml-4">{p.client}</span>
                </button>
              ))}
              <div className="border-t border-border">
                <button
                  onClick={() => { store.createProject(); onToggleProjects(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gold hover:bg-[hsl(220,12%,16%)] flex items-center gap-2"
                >
                  <Icon name="Plus" size={13} /> Новый проект
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[hsl(var(--text-muted))]">Материалы: <span className="font-mono text-foreground">{fmt(totalMaterials)}</span></span>
            <span className="text-[hsl(var(--border))]">·</span>
            <span className="text-[hsl(var(--text-muted))]">Услуги: <span className="font-mono text-foreground">{fmt(totalServices)}</span></span>
          </div>
          <div className="text-right">
            <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого</div>
            <div className="text-gold font-mono font-semibold text-lg">{fmt(total)} {store.settings.currency}</div>
          </div>
        </div>
      </div>

      {/* Project info fields */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Клиент', key: 'client' as const, placeholder: 'ФИО клиента' },
          { label: 'Изделие', key: 'object' as const, placeholder: 'Название изделия', colSpan: 2 },
          { label: 'Телефон', key: 'phone' as const, placeholder: '+7 000 000-00-00' },
          { label: 'Адрес', key: 'address' as const, placeholder: 'Адрес объекта' },
        ].map(f => (
          <div key={f.key} className={f.colSpan === 2 ? 'col-span-2' : ''}>
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">{f.label}</label>
            <InlineEdit
              value={project[f.key]}
              onChange={v => store.updateProjectInfo(project.id, { [f.key]: v })}
              placeholder={f.placeholder}
              className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
        ))}
        <div>
          <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Мессенджер</label>
          <select
            value={project.messenger}
            onChange={e => store.updateProjectInfo(project.id, { messenger: e.target.value as typeof project.messenger })}
            className="bg-transparent text-sm text-foreground border-b border-transparent focus:border-[hsl(var(--gold))] outline-none w-full"
          >
            {MESSENGERS.map(m => <option key={m} value={m} className="bg-[hsl(220,14%,11%)]">{m}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}