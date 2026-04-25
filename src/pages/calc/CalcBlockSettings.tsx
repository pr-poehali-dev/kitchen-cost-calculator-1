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

function SortableCol({ col, visible, onToggle }: { col: CalcColumnKey; visible: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded text-sm border transition-colors ${
        visible
          ? 'bg-[hsl(38,40%,20%)] text-gold border-[hsl(38,40%,30%)]'
          : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border-transparent'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[hsl(var(--text-muted))] hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <Icon name="GripVertical" size={13} />
      </button>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 text-left"
      >
        <Icon name={visible ? 'CheckSquare' : 'Square'} size={13} />
        {COLUMN_LABELS[col]}
      </button>
    </div>
  );
}

export default function CalcBlockSettings({ blockId, projectId, onClose }: Props) {
  const store = useStore();
  const project = store.projects.find(p => p.id === projectId);
  const block = project?.blocks.find(b => b.id === blockId);

  // Локальный порядок всех колонок: visible идут первыми в своём порядке, остальные — в конце
  const [colOrder, setColOrder] = useState<CalcColumnKey[]>(() => {
    if (!block) return ALL_COLS;
    const visible = block.visibleColumns.filter(c => ALL_COLS.includes(c));
    const hidden = ALL_COLS.filter(c => !visible.includes(c));
    return [...visible, ...hidden];
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!block) return null;

  const allTypes = store.settings.materialTypes;
  const visibleSet = new Set(block.visibleColumns);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = colOrder.indexOf(active.id as CalcColumnKey);
    const newIndex = colOrder.indexOf(over.id as CalcColumnKey);
    const newOrder = arrayMove(colOrder, oldIndex, newIndex);
    setColOrder(newOrder);
    // Сохраняем только видимые в новом порядке
    const newVisible = newOrder.filter(c => visibleSet.has(c));
    store.updateBlock(projectId, blockId, { visibleColumns: newVisible });
  };

  const toggleCol = (col: CalcColumnKey) => {
    if (visibleSet.has(col) && block.visibleColumns.length <= 2) return;
    const newVisible = visibleSet.has(col)
      ? block.visibleColumns.filter(c => c !== col)
      : [...colOrder.filter(c => visibleSet.has(c) || c === col)].filter(c => visibleSet.has(c) || c === col);

    // Пересчитываем: берём текущий colOrder и фильтруем по новому visibleSet
    const nextVisibleSet = new Set(newVisible);
    const nextVisible = colOrder.filter(c => nextVisibleSet.has(c));
    store.updateBlock(projectId, blockId, { visibleColumns: nextVisible });
  };

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateBlock(projectId, blockId, { allowedTypeIds: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-auto scrollbar-thin">

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Столбцы</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5 flex items-center gap-1.5">
              <Icon name="GripVertical" size={11} />
              Перетащи для изменения порядка, нажми для включения/выключения
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={colOrder} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {colOrder.map(col => (
                    <SortableCol
                      key={col}
                      col={col}
                      visible={visibleSet.has(col)}
                      onToggle={() => toggleCol(col)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Разрешённые типы материалов</div>
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
