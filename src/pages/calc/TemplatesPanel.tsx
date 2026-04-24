import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function TemplatesPanel({ projectId, onClose }: Props) {
  const store = useStore();
  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);

  const handleSave = () => {
    if (!saveName.trim()) return;
    store.saveTemplate(projectId, saveName.trim(), saveDesc.trim() || undefined);
    setSaveName('');
    setSaveDesc('');
    setMode('list');
  };

  const handleLoad = (templateId: string) => {
    store.loadTemplate(projectId, templateId);
    setConfirmLoad(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 animate-fade-in max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">Шаблоны расчётов</span>
            <span className="text-xs text-[hsl(var(--text-muted))]">{store.templates.length} шт.</span>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'list' && (
              <button
                onClick={() => setMode('save')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90"
              >
                <Icon name="Save" size={12} /> Сохранить текущий
              </button>
            )}
            <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Save form */}
        {mode === 'save' && (
          <div className="px-5 py-4 border-b border-border space-y-3 shrink-0">
            <div className="text-xs text-[hsl(var(--text-muted))] mb-1">Сохранить текущую структуру блоков как шаблон</div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1 block">Название шаблона *</label>
              <input
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Напр.: Кухня П-образная, Шкаф-купе..."
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1 block">Описание</label>
              <input
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
                placeholder="Краткое описание состава шаблона"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                Сохранить шаблон
              </button>
              <button onClick={() => setMode('list')} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Templates list */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {store.templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Icon name="LayoutTemplate" size={32} className="text-[hsl(var(--text-muted))] mb-3" />
              <p className="text-[hsl(var(--text-muted))] text-sm">Нет сохранённых шаблонов</p>
              <p className="text-[hsl(var(--text-muted))] text-xs mt-1">Настройте блоки и нажмите «Сохранить текущий»</p>
            </div>
          )}

          {store.templates.map(tpl => (
            <div key={tpl.id} className="px-5 py-4 border-b border-border hover:bg-[hsl(220,12%,13%)] transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{tpl.name}</span>
                    <span className="text-xs text-[hsl(var(--text-muted))]">{tpl.createdAt}</span>
                  </div>
                  {tpl.description && (
                    <div className="text-xs text-[hsl(var(--text-dim))] mt-0.5">{tpl.description}</div>
                  )}
                  {/* Block pills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.blocks.map((b, i) => (
                      <span key={i} className="text-xs bg-[hsl(220,12%,18%)] px-2 py-0.5 rounded text-[hsl(var(--text-dim))]">
                        {b.name}
                      </span>
                    ))}
                    {tpl.serviceBlocks.map((sb, i) => (
                      <span key={i} className="text-xs bg-[hsl(220,12%,18%)] px-2 py-0.5 rounded text-[hsl(var(--text-dim))] border border-[hsl(var(--gold))]/20">
                        {sb.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {confirmLoad === tpl.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[hsl(var(--text-muted))]">Заменить блоки?</span>
                      <button onClick={() => handleLoad(tpl.id)}
                        className="px-2.5 py-1 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium">Да</button>
                      <button onClick={() => setConfirmLoad(null)}
                        className="px-2.5 py-1 border border-border rounded text-xs text-[hsl(var(--text-dim))]">Нет</button>
                    </div>
                  ) : confirmDelete === tpl.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[hsl(var(--text-muted))]">Удалить?</span>
                      <button onClick={() => { store.deleteTemplate(tpl.id); setConfirmDelete(null); }}
                        className="px-2.5 py-1 bg-destructive text-white rounded text-xs">Да</button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="px-2.5 py-1 border border-border rounded text-xs text-[hsl(var(--text-dim))]">Нет</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmLoad(tpl.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gold border border-[hsl(38,40%,30%)] bg-[hsl(38,40%,12%)] rounded hover:bg-[hsl(38,40%,18%)] transition-colors"
                      >
                        <Icon name="Download" size={12} /> Загрузить
                      </button>
                      <button
                        onClick={() => setConfirmDelete(tpl.id)}
                        className="p-1.5 text-[hsl(var(--text-muted))] hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
