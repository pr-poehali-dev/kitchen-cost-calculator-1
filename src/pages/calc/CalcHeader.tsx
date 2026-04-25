import { useStore } from '@/store/useStore';
import type { Project } from '@/store/types';
import Icon from '@/components/ui/icon';
import { MESSENGERS, fmt } from './constants';

interface Props {
  project: Project;
  totalMaterials: number;
  totalServices: number;
  total: number;
  grandTotal: number;
  totalPurchase: number;
  showProjects: boolean;
  confirmDeleteProject: string | null;
  onToggleProjects: () => void;
  onStopPropagation: (e: React.MouseEvent) => void;
  onOpenTemplates: () => void;
  onExportPdf: () => void;
  onOpenClientView: () => void;
  onRequestDeleteProject: (id: string) => void;
  onConfirmDeleteProject: (id: string) => void;
  onCancelDeleteProject: () => void;
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

export default function CalcHeader({
  project, totalMaterials, totalServices, total, grandTotal, totalPurchase,
  showProjects, confirmDeleteProject,
  onToggleProjects, onStopPropagation,
  onOpenTemplates, onExportPdf, onOpenClientView,
  onRequestDeleteProject, onConfirmDeleteProject, onCancelDeleteProject,
}: Props) {
  const store = useStore();

  return (
    <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
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
              <div className="absolute top-8 left-0 z-50 bg-[hsl(220,14%,11%)] border border-border rounded shadow-xl min-w-72">
                <div className="py-1">
                  {store.projects.map(p => (
                    <div
                      key={p.id}
                      className={`group flex items-center justify-between px-3 py-2 hover:bg-[hsl(220,12%,16%)] transition-colors ${p.id === project.id ? 'border-l-2 border-gold' : 'border-l-2 border-transparent'}`}
                    >
                      {confirmDeleteProject === p.id ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="text-xs text-[hsl(var(--text-muted))]">Удалить «{p.object || 'Без названия'}»?</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onConfirmDeleteProject(p.id)}
                              className="px-2 py-0.5 bg-destructive text-white rounded text-xs font-medium"
                            >Да</button>
                            <button
                              onClick={onCancelDeleteProject}
                              className="px-2 py-0.5 border border-border rounded text-xs text-[hsl(var(--text-dim))]"
                            >Нет</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { store.setState(s => ({ ...s, activeProjectId: p.id })); onToggleProjects(); }}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className={`text-sm truncate ${p.id === project.id ? 'text-gold font-medium' : 'text-foreground'}`}>
                              {p.object || 'Без названия'}
                            </div>
                            {p.client && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{p.client}</div>}
                          </button>
                          <button
                            onClick={() => onRequestDeleteProject(p.id)}
                            className="ml-2 p-1 text-[hsl(var(--text-muted))] hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Удалить проект"
                          >
                            <Icon name="Trash2" size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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

          {/* Templates & PDF buttons */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-dim))] hover:text-foreground border border-border rounded hover:border-[hsl(var(--text-dim))] transition-colors"
              title="Шаблоны расчётов"
            >
              <Icon name="LayoutTemplate" size={13} />
              <span>Шаблоны</span>
              {store.templates.length > 0 && (
                <span className="bg-[hsl(220,12%,20%)] text-[hsl(var(--text-muted))] text-xs px-1.5 py-0.5 rounded-full">{store.templates.length}</span>
              )}
            </button>
            <button
              onClick={onOpenClientView}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-dim))] hover:text-foreground border border-border rounded hover:border-[hsl(var(--text-dim))] transition-colors"
              title="Настройки PDF для клиента"
            >
              <Icon name="Eye" size={13} />
              <span>Клиенту</span>
            </button>
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-dim))] hover:text-foreground border border-border rounded hover:border-[hsl(var(--text-dim))] transition-colors"
              title="Выгрузить PDF для клиента"
            >
              <Icon name="FileDown" size={13} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm flex-wrap justify-end">
            <span className="text-[hsl(var(--text-muted))]">Материалы: <span className="font-mono text-foreground">{fmt(totalMaterials)}</span></span>
            <span className="text-[hsl(var(--border))]">·</span>
            <span className="text-[hsl(var(--text-muted))]">Услуги: <span className="font-mono text-foreground">{fmt(totalServices)}</span></span>
            {totalPurchase > 0 && (
              <>
                <span className="text-[hsl(var(--border))]">·</span>
                <span className="text-[hsl(var(--text-muted))]">Закупка: <span className="font-mono text-[hsl(200,60%,70%)]">{fmt(totalPurchase)}</span></span>
              </>
            )}
          </div>
          <div className="text-right">
            {grandTotal !== total && (
              <div className="text-[hsl(var(--text-muted))] text-xs font-mono mb-0.5">
                до расходов: {fmt(total)} {store.settings.currency}
              </div>
            )}
            <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого</div>
            <div className="text-gold font-mono font-semibold text-lg">{fmt(grandTotal)} {store.settings.currency}</div>
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