import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store/useStore';
import type { CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS } from './constants';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

interface Props {
  blockId: string;
  projectId: string;
  onClose: () => void;
}

function SortableColItem({ col, onRemove }: { col: CalcColumnKey; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
      className="flex items-center gap-2 px-3 py-2 bg-[hsl(38,40%,18%)] border border-[hsl(38,40%,28%)] rounded text-sm text-gold"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[hsl(var(--text-muted))] hover:text-gold cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <Icon name="GripVertical" size={13} />
      </button>
      <span className="flex-1 text-sm">{COLUMN_LABELS[col]}</span>
      <button
        onClick={onRemove}
        className="text-[hsl(var(--text-muted))] hover:text-destructive shrink-0 transition-colors"
        title="Скрыть колонку"
      >
        <Icon name="X" size={12} />
      </button>
    </div>
  );
}

export default function CalcBlockSettings({ blockId, projectId, onClose }: Props) {
  const store = useStore();
  const project = store.projects.find(p => p.id === projectId);
  const block = project?.blocks.find(b => b.id === blockId);

  const [visible, setVisible] = useState<CalcColumnKey[]>(() =>
    block?.visibleColumns.filter(c => ALL_COLS.includes(c as CalcColumnKey)) as CalcColumnKey[] ?? []
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!block) return null;

  const hidden = ALL_COLS.filter(c => !visible.includes(c));
  const allTypes = store.settings.materialTypes;

  const save = (next: CalcColumnKey[]) => {
    setVisible(next);
    store.updateBlock(projectId, blockId, { visibleColumns: next });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = visible.indexOf(active.id as CalcColumnKey);
    const newIdx = visible.indexOf(over.id as CalcColumnKey);
    save(arrayMove(visible, oldIdx, newIdx));
  };

  const addCol = (col: CalcColumnKey) => {
    if (visible.includes(col)) return;
    save([...visible, col]);
  };

  const removeCol = (col: CalcColumnKey) => {
    if (visible.length <= 2) return;
    save(visible.filter(c => c !== col));
  };

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateBlock(projectId, blockId, { allowedTypeIds: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-auto scrollbar-thin">

          {/* Видимые колонки — DnD список */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">
              Порядок столбцов
            </div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5 flex items-center gap-1.5">
              <Icon name="GripVertical" size={11} />
              Перетащи чтобы изменить порядок · × чтобы скрыть
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {visible.map(col => (
                    <SortableColItem key={col} col={col} onRemove={() => removeCol(col)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Скрытые колонки — добавить */}
          {hidden.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2.5">
                Скрытые — нажми чтобы добавить
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hidden.map(col => (
                  <button
                    key={col}
                    onClick={() => addCol(col)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(220,12%,16%)] border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold transition-colors"
                  >
                    <Icon name="Plus" size={11} />
                    {COLUMN_LABELS[col]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Разрешённые типы материалов */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">
              Разрешённые типы материалов
            </div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5">Если не выбрано — доступны все типы</div>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    block.allowedTypeIds.includes(t.id)
                      ? 'text-[hsl(220,16%,8%)]'
                      : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'
                  }`}
                  style={block.allowedTypeIds.includes(t.id) ? { backgroundColor: t.color || '#c8a96e' } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
