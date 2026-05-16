import { useState, type ReactNode } from 'react';
import Icon from '@/components/ui/icon';
import DocTemplateBlockItem from './DocTemplateBlockItem';
import { type Block, type Template, DEFAULT_CALC_TABLE_SETTINGS } from './docTemplateTypes';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  template: Template;
  editingBlock: string | null;
  onUpdate: (t: Template) => void;
  onEditBlock: (id: string | null) => void;
  onRegisterInsert: (fn: ((v: string) => void) | null) => void;
}

const ADD_BLOCK_TYPES = [
  { type: 'paragraph',  label: 'Текст',        icon: 'AlignLeft' },
  { type: 'section',    label: 'Раздел',        icon: 'Heading' },
  { type: 'divider',    label: 'Линия',          icon: 'Minus' },
  { type: 'spacer',     label: 'Отступ',         icon: 'ArrowUpDown' },
  { type: 'lines',      label: 'Линии',          icon: 'SeparatorHorizontal' },
  { type: 'two_col',    label: '2 колонки',      icon: 'Columns2' },
  { type: 'table',      label: 'Таблица',        icon: 'Table' },
  { type: 'calc_table', label: 'Из расчёта',     icon: 'Calculator' },
  { type: 'image',      label: 'Фото',           icon: 'Image' },
] as const;

const BLOCK_DEFAULTS: Record<string, Partial<Block>> = {
  paragraph:  { label: 'Новый пункт',            content: 'Текст нового пункта...' },
  section:    { label: 'Новый раздел',            content: 'НАЗВАНИЕ РАЗДЕЛА' },
  divider:    { label: 'Разделитель',             content: '' },
  spacer:     { label: 'Отступ',                  content: '20' },
  lines:      { label: 'Линии для записей',       content: '6' },
  table:      { label: 'Таблица',                 content: 'Колонка 1;Колонка 2;Колонка 3\nЗначение 1;Значение 2;Значение 3' },
  calc_table: { label: 'Спецификация из расчёта', content: '', calcTableSettings: DEFAULT_CALC_TABLE_SETTINGS },
  image:      { label: 'Фото проекта',            content: '' },
  two_col:    { label: 'Две колонки',             content: 'Левая колонка\nТекст слева\n---\nПравая колонка\nТекст справа' },
};

function SortableBlockItem({ block, children }: { block: Block; children: ReactNode }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-start gap-1"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[hsl(var(--text-muted))] hover:text-foreground transition-colors px-0.5 mt-2 shrink-0"
        title="Перетащить блок"
      >
        <Icon name="GripVertical" size={13} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function DocTemplateBlockList({
  template, editingBlock, onUpdate, onEditBlock, onRegisterInsert,
}: Props) {
  const [open, setOpen] = useState(() => localStorage.getItem('tpl_blocks_open') !== 'false');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = template.blocks.map(b => b.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    onUpdate({ ...template, blocks: arrayMove(template.blocks, oldIdx, newIdx) });
  };

  const addBlock = (type: string) => {
    const d = BLOCK_DEFAULTS[type] || BLOCK_DEFAULTS.paragraph;
    const newBlock: Block = {
      id: `custom_${Date.now()}`,
      type,
      label: d.label || 'Блок',
      content: d.content || '',
      enabled: true,
    };
    onUpdate({ ...template, blocks: [...template.blocks, newBlock] });
    onEditBlock(newBlock.id);
  };

  const removeBlock = (blockId: string) => {
    onUpdate({ ...template, blocks: template.blocks.filter(b => b.id !== blockId) });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const blocks = [...template.blocks];
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    onUpdate({ ...template, blocks });
  };

  const updateBlock = (blockId: string, field: keyof Block, value: string | boolean | number | number[] | string[] | undefined) => {
    onUpdate({
      ...template,
      blocks: template.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b),
    });
  };

  const patchBlock = (blockId: string, patch: Partial<Block>) => {
    onUpdate({
      ...template,
      blocks: template.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b),
    });
  };

  return (
    <div className="mx-4 mb-4 border border-border rounded-lg overflow-hidden">
      {/* Заголовок секции — кликабельный */}
      <button
        onClick={() => setOpen(o => { localStorage.setItem('tpl_blocks_open', String(!o)); return !o; })}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(220,14%,10%)] hover:bg-[hsl(220,14%,12%)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="LayoutList" size={13} className="text-[hsl(var(--text-muted))]" />
          <span className="text-xs font-medium text-foreground">Блоки документа</span>
          <span className="flex items-center justify-center h-4 min-w-[20px] px-1 rounded-full bg-[hsl(220,14%,16%)] border border-border text-[10px] text-[hsl(var(--text-muted))] tabular-nums">
            {template.blocks.length}
          </span>
        </div>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-[hsl(var(--text-muted))]" />
      </button>

      {open && (
        <div className="border-t border-border bg-[hsl(220,14%,11%)] p-3">
          {/* Кнопки добавления блоков */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-3 scrollbar-none">
            {ADD_BLOCK_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                title={`Добавить: ${label}`}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all shrink-0"
              >
                <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={14} />
                <span className="text-[10px] whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          {/* Список блоков с DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={template.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {template.blocks.map((block, idx) => (
                  <SortableBlockItem key={block.id} block={block}>
                    <DocTemplateBlockItem
                      block={block}
                      idx={idx}
                      totalBlocks={template.blocks.length}
                      isEditing={editingBlock === block.id}
                      onToggleEdit={() => onEditBlock(editingBlock === block.id ? null : block.id)}
                      onToggleEnabled={() => updateBlock(block.id, 'enabled', !block.enabled)}
                      onMove={dir => moveBlock(idx, dir)}
                      onRemove={() => removeBlock(block.id)}
                      onUpdate={(field, value) => updateBlock(block.id, field, value)}
                      onPatch={(patch) => patchBlock(block.id, patch)}
                      onRegisterInsert={onRegisterInsert}
                    />
                  </SortableBlockItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}