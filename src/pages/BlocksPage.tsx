import { useState } from 'react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store/useStore';
import type { SavedBlock } from '@/store/types';
import Icon from '@/components/ui/icon';
import SavedBlockEditor from './blocks/SavedBlockEditor';
import SavedBlockSettingsPanel from './blocks/SavedBlockSettingsPanel';

function SortableBlockItem({ block, isSelected, onClick }: {
  block: SavedBlock;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`w-full flex items-center gap-1 text-sm transition-all duration-150 ${
        isSelected
          ? 'text-gold bg-[hsl(220,12%,14%)] border-r-2 border-gold'
          : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,12%)]'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="pl-2 py-2.5 text-[hsl(var(--text-muted))] hover:text-gold cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <Icon name="GripVertical" size={12} />
      </button>
      <button
        onClick={onClick}
        className="flex-1 text-left flex items-center gap-2 pr-4 py-2.5 min-w-0"
      >
        <Icon name="Layers" size={13} className="shrink-0 opacity-60" />
        <span className="truncate font-medium">{block.name}</span>
      </button>
    </div>
  );
}

export default function BlocksPage() {
  const store = useStore();
  const savedBlocks = store.savedBlocks || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = savedBlocks.findIndex(b => b.id === active.id);
    const newIdx = savedBlocks.findIndex(b => b.id === over.id);
    const reordered = arrayMove(savedBlocks, oldIdx, newIdx);
    store.reorderSavedBlocks(reordered.map(b => b.id));
  };
  const [selectedId, setSelectedId] = useState<string | null>(savedBlocks[0]?.id ?? null);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filteredBlocks = search.trim()
    ? savedBlocks.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : savedBlocks;

  const selected = savedBlocks.find(b => b.id === selectedId) ?? null;
  const currency = store.settings.currency;
  const activeProjectId = store.activeProjectId;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = store.createSavedBlock(newName.trim());
    setSelectedId(id);
    setNewName('');
    setShowNewForm(false);
  };

  const [pickerStep, setPickerStep] = useState<'project' | 'assembly'>('project');
  const [pickerProjectId, setPickerProjectId] = useState<string | null>(null);

  const handleInsertToProject = (block: SavedBlock, targetProjectId: string, assemblyId?: string) => {
    store.insertSavedBlockToProject(targetProjectId, block.id, assemblyId);
    setShowProjectPicker(false);
    setPickerStep('project');
    setPickerProjectId(null);
  };

  const openProjectPicker = () => {
    setPickerStep('project');
    setPickerProjectId(null);
    setShowProjectPicker(v => !v);
  };

  return (
    <div className="flex h-full">
      {/* Левая панель — список блоков */}
      <div className="w-56 shrink-0 border-r border-border bg-[hsl(220,16%,7%)] flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">
            Блоки {savedBlocks.length > 0 && <span className="opacity-60">({savedBlocks.length})</span>}
          </span>
          <button
            onClick={() => setShowNewForm(v => !v)}
            className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            title="Новый блок"
          >
            <Icon name="Plus" size={15} />
          </button>
        </div>

        {showNewForm && (
          <div className="px-3 py-2 border-b border-border flex gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false); }}
              placeholder="Название блока"
              className="flex-1 bg-[hsl(220,12%,14%)] border border-border rounded px-2 py-1 text-xs outline-none focus:border-gold"
            />
            <button onClick={handleCreate} className="px-2 py-1 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-semibold">
              OK
            </button>
          </div>
        )}

        {/* Поиск */}
        {savedBlocks.length > 3 && (
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Icon name="Search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск блока..."
                className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-6 pr-2 py-1 text-xs outline-none focus:border-gold transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
                  <Icon name="X" size={10} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto scrollbar-thin py-1">
          {savedBlocks.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[hsl(var(--text-muted))] opacity-60">
              Нет блоков.<br />Нажми + чтобы создать
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-[hsl(var(--text-muted))] opacity-60">
              Не найдено
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {filteredBlocks.map(block => {
                  const rowCount = block.rows.length + (block.assemblies || []).reduce((s, a) => s + a.rows.length, 0);
                  return (
                    <div key={block.id} className="group/item relative">
                      <SortableBlockItem
                        block={block}
                        isSelected={selectedId === block.id}
                        onClick={() => setSelectedId(block.id)}
                      />
                      {/* Кнопка предпросмотра */}
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewId(previewId === block.id ? null : block.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-gold opacity-0 group-hover/item:opacity-100 transition-all"
                        title="Предпросмотр содержимого"
                      >
                        <Icon name="Eye" size={12} />
                      </button>
                      {/* Предпросмотр */}
                      {previewId === block.id && (
                        <div className="mx-2 mb-1 bg-[hsl(220,12%,11%)] border border-border rounded overflow-hidden text-xs">
                          {rowCount === 0 ? (
                            <div className="px-3 py-2 text-[hsl(var(--text-muted))]">Нет строк</div>
                          ) : (
                            <>
                              {block.rows.slice(0, 5).map(r => (
                                <div key={r.id} className="flex items-center justify-between px-3 py-1 border-b border-[hsl(220,12%,14%)] last:border-0">
                                  <span className="text-[hsl(var(--text-dim))] truncate flex-1">{r.name || '—'}</span>
                                  <span className="text-[hsl(var(--text-muted))] shrink-0 ml-2">{r.qty} {r.unit}</span>
                                </div>
                              ))}
                              {block.rows.length > 5 && (
                                <div className="px-3 py-1 text-[hsl(var(--text-muted))] text-center">
                                  +{block.rows.length - 5} строк...
                                </div>
                              )}
                              {(block.assemblies || []).length > 0 && (
                                <div className="px-3 py-1 border-t border-border text-[hsl(var(--text-muted))]">
                                  {(block.assemblies || []).length} сборок
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Правая панель — редактор */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Icon name="Layers" size={40} className="text-[hsl(var(--text-muted))] opacity-20" />
            <div className="text-sm text-[hsl(var(--text-muted))]">Выбери блок слева или создай новый</div>
          </div>
        ) : (
          <>
            {/* Шапка редактора */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-[hsl(220,14%,9%)] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{selected.name}</span>
                {selected.note && <span className="text-xs text-[hsl(var(--text-muted))]">{selected.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                {store.projects.length > 0 ? (
                  <div className="relative">
                    <button
                      onClick={openProjectPicker}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Icon name="FolderInput" size={13} />
                      В проект
                      <Icon name="ChevronDown" size={11} />
                    </button>
                    {showProjectPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setShowProjectPicker(false); setPickerStep('project'); }} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl min-w-[220px] py-1 overflow-hidden">

                          {pickerStep === 'project' && (
                            <>
                              <div className="px-3 py-1.5 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-border mb-1">
                                Выбери проект
                              </div>
                              {store.projects.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    const assemblies = selected.assemblies || [];
                                    if (assemblies.length > 0) {
                                      setPickerProjectId(p.id);
                                      setPickerStep('assembly');
                                    } else {
                                      handleInsertToProject(selected, p.id);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2 ${p.id === activeProjectId ? 'text-gold' : 'text-foreground'}`}
                                >
                                  <Icon name="FolderOpen" size={13} className="shrink-0 opacity-60" />
                                  <span className="truncate">{p.object || p.client || 'Без названия'}</span>
                                  {p.id === activeProjectId && <span className="ml-auto text-xs opacity-60 shrink-0">активный</span>}
                                </button>
                              ))}
                            </>
                          )}

                          {pickerStep === 'assembly' && pickerProjectId && (
                            <>
                              <div className="px-3 py-1.5 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-border flex items-center gap-2">
                                <button onClick={() => setPickerStep('project')} className="hover:text-foreground transition-colors">
                                  <Icon name="ChevronLeft" size={12} />
                                </button>
                                Выбери сборку
                              </div>
                              <button
                                onClick={() => handleInsertToProject(selected, pickerProjectId)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2 text-[hsl(var(--text-dim))]"
                              >
                                <Icon name="Layers" size={13} className="shrink-0 opacity-60" />
                                <span>Все строки блока</span>
                              </button>
                              <div className="border-t border-border my-1" />
                              {(selected.assemblies || []).map(asm => (
                                <button
                                  key={asm.id}
                                  onClick={() => handleInsertToProject(selected, pickerProjectId, asm.id)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2 text-foreground"
                                >
                                  <Icon name="Package" size={13} className="shrink-0 opacity-60" />
                                  <span className="truncate">{asm.name}</span>
                                  <span className="ml-auto text-xs text-[hsl(var(--text-muted))] shrink-0">{asm.rows.length} стр.</span>
                                </button>
                              ))}
                            </>
                          )}

                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-[hsl(var(--text-muted))]">Нет проектов</span>
                )}
                <button
                  onClick={async () => {
                    if (await confirmDialog({ message: `Удалить блок «${selected.name}»? Все наборы и строки в нём будут потеряны.` })) {
                      store.deleteSavedBlock(selected.id);
                    }
                  }}
                  className="p-1.5 text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                  title="Удалить блок"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-auto scrollbar-thin p-4 md:p-6">
              <SavedBlockEditor
                block={selected}
                currency={currency}
                onOpenSettings={() => setSettingsBlockId(selected.id)}
                onDelete={async () => {
                  if (await confirmDialog({ message: `Удалить блок «${selected.name}»? Все наборы и строки в нём будут потеряны.` })) {
                    store.deleteSavedBlock(selected.id);
                    setSelectedId(savedBlocks.find(b => b.id !== selected.id)?.id ?? null);
                  }
                }}
              />
            </div>
          </>
        )}
      </div>

      {settingsBlockId && (() => {
        const b = savedBlocks.find(x => x.id === settingsBlockId);
        return b ? <SavedBlockSettingsPanel block={b} onClose={() => setSettingsBlockId(null)} /> : null;
      })()}
    </div>
  );
}