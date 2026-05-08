import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import DocTemplateBlockItem from './DocTemplateBlockItem';
import { useState, type ReactNode } from 'react';
import { VARS, VAR_GROUPS, type Block, type Template, DEFAULT_CALC_TABLE_SETTINGS } from './docTemplateTypes';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  template: Template;
  saving: boolean;
  isDirty: boolean;
  editingBlock: string | null;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onApply: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onEditBlock: (id: string | null) => void;
  onDownloadDocx?: () => void;
  downloadingDocx?: boolean;
}

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
  paragraph:  { label: 'Новый пункт',          content: 'Текст нового пункта...' },
  section:    { label: 'Новый раздел',          content: 'НАЗВАНИЕ РАЗДЕЛА' },
  divider:    { label: 'Разделитель',           content: '' },
  spacer:     { label: 'Отступ',                content: '20' },
  lines:      { label: 'Линии для записей',     content: '6' },
  table:      { label: 'Таблица',               content: 'Колонка 1;Колонка 2;Колонка 3\nЗначение 1;Значение 2;Значение 3' },
  calc_table: { label: 'Спецификация из расчёта', content: '', calcTableSettings: DEFAULT_CALC_TABLE_SETTINGS },
  image:      { label: 'Фото проекта',          content: '' },
  two_col:    { label: 'Две колонки',           content: 'Левая колонка\nТекст слева\n---\nПравая колонка\nТекст справа' },
};

const SETTINGS_SLIDERS = [
  { key: 'fontSize',   label: 'Шрифт (pt)',   min: 7,   max: 14, step: 0.5 },
  { key: 'lineHeight', label: 'Межстрочный',  min: 0.8, max: 2,  step: 0.05 },
];

const MARGIN_FIELDS = [
  { key: 'marginLeft',   label: '←', title: 'Левое поле (мм)' },
  { key: 'marginRight',  label: '→', title: 'Правое поле (мм)' },
  { key: 'marginTop',    label: '↑', title: 'Верхнее поле (мм)' },
  { key: 'marginBottom', label: '↓', title: 'Нижнее поле (мм)' },
];

