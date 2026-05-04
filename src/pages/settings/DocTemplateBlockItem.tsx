import Icon from '@/components/ui/icon';
import type { Block } from './docTemplateTypes';

interface Props {
  block: Block;
  idx: number;
  totalBlocks: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (field: keyof Block, value: string | boolean) => void;
}

export default function DocTemplateBlockItem({
  block, idx, totalBlocks, isEditing,
  onToggleEdit, onToggleEnabled, onMove, onRemove, onUpdate,
}: Props) {
  return (
    <div className={`border rounded-lg transition-all ${block.enabled ? 'border-border' : 'border-border/40 opacity-50'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onToggleEnabled}
          className={`shrink-0 ${block.enabled ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]'}`}
        >
          <Icon name={block.enabled ? 'Eye' : 'EyeOff'} size={13} />
        </button>

        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${
          block.type === 'section'  ? 'border-gold/40 text-gold bg-gold/10' :
          block.type === 'header'   ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' :
          block.type === 'divider'  ? 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10' :
          block.type === 'spacer'   ? 'border-violet-500/40 text-violet-400 bg-violet-500/10' :
          block.type === 'lines'    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
          block.type === 'table'    ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' :
          'border-border text-[hsl(var(--text-muted))]'
        }`}>
          {{ section:'раздел', header:'шапка', divider:'линия', spacer:'отступ', lines:'линии', table:'таблица', paragraph:'текст' }[block.type] || block.type}
        </span>

        <span className="flex-1 text-xs text-foreground truncate">{block.label}</span>

        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="ChevronUp" size={12} />
          </button>
          <button onClick={() => onMove(1)} disabled={idx === totalBlocks - 1} className="text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="ChevronDown" size={12} />
          </button>
          <button
            onClick={onToggleEdit}
            className={`text-[hsl(var(--text-muted))] hover:text-foreground ${isEditing ? 'text-emerald-400' : ''}`}
          >
            <Icon name="Pencil" size={12} />
          </button>
          <button onClick={onRemove} className="text-red-400/30 hover:text-red-400 transition-all">
            <Icon name="X" size={12} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div>
            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Название блока</label>
            <input
              value={block.label}
              onChange={e => onUpdate('label', e.target.value)}
              className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
            />
          </div>
          {block.type === 'divider' && (
            <p className="text-[10px] text-[hsl(var(--text-muted))]">Горизонтальная линия — настройка не требуется.</p>
          )}
          {block.type === 'spacer' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Высота отступа (px)</label>
              <input type="number" min={5} max={200} value={block.content || '20'}
                onChange={e => onUpdate('content', e.target.value)}
                className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
              />
            </div>
          )}
          {block.type === 'lines' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Количество линий</label>
              <input type="number" min={1} max={20} value={block.content || '6'}
                onChange={e => onUpdate('content', e.target.value)}
                className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
              />
            </div>
          )}
          {block.type === 'table' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">
                Строки таблицы — первая строка заголовок, столбцы разделяй «;»
              </label>
              <textarea
                value={block.content}
                onChange={e => onUpdate('content', e.target.value)}
                rows={5}
                placeholder={'Колонка 1;Колонка 2;Колонка 3\nДанные 1;Данные 2;Данные 3'}
                className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground font-mono resize-none"
              />
            </div>
          )}
          {(block.type === 'paragraph' || block.type === 'section' || block.type === 'header') && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Содержимое</label>
              <textarea
                value={block.content}
                onChange={e => onUpdate('content', e.target.value)}
                rows={3}
                className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
