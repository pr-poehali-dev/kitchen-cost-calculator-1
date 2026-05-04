import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import type { SavedBlock } from '@/store/types';

interface Props {
  projectId: string;
  onClose: () => void;
}

type Tab = 'templates' | 'blocks';

function AssemblyPicker({ block, onPick }: { block: SavedBlock; onPick: (assemblyId?: string) => void }) {
  const assemblies = block.assemblies || [];
  if (assemblies.length === 0) {
    onPick(undefined);
    return null;
  }
  return (
    <div className="mt-2 p-3 bg-[hsl(220,12%,10%)] border border-border rounded-lg space-y-1.5 animate-fade-in">
      <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Выберите сборку:</div>
      {assemblies.map(a => (
        <button
          key={a.id}
          onClick={() => onPick(a.id)}
          className="w-full text-left px-3 py-2 rounded bg-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,20%)] transition-colors text-sm flex items-center justify-between group"
        >
          <span>{a.name}</span>
          <span className="text-xs text-[hsl(var(--text-muted))] group-hover:text-gold transition-colors">
            {a.rows.length} строк
          </span>
        </button>
      ))}
      <button
        onClick={() => onPick(undefined)}
        className="w-full text-left px-3 py-2 rounded border border-dashed border-border hover:border-gold/40 text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
      >
        Базовый набор строк
      </button>
    </div>
  );
}

export default function TemplatesPanel({ projectId, onClose }: Props) {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('templates');
  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);
  const [pickingAssemblyFor, setPickingAssemblyFor] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

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

  const handleOverwrite = (templateId: string) => {
    store.overwriteTemplate(templateId, projectId);
    setConfirmOverwrite(null);
  };

  const handleInsertBlock = (blockId: string, assemblyId?: string) => {
    store.insertSavedBlockToProject(projectId, blockId, assemblyId);
    setPickingAssemblyFor(null);
    setInsertedId(blockId);
    setTimeout(() => setInsertedId(null), 1500);
  };

  const handleBlockClick = (block: SavedBlock) => {
    if (pickingAssemblyFor === block.id) {
      setPickingAssemblyFor(null);
      return;
    }
    const assemblies = block.assemblies || [];
    if (assemblies.length > 0) {
      setPickingAssemblyFor(block.id);
    } else {
      handleInsertBlock(block.id);
    }
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
            {/* Вкладки */}
            <div className="flex gap-1">
              <button
                onClick={() => { setTab('templates'); setMode('list'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === 'templates'
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'text-[hsl(var(--text-muted))] hover:text-foreground border border-transparent'
                }`}
              >
                <Icon name="LayoutTemplate" size={12} />
                Шаблоны
                {store.templates.length > 0 && (
                  <span className="bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] rounded-full px-1.5 text-[10px]">
                    {store.templates.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setTab('blocks'); setPickingAssemblyFor(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === 'blocks'
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'text-[hsl(var(--text-muted))] hover:text-foreground border border-transparent'
                }`}
              >
                <Icon name="Layers" size={12} />
                Блоки
                {store.savedBlocks.length > 0 && (
                  <span className="bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] rounded-full px-1.5 text-[10px]">
                    {store.savedBlocks.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'templates' && mode === 'list' && (
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

        {/* ── Шаблоны ── */}
        {tab === 'templates' && (
          <>
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
                      ) : confirmOverwrite === tpl.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[hsl(var(--text-muted))]">Перезаписать шаблон?</span>
                          <button onClick={() => handleOverwrite(tpl.id)}
                            className="px-2.5 py-1 bg-[hsl(30,70%,40%)] text-white rounded text-xs font-medium">Да</button>
                          <button onClick={() => setConfirmOverwrite(null)}
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
                            title="Загрузить в текущий расчёт"
                          >
                            <Icon name="Download" size={12} /> Загрузить
                          </button>
                          <button
                            onClick={() => setConfirmOverwrite(tpl.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[hsl(var(--text-dim))] border border-border rounded hover:border-[hsl(var(--text-dim))] hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                            title="Обновить шаблон из текущего расчёта"
                          >
                            <Icon name="RefreshCw" size={11} />
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
          </>
        )}

        {/* ── Блоки ── */}
        {tab === 'blocks' && (
          <div className="flex-1 overflow-auto scrollbar-thin">
            {store.savedBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Icon name="Layers" size={32} className="text-[hsl(var(--text-muted))] mb-3" />
                <p className="text-[hsl(var(--text-muted))] text-sm">Нет сохранённых блоков</p>
                <p className="text-[hsl(var(--text-muted))] text-xs mt-1">Создайте блоки в разделе «Блоки»</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-2.5 border-b border-border bg-[hsl(220,14%,9%)]">
                  <p className="text-xs text-[hsl(var(--text-muted))]">
                    Нажмите на блок — он добавится в расчёт новым блоком материалов
                  </p>
                </div>
                {store.savedBlocks.map(block => {
                  const assemblies = block.assemblies || [];
                  const rowCount = block.rows.length;
                  const isPicking = pickingAssemblyFor === block.id;
                  const isInserted = insertedId === block.id;

                  return (
                    <div key={block.id} className="px-5 py-3 border-b border-border">
                      <button
                        onClick={() => handleBlockClick(block)}
                        className={`w-full text-left transition-colors rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 group ${
                          isInserted
                            ? 'bg-[hsl(140,40%,12%)] border border-[hsl(140,40%,25%)]'
                            : isPicking
                            ? 'bg-gold/10 border border-gold/30'
                            : 'bg-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,18%)] border border-transparent hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isInserted ? 'bg-emerald-400' : isPicking ? 'bg-gold' : 'bg-[hsl(220,12%,28%)]'}`}
                            style={block.rows[0]?.typeId ? {} : {}} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{block.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[hsl(var(--text-muted))]">
                                {rowCount} {rowCount === 1 ? 'строка' : rowCount < 5 ? 'строки' : 'строк'}
                              </span>
                              {assemblies.length > 0 && (
                                <span className="text-[10px] text-gold/70">
                                  {assemblies.length} сборки
                                </span>
                              )}
                              {block.note && (
                                <span className="text-[10px] text-[hsl(var(--text-muted))] truncate max-w-[120px]">
                                  · {block.note}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isInserted ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <Icon name="Check" size={13} /> Добавлен
                            </span>
                          ) : isPicking ? (
                            <span className="text-xs text-gold">Выберите сборку ↓</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] group-hover:text-gold transition-colors">
                              <Icon name="Plus" size={13} />
                              {assemblies.length > 0 ? 'Выбрать' : 'Добавить'}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Выбор сборки */}
                      {isPicking && (
                        <AssemblyPicker
                          block={block}
                          onPick={assemblyId => handleInsertBlock(block.id, assemblyId)}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
