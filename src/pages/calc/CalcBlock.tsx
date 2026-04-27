import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { CalcBlock as CalcBlockType, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS_SHORT, COLUMN_ALIGN, COLUMN_WIDTHS, fmt } from './constants';
import CalcRowComponent from './CalcRowComponent';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalcRow } from '@/store/types';

const BLOCK_COLORS = [
  { id: 'default', color: null, label: 'Нет' },
  { id: 'gold',    color: '#c8a96e', label: 'Золото' },
  { id: 'blue',    color: '#3b82f6', label: 'Синий' },
  { id: 'green',   color: '#10b981', label: 'Зелёный' },
  { id: 'violet',  color: '#8b5cf6', label: 'Фиолетовый' },
  { id: 'red',     color: '#ef4444', label: 'Красный' },
  { id: 'cyan',    color: '#06b6d4', label: 'Голубой' },
];

function SortableRow({
  row, projectId, blockId, visibleColumns, currency, allowedTypeIds, otherBlocks,
  onDelete, onDuplicate, onCopyTo,
}: {
  row: CalcRow;
  projectId: string;
  blockId: string;
  visibleColumns: CalcColumnKey[];
  currency: string;
  allowedTypeIds: string[];
  otherBlocks: { id: string; name: string }[];
  onDelete: () => void;
  onDuplicate: () => void;
  onCopyTo: (toBlockId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-1.5 text-[hsl(var(--text-muted))] hover:text-gold cursor-grab active:cursor-grabbing shrink-0 border-r border-[hsl(220,12%,14%)]"
      >
        <Icon name="GripVertical" size={11} />
      </div>
      <div className="flex-1 min-w-0">
        <CalcRowComponent
          row={row}
          projectId={projectId}
          blockId={blockId}
          visibleColumns={visibleColumns}
          currency={currency}
          allowedTypeIds={allowedTypeIds}
          otherBlocks={otherBlocks}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onCopyTo={onCopyTo}
        />
      </div>
    </div>
  );
}

interface Props {
  block: CalcBlockType;
  projectId: string;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  isEditingName: boolean;
  editingName: string;
  allBlocks: { id: string; name: string }[];
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onStartEditName: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEditName: () => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function CalcBlock({
  block, projectId, currency,
  isFirst, isLast,
  isEditingName, editingName,
  allBlocks,
  dragHandleProps,
  onStartEditName, onEditNameChange, onFinishEditName,
  onOpenSettings, onMoveUp, onMoveDown,
}: Props) {
  const store = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const rowSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = block.rows.map(r => r.id);
    const oldIdx = oldOrder.indexOf(active.id as string);
    const newIdx = oldOrder.indexOf(over.id as string);
    store.reorderRows(projectId, block.id, arrayMove(oldOrder, oldIdx, newIdx));
  };

  const blockColor = (block as CalcBlockType & { color?: string }).color as string | undefined;
  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0
    ? block.visibleColumns
    : ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '56px'].join(' ');

  // Другие блоки (для копирования строки)
  const otherBlocks = allBlocks.filter(b => b.id !== block.id);

  const accentColor = blockColor || 'hsl(var(--gold))';

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm" style={blockColor ? { borderColor: blockColor + '55' } : {}}>
      {/* Block header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,14%)] border-b-2"
        style={{ borderBottomColor: accentColor + (blockColor ? 'aa' : '4d') }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            {...dragHandleProps}
            className="flex flex-col gap-0.5 mr-0.5 shrink-0 cursor-grab active:cursor-grabbing text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            title="Перетащить блок"
          >
            <Icon name="GripVertical" size={14} />
          </div>

          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors shrink-0"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            <Icon name={collapsed ? 'ChevronRight' : 'ChevronDown'} size={13} />
          </button>

          {isEditingName ? (
            <input
              autoFocus
              value={editingName}
              onChange={e => onEditNameChange(e.target.value)}
              onBlur={onFinishEditName}
              onKeyDown={e => { if (e.key === 'Enter') onFinishEditName(); }}
              className="bg-transparent border-b border-gold outline-none text-sm font-semibold min-w-0 flex-1"
            />
          ) : (
            <button
              onClick={onStartEditName}
              className="text-sm font-semibold hover:text-gold transition-colors flex items-center gap-1.5 uppercase tracking-wide truncate"
            >
              {blockColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: blockColor }} />}
              {block.name}
              <Icon name="Pencil" size={10} className="opacity-30 shrink-0" />
            </button>
          )}

          {block.allowedTypeIds.length > 0 && (
            <div className="flex gap-1 ml-1 flex-wrap shrink-0">
              {block.allowedTypeIds.map(tid => {
                const t = store.getTypeById(tid);
                return t ? (
                  <span key={tid} className="text-xs px-1.5 py-0.5 rounded text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>
                    {t.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {collapsed && block.rows.length > 0 && (
            <span className="text-xs text-[hsl(var(--text-muted))]">{block.rows.length} поз.</span>
          )}
          <span className="text-sm font-mono font-semibold" style={{ color: blockColor || 'hsl(var(--gold))' }}>
            {fmt(blockTotal)} {currency}
          </span>

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(v => !v)}
              className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5"
              title="Цвет блока"
            >
              <Icon name="Palette" size={12} />
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl p-2 flex gap-1.5">
                  {BLOCK_COLORS.map(c => (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => {
                        store.updateBlock(projectId, block.id, { color: c.color } as Parameters<typeof store.updateBlock>[2]);
                        setShowColorPicker(false);
                      }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        (blockColor || null) === c.color ? 'border-white' : 'border-transparent'
                      }`}
                      style={c.color ? { backgroundColor: c.color } : { backgroundColor: 'hsl(220,12%,22%)', border: '2px dashed hsl(220,12%,35%)' }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => store.duplicateBlock(projectId, block.id)}
            className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5"
            title="Дублировать блок"
          >
            <Icon name="Copy" size={12} />
          </button>

          <button
            onClick={onOpenSettings}
            className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5"
            title="Настройки блока"
          >
            <Icon name="SlidersHorizontal" size={13} />
          </button>
          <button
            onClick={() => store.deleteBlock(projectId, block.id)}
            className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
            title="Удалить блок"
          >
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Column header */}
          <div
            className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider pl-8 pr-4 py-1.5 bg-[hsl(220,14%,10%)] border-b border-border select-none"
            style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
          >
            {visibleCols.map(col => (
              <span
                key={col}
                className={`truncate overflow-hidden ${
                  COLUMN_ALIGN[col] === 'right'  ? 'text-right'  :
                  COLUMN_ALIGN[col] === 'center' ? 'text-center' : ''
                }`}
                title={COLUMN_LABELS_SHORT[col]}
              >
                {COLUMN_LABELS_SHORT[col]}
              </span>
            ))}
            <span />
          </div>

          {/* Rows with DnD */}
          <div className="bg-[hsl(220,13%,12%)]">
            <DndContext sensors={rowSensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
              <SortableContext items={block.rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {block.rows.map(row => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    projectId={projectId}
                    blockId={block.id}
                    visibleColumns={visibleCols}
                    currency={currency}
                    allowedTypeIds={block.allowedTypeIds}
                    otherBlocks={otherBlocks}
                    onDelete={() => store.deleteRow(projectId, block.id, row.id)}
                    onDuplicate={() => store.duplicateRow(projectId, block.id, row.id)}
                    onCopyTo={(toBlockId) => store.copyRowToBlock(projectId, block.id, row.id, toBlockId)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="px-4 py-2 border-t border-[hsl(220,12%,14%)]">
              <button
                onClick={() => store.addRow(projectId, block.id)}
                className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
              >
                <Icon name="Plus" size={12} /> Добавить строку
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
