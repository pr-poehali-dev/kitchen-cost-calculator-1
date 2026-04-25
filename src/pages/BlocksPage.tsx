import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS } from './calc/constants';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

interface SavedBlock {
  id: string;
  name: string;
  allowedTypeIds: string[];
  visibleColumns: CalcColumnKey[];
  createdAt: string;
  note?: string;
}

const STORAGE_KEY = 'kuhni-pro-saved-blocks';

function loadBlocks(): SavedBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBlocks(blocks: SavedBlock[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function BlocksPage() {
  const store = useStore();
  const [blocks, setBlocks] = useState<SavedBlock[]>(loadBlocks);
  const [editing, setEditing] = useState<SavedBlock | null>(null);
  const [showForm, setShowForm] = useState(false);

  const allTypes = store.settings.materialTypes;

  const update = (next: SavedBlock[]) => {
    setBlocks(next);
    saveBlocks(next);
  };

  const openNew = () => {
    setEditing({
      id: uid(),
      name: '',
      allowedTypeIds: [],
      visibleColumns: ['material', 'thickness', 'unit', 'qty', 'price', 'total'],
      createdAt: new Date().toISOString().slice(0, 10),
      note: '',
    });
    setShowForm(true);
  };

  const openEdit = (b: SavedBlock) => {
    setEditing({ ...b });
    setShowForm(true);
  };

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) return;
    const exists = blocks.find(b => b.id === editing.id);
    const next = exists
      ? blocks.map(b => b.id === editing.id ? editing : b)
      : [...blocks, editing];
    update(next);
    setShowForm(false);
    setEditing(null);
  };

  const deleteBlock = (id: string) => {
    update(blocks.filter(b => b.id !== id));
  };

  const addToProject = (block: SavedBlock) => {
    const pid = store.activeProjectId;
    if (!pid) return;
    store.addBlock(pid);
    setTimeout(() => {
      const project = store.projects.find(p => p.id === pid);
      const newBlock = project?.blocks[project.blocks.length - 1];
      if (!newBlock) return;
      store.updateBlock(pid, newBlock.id, {
        name: block.name,
        allowedTypeIds: block.allowedTypeIds,
        visibleColumns: block.visibleColumns,
      });
    }, 0);
  };

  const toggleType = (typeId: string) => {
    if (!editing) return;
    const cur = editing.allowedTypeIds;
    setEditing({
      ...editing,
      allowedTypeIds: cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId],
    });
  };

  const toggleCol = (col: CalcColumnKey) => {
    if (!editing) return;
    const cur = editing.visibleColumns;
    if (cur.includes(col)) {
      if (cur.length <= 2) return;
      setEditing({ ...editing, visibleColumns: cur.filter(c => c !== col) });
    } else {
      setEditing({ ...editing, visibleColumns: [...cur, col] });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[hsl(220,14%,9%)] shrink-0">
        <div>
          <h1 className="text-base font-semibold">Блоки</h1>
          <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Сохранённые шаблоны блоков с настройками</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} />
          Новый блок
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin px-6 py-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
            <Icon name="Layers" size={40} className="text-[hsl(var(--text-muted))] opacity-30" />
            <div className="text-sm text-[hsl(var(--text-muted))]">Нет сохранённых блоков</div>
            <div className="text-xs text-[hsl(var(--text-muted))] opacity-60 max-w-xs">
              Создавай блоки с нужными настройками колонок и типами материалов, потом добавляй их в проект расчёта
            </div>
            <button
              onClick={openNew}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border rounded text-sm hover:border-gold transition-colors"
            >
              <Icon name="Plus" size={14} />
              Создать первый блок
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {blocks.map(block => (
              <div key={block.id} className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{block.name}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(block)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
                      title="Редактировать"
                    >
                      <Icon name="Pencil" size={13} />
                    </button>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                      title="Удалить"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
                </div>

                {block.note && (
                  <div className="text-xs text-[hsl(var(--text-muted))]">{block.note}</div>
                )}

                {block.allowedTypeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {block.allowedTypeIds.map(tid => {
                      const t = allTypes.find(x => x.id === tid);
                      return t ? (
                        <span key={tid} className="text-xs px-1.5 py-0.5 rounded text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>
                          {t.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {block.visibleColumns.map(col => (
                    <span key={col} className="text-xs px-1.5 py-0.5 bg-[hsl(220,12%,16%)] rounded text-[hsl(var(--text-dim))]">
                      {COLUMN_LABELS[col]}
                    </span>
                  ))}
                </div>

                <div className="pt-1 border-t border-border">
                  <button
                    onClick={() => addToProject(block)}
                    disabled={!store.activeProjectId}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gold hover:bg-[hsl(220,12%,16%)] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Icon name="FolderInput" size={12} />
                    Добавить в проект
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div
            className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <span className="font-semibold text-sm">{blocks.find(b => b.id === editing.id) ? 'Редактировать блок' : 'Новый блок'}</span>
              <button onClick={() => setShowForm(false)} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin px-5 py-4 space-y-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1.5">Название блока</div>
                <input
                  autoFocus
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Корпус, Фасады, Фурнитура…"
                  className="w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1.5">Примечание</div>
                <input
                  value={editing.note || ''}
                  onChange={e => setEditing({ ...editing, note: e.target.value })}
                  placeholder="Необязательное описание"
                  className="w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
                />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2.5">Типы материалов</div>
                <div className="flex flex-wrap gap-1.5">
                  {allTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleType(t.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        editing.allowedTypeIds.includes(t.id)
                          ? 'text-[hsl(220,16%,8%)]'
                          : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'
                      }`}
                      style={editing.allowedTypeIds.includes(t.id) ? { backgroundColor: t.color || '#c8a96e' } : {}}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2.5">Видимые столбцы</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_COLS.map(col => (
                    <button
                      key={col}
                      onClick={() => toggleCol(col)}
                      className={`px-3 py-1.5 rounded text-xs transition-colors ${
                        editing.visibleColumns.includes(col)
                          ? 'bg-[hsl(38,40%,18%)] border border-[hsl(38,40%,28%)] text-gold'
                          : 'bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-dim))] hover:border-border/80'
                      }`}
                    >
                      {COLUMN_LABELS[col]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={saveEditing}
                disabled={!editing.name.trim()}
                className="px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}