function VarPanel({ onInsert }: { onInsert: ((v: string) => void) | null }) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const hasTarget = !!onInsert;

  const filtered = VAR_GROUPS
    .filter(g => !activeGroup || g.label === activeGroup)
    .map(g => ({
      ...g,
      vars: q ? g.vars.filter(v => v.key.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)) : g.vars,
    }))
    .filter(g => g.vars.length > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Шапка */}
      <div className="px-3 py-2 bg-[hsl(220,14%,10%)] border-b border-border flex items-center gap-2">
        <Icon name="Braces" size={12} className="text-blue-400 shrink-0" />
        <span className="text-[11px] font-medium text-foreground">Доступные переменные</span>
        {hasTarget ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Icon name="MousePointerClick" size={10} />
            вставится в блок
          </span>
        ) : (
          <span className="text-[10px] text-[hsl(var(--text-muted))]">— открой блок для вставки</span>
        )}
        <span className="ml-auto text-[10px] text-[hsl(var(--text-muted))]">{VARS.length} шт.</span>
      </div>

      {/* Поиск + фильтр групп */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-[hsl(220,14%,12%)] border border-border rounded pl-6 pr-6 py-1 text-[11px] text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-blue-500/50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
              <Icon name="X" size={10} />
            </button>
          )}
        </div>
        <button
          onClick={() => setActiveGroup(null)}
          className={`px-2 py-1 rounded text-[10px] transition-all shrink-0 ${!activeGroup ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'text-[hsl(var(--text-muted))] border border-border hover:text-foreground'}`}
        >
          Все
        </button>
      </div>

      {/* Группы — горизонтальный скролл */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-border scrollbar-none">
        {VAR_GROUPS.map(g => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(activeGroup === g.label ? null : g.label)}
            className={`shrink-0 px-2 py-0.5 rounded border text-[10px] transition-all ${activeGroup === g.label ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'text-[hsl(var(--text-muted))] border-border hover:text-foreground hover:border-border/80'}`}
          >
            {g.label.replace(' — основное', '')}
            <span className="ml-1 opacity-60">{g.vars.length}</span>
          </button>
        ))}
      </div>

      {/* Переменные */}
      <div className="p-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-[hsl(var(--text-muted))] px-1 py-2">Ничего не найдено</p>
        ) : (
          filtered.flatMap(g => g.vars).map(v => (
            <button
              key={v.key}
              onClick={() => {
                if (onInsert) {
                  onInsert(v.key);
                  toast.success(`Вставлено: ${v.key}`);
                } else {
                  navigator.clipboard.writeText(v.key);
                  toast.success(`Скопировано: ${v.key}`);
                }
              }}
              title={`${v.desc}\nПример: ${v.preview}`}
              className={`px-2 py-0.5 border rounded text-[10px] transition-all ${
                hasTarget
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/60'
              }`}
            >
              {v.key}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function DocTemplateEditor({
  template, saving, isDirty, editingBlock,
  onUpdate, onSave, onApply, onDelete, onSetDefault, onPreview, onDuplicate, onEditBlock,
  onDownloadDocx, downloadingDocx,
}: Props) {
  const [insertFn, setInsertFn] = useState<((v: string) => void) | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleRegisterInsert = (fn: ((v: string) => void) | null) => {
    // useState с функцией требует обёртку чтобы не вызвался как initializer
    setInsertFn(fn ? () => (v: string) => fn(v) : null);
  };

  const updateBlock = (blockId: string, field: keyof Block, value: string | boolean | number | number[] | undefined) => {
    onUpdate({
      ...template,
      blocks: template.blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b),
    });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const blocks = [...template.blocks];
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    onUpdate({ ...template, blocks });
  };

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

  return (
    <div className="space-y-3 border border-border rounded-xl overflow-hidden">

      {/* ── Шапка: название + действия ── */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-[hsl(220,14%,10%)]">
        {/* Строка 1: имя + статус */}
        <div className="flex items-center gap-2 mb-3">
          <input
            value={template.name}
            onChange={e => onUpdate({ ...template, name: e.target.value })}
            className="flex-1 min-w-[120px] bg-transparent border border-transparent hover:border-border focus:border-border rounded-md px-2 py-1 text-base font-semibold text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none transition-colors"
            placeholder="Название шаблона"
          />
          {template.is_default && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
              <Icon name="CheckCircle2" size={11} />
              Активный
            </span>
          )}
          {isDirty && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              не сохранено
            </span>
          )}
        </div>

        {/* Строка 2: кнопки действий */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Eye */}
          <button
            onClick={onPreview}
            title="Предпросмотр"
            className="p-1.5 border border-border rounded-md text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
          >
            <Icon name="Eye" size={13} />
          </button>

          {/* Copy */}
          <button
            onClick={onDuplicate}
            title="Дублировать шаблон"
            className="p-1.5 border border-border rounded-md text-[hsl(var(--text-muted))] hover:text-blue-400 hover:border-blue-500/40 transition-all"
          >
            <Icon name="Copy" size={13} />
          </button>

          {/* DOCX */}
          {onDownloadDocx && (
            <button
              onClick={onDownloadDocx}
              disabled={downloadingDocx}
              title="Скачать пример DOCX по этому шаблону"
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-md text-[11px] text-[hsl(var(--text-muted))] hover:text-violet-400 hover:border-violet-500/40 transition-all disabled:opacity-60"
            >
              {downloadingDocx
                ? <Icon name="Loader2" size={12} className="animate-spin" />
                : <Icon name="FileDown" size={12} />}
              DOCX
            </button>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Применить */}
          {!template.is_default && (
            <button
              onClick={onApply}
              title="Применить этот шаблон ко всем документам данного типа"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/12 border border-gold/35 text-gold rounded-md text-xs font-medium hover:bg-gold/22 transition-all"
            >
              <Icon name="CheckCircle" size={12} />
              Применить
            </button>
          )}

          {/* Сохранить */}
          <button
            onClick={onSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-60 ${
              isDirty
                ? 'bg-emerald-500 border border-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25'
            }`}
          >
            {saving ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Save" size={12} />}
            Сохранить
          </button>

          {/* Удалить */}
          <button
            onClick={onDelete}
            title="Удалить шаблон"
            className="p-1.5 border border-border rounded-md text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-all"
          >
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {/* ── Аккордеон: Настройки страницы ── */}
      <div className="mx-4 border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(220,14%,10%)] hover:bg-[hsl(220,14%,12%)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon name="Settings2" size={13} className="text-[hsl(var(--text-muted))]" />
            <span className="text-xs font-medium text-foreground">Настройки страницы</span>
          </div>
          <Icon name={settingsOpen ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-[hsl(var(--text-muted))]" />
        </button>

        {settingsOpen && (
          <div className="px-3 py-3 border-t border-border grid grid-cols-2 gap-x-5 gap-y-3 bg-[hsl(220,14%,11%)]">
            {/* Слайдеры */}
            {SETTINGS_SLIDERS.map(({ key, label, min, max, step }) => (
              <div key={key}>
                <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={min} max={max} step={step}
                    value={Number((template.settings as Record<string, number>)[key]) || min}
                    onChange={e => onUpdate({ ...template, settings: { ...template.settings, [key]: parseFloat(e.target.value) } })}
                    className="flex-1"
                  />
                  <span className="text-xs text-foreground w-8 text-right tabular-nums">
                    {Number((template.settings as Record<string, number>)[key]) || min}
                  </span>
                </div>
              </div>
            ))}

            {/* Поля страницы */}
            <div>
              <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Поля (мм)</label>
              <div className="grid grid-cols-2 gap-1">
                {MARGIN_FIELDS.map(({ key, label, title }) => {
                  const s = template.settings as Record<string, number>;
                  const fallback = key === 'marginLeft' ? 20 : key === 'marginRight' ? 10 : 10;
                  const val = s[key] != null ? s[key] : (s['marginMm'] ?? fallback);
                  return (
                    <div key={key} className="flex items-center gap-1" title={title}>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] w-4 text-center shrink-0">{label}</span>
                      <input
                        type="number" min={3} max={50} step={1}
                        value={val}
                        onChange={e => onUpdate({ ...template, settings: { ...template.settings, [key]: parseFloat(e.target.value) || 0 } })}
                        className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Гарнитура */}
            <div>
              <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Гарнитура</label>
              <div className="flex flex-col gap-1">
                {[
                  { value: 'Times New Roman', label: 'Times New Roman' },
                  { value: 'Arial',           label: 'Arial' },
                  { value: 'Calibri',         label: 'Calibri' },
                ].map(opt => {
                  const active = (template.settings.fontFamily ?? 'Times New Roman') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onUpdate({ ...template, settings: { ...template.settings, fontFamily: opt.value } })}
                      style={{ fontFamily: opt.value }}
                      className={`px-2.5 py-0.5 rounded border text-xs text-left transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ориентация */}
            <div>
              <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1">Ориентация</label>
              <div className="flex gap-1.5">
                {[
                  { value: 'portrait',  label: 'Книжная',  icon: '▯' },
                  { value: 'landscape', label: 'Альбомная', icon: '▭' },
                ].map(opt => {
                  const active = (template.settings.orientation ?? 'portrait') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onUpdate({ ...template, settings: { ...template.settings, orientation: opt.value } })}
                      title={opt.label}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${active ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                    >
                      <span className="text-sm leading-none">{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Переменные ── */}
      <div className="px-4">
        <VarPanel onInsert={insertFn} />
      </div>

      {/* ── Блоки документа ── */}
      <div className="px-4 pb-4">
        {/* Заголовок секции */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs font-semibold text-foreground">Блоки документа</span>
          <span className="flex items-center justify-center h-4 min-w-[20px] px-1 rounded-full bg-[hsl(220,14%,16%)] border border-border text-[10px] text-[hsl(var(--text-muted))] tabular-nums">
            {template.blocks.length}
          </span>
        </div>

        {/* Кнопки добавления блоков — горизонтальная прокрутка */}
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

        {/* Список блоков */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={template.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {template.blocks.map((block, idx) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                >
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
                    onRegisterInsert={handleRegisterInsert}
                  />
                </SortableBlockItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}