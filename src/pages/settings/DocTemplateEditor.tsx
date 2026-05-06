import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import DocTemplateBlockItem from './DocTemplateBlockItem';
import { useState } from 'react';
import { VARS, VAR_GROUPS, type Block, type Template, DEFAULT_CALC_TABLE_SETTINGS } from './docTemplateTypes';

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

const ADD_BLOCK_TYPES = [
  { type: 'paragraph',  label: 'Текст',        icon: 'AlignLeft' },
  { type: 'section',    label: 'Раздел',        icon: 'Heading' },
  { type: 'divider',    label: 'Линия',          icon: 'Minus' },
  { type: 'spacer',     label: 'Отступ',         icon: 'ArrowUpDown' },
  { type: 'lines',      label: 'Линии',          icon: 'SeparatorHorizontal' },
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

function VarPanel() {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

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
        <span className="text-[10px] text-[hsl(var(--text-muted))]">— кликни чтобы скопировать</span>
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
              onClick={() => { navigator.clipboard.writeText(v.key); toast.success(`Скопировано: ${v.key}`); }}
              title={`${v.desc}\nПример: ${v.preview}`}
              className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] hover:bg-blue-500/20 hover:border-blue-500/60 transition-all"
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
    <div className="space-y-3 border border-border rounded-lg p-4">
      {/* Название и действия */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={template.name}
          onChange={e => onUpdate({ ...template, name: e.target.value })}
          className="flex-1 min-w-[140px] bg-[hsl(220,14%,14%)] border border-border rounded px-3 py-1.5 text-sm text-foreground"
          placeholder="Название шаблона"
        />
        {template.is_default && (
          <span className="flex items-center gap-1 px-2 py-1 rounded border border-gold/40 bg-gold/10 text-gold text-[10px] shrink-0">
            <Icon name="Star" size={10} /> Активный
          </span>
        )}
        {isDirty && (
          <span className="text-[10px] text-amber-400 shrink-0">● не сохранено</span>
        )}
        <button onClick={onPreview} className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all" title="Предпросмотр">
          <Icon name="Eye" size={12} />
        </button>
        <button onClick={onDuplicate} className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-blue-400 transition-all" title="Копировать шаблон">
          <Icon name="Copy" size={12} />
        </button>
        {onDownloadDocx && (
          <button
            onClick={onDownloadDocx}
            disabled={downloadingDocx}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-violet-400 hover:border-violet-500/40 transition-all disabled:opacity-60"
            title="Скачать пример DOCX по этому шаблону"
          >
            {downloadingDocx
              ? <Icon name="Loader2" size={11} className="animate-spin" />
              : <Icon name="FileDown" size={11} />}
            DOCX
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-60"
        >
          {saving ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Save" size={11} />}
          Сохранить
        </button>
        {!template.is_default && (
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-3 py-1.5 bg-gold/15 border border-gold/40 text-gold rounded text-xs hover:bg-gold/25 transition-all"
            title="Применить этот шаблон ко всем документам данного типа"
          >
            <Icon name="CheckCircle" size={11} />
            Применить
          </button>
        )}
        <button onClick={onDelete} className="px-2 py-1.5 border border-border rounded text-xs text-red-400/60 hover:text-red-400 transition-all">
          <Icon name="Trash2" size={12} />
        </button>
      </div>

      {/* Настройки отображения */}
      <div className="flex flex-wrap gap-4 items-end">
        {SETTINGS_SLIDERS.map(({ key, label, min, max, step }) => (
          <div key={key} className="flex-1 min-w-[120px]">
            <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={min} max={max} step={step}
                value={Number((template.settings as Record<string, number>)[key]) || min}
                onChange={e => onUpdate({ ...template, settings: { ...template.settings, [key]: parseFloat(e.target.value) } })}
                className="flex-1"
              />
              <span className="text-xs text-foreground w-8 text-right">
                {Number((template.settings as Record<string, number>)[key]) || min}
              </span>
            </div>
          </div>
        ))}
        {/* Поля страницы */}
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Поля (мм)</label>
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
        {/* Шрифт */}
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Гарнитура</label>
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
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Ориентация</label>
          <div className="flex gap-1">
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

      {/* Переменные */}
      <VarPanel />

      {/* Блоки документа */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-foreground">Блоки документа</p>
          <div className="flex gap-1 flex-wrap justify-end">
            {ADD_BLOCK_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-1 px-2 py-1 border border-border rounded text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
                title={`Добавить: ${label}`}
              >
                <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={10} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {template.blocks.map((block, idx) => (
            <DocTemplateBlockItem
              key={block.id}
              block={block}
              idx={idx}
              totalBlocks={template.blocks.length}
              isEditing={editingBlock === block.id}
              onToggleEdit={() => onEditBlock(editingBlock === block.id ? null : block.id)}
              onToggleEnabled={() => updateBlock(block.id, 'enabled', !block.enabled)}
              onMove={dir => moveBlock(idx, dir)}
              onRemove={() => removeBlock(block.id)}
              onUpdate={(field, value) => updateBlock(block.id, field, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}