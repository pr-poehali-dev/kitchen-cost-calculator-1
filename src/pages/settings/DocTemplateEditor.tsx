import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import DocTemplateBlockItem from './DocTemplateBlockItem';
import { VARS, type Block, type Template } from './docTemplateTypes';

interface Props {
  template: Template;
  saving: boolean;
  editingBlock: string | null;
  onUpdate: (t: Template) => void;
  onSave: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onPreview: () => void;
  onEditBlock: (id: string | null) => void;
}

const ADD_BLOCK_TYPES = [
  { type: 'paragraph', label: 'Текст',   icon: 'AlignLeft' },
  { type: 'section',   label: 'Раздел',  icon: 'Heading' },
  { type: 'divider',   label: 'Линия',   icon: 'Minus' },
  { type: 'spacer',    label: 'Отступ',  icon: 'ArrowUpDown' },
  { type: 'lines',     label: 'Линии',   icon: 'SeparatorHorizontal' },
  { type: 'table',     label: 'Таблица', icon: 'Table' },
] as const;

const BLOCK_DEFAULTS: Record<string, Partial<Block>> = {
  paragraph: { label: 'Новый пункт',       content: 'Текст нового пункта...' },
  section:   { label: 'Новый раздел',       content: 'НАЗВАНИЕ РАЗДЕЛА' },
  divider:   { label: 'Разделитель',        content: '' },
  spacer:    { label: 'Отступ',             content: '20' },
  lines:     { label: 'Линии для записей',  content: '6' },
  table:     { label: 'Таблица',            content: 'Колонка 1;Колонка 2;Колонка 3\nЗначение 1;Значение 2;Значение 3' },
};

const SETTINGS_SLIDERS = [
  { key: 'fontSize',   label: 'Шрифт (pt)',   min: 7,   max: 14, step: 0.5 },
  { key: 'lineHeight', label: 'Межстрочный',  min: 0.8, max: 2,  step: 0.05 },
  { key: 'marginMm',   label: 'Поля (мм)',    min: 5,   max: 30, step: 1 },
];

export default function DocTemplateEditor({
  template, saving, editingBlock,
  onUpdate, onSave, onDelete, onSetDefault, onPreview, onEditBlock,
}: Props) {
  const updateBlock = (blockId: string, field: keyof Block, value: string | boolean | number | undefined) => {
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
      <div className="flex items-center gap-2">
        <input
          value={template.name}
          onChange={e => onUpdate({ ...template, name: e.target.value })}
          className="flex-1 bg-[hsl(220,14%,14%)] border border-border rounded px-3 py-1.5 text-sm text-foreground"
          placeholder="Название шаблона"
        />
        {!template.is_default && (
          <button
            onClick={onSetDefault}
            className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/40 transition-all"
            title="Сделать по умолчанию"
          >
            <Icon name="Star" size={12} />
          </button>
        )}
        <button onClick={onPreview} className="px-2 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 transition-all" title="Предпросмотр">
          <Icon name="Eye" size={12} />
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-60"
        >
          {saving ? <Icon name="Loader2" size={11} className="animate-spin" /> : <Icon name="Save" size={11} />}
          Сохранить
        </button>
        <button onClick={onDelete} className="px-2 py-1.5 border border-border rounded text-xs text-red-400/60 hover:text-red-400 transition-all">
          <Icon name="Trash2" size={12} />
        </button>
      </div>

      {/* Настройки отображения */}
      <div className="grid grid-cols-3 gap-3">
        {SETTINGS_SLIDERS.map(({ key, label, min, max, step }) => (
          <div key={key}>
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
      </div>

      {/* Переменные */}
      <div>
        <p className="text-xs text-[hsl(var(--text-muted))] mb-1">Доступные переменные (кликни чтобы скопировать):</p>
        <div className="flex flex-wrap gap-1">
          {VARS.map(v => (
            <button
              key={v}
              onClick={() => { navigator.clipboard.writeText(v); toast.success('Скопировано'); }}
              className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px] hover:bg-blue-500/20 transition-all"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

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