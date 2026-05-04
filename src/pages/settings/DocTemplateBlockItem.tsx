import Icon from '@/components/ui/icon';
import type { Block, BlockAlign } from './docTemplateTypes';
import { parseTableContent, serializeTableContent } from './docTemplateTypes';

interface Props {
  block: Block;
  idx: number;
  totalBlocks: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (field: keyof Block, value: string | boolean | number | undefined) => void;
}

const ALIGN_OPTIONS: { value: BlockAlign; icon: string; title: string }[] = [
  { value: 'left',    icon: 'AlignLeft',    title: 'По левому краю' },
  { value: 'center',  icon: 'AlignCenter',  title: 'По центру' },
  { value: 'right',   icon: 'AlignRight',   title: 'По правому краю' },
  { value: 'justify', icon: 'AlignJustify', title: 'По ширине' },
];

const HAS_TYPOGRAPHY = ['paragraph', 'section', 'header', 'table'];
const HAS_CONTENT    = ['paragraph', 'section', 'header'];

function TypographyRow({ block, onUpdate }: {
  block: Block;
  onUpdate: (field: keyof Block, value: string | boolean | number | undefined) => void;
}) {
  const btnBase = 'w-6 h-6 flex items-center justify-center rounded border text-[10px] transition-all';
  const btnOn   = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400';
  const btnOff  = 'border-border text-[hsl(var(--text-muted))] hover:text-foreground hover:border-border/80';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Размер шрифта */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">Шрифт (pt)</label>
        <input
          type="number"
          min={6} max={24} step={0.5}
          placeholder="—"
          value={block.fontSize ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('fontSize', v === '' ? undefined : parseFloat(v));
          }}
          className="w-14 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
        />
      </div>

      {/* Жирный / курсив / подчёркивание */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate('bold', !block.bold)}
          className={`${btnBase} font-bold ${block.bold ? btnOn : btnOff}`}
          title="Жирный"
        >B</button>
        <button
          onClick={() => onUpdate('italic', !block.italic)}
          className={`${btnBase} italic ${block.italic ? btnOn : btnOff}`}
          title="Курсив"
        >I</button>
        <button
          onClick={() => onUpdate('underline', !block.underline)}
          className={`${btnBase} underline ${block.underline ? btnOn : btnOff}`}
          title="Подчёркивание"
        >U</button>
      </div>

      {/* Выравнивание (не для таблицы) */}
      {block.type !== 'table' && (
        <div className="flex items-center gap-1">
          {ALIGN_OPTIONS.map(({ value, icon, title }) => (
            <button
              key={value}
              onClick={() => onUpdate('align', block.align === value ? undefined : value)}
              className={`${btnBase} ${block.align === value ? btnOn : btnOff}`}
              title={title}
            >
              <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={11} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableEditor({ block, onUpdate }: {
  block: Block;
  onUpdate: (field: keyof Block, value: string | boolean | number | undefined) => void;
}) {
  const rows = parseTableContent(block.content || 'Колонка 1;Колонка 2\nЗначение 1;Значение 2');
  const numCols = Math.max(...rows.map(r => r.length), 1);
  const numRows = rows.length; // включая заголовок

  const setCell = (ri: number, ci: number, val: string) => {
    const next = rows.map(r => [...r]);
    while (next[ri].length <= ci) next[ri].push('');
    next[ri][ci] = val;
    onUpdate('content', serializeTableContent(next));
  };

  const addCol = () => {
    const next = rows.map(r => [...r, '']);
    onUpdate('content', serializeTableContent(next));
  };

  const removeCol = () => {
    if (numCols <= 1) return;
    const next = rows.map(r => r.slice(0, -1));
    onUpdate('content', serializeTableContent(next));
  };

  const addRow = () => {
    const next = [...rows, Array(numCols).fill('')];
    onUpdate('content', serializeTableContent(next));
  };

  const removeRow = () => {
    if (numRows <= 1) return;
    const next = rows.slice(0, -1);
    onUpdate('content', serializeTableContent(next));
  };

  return (
    <div className="space-y-2">
      {/* Контролы строк/колонок */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[hsl(var(--text-muted))]">Строки: {numRows}</span>
          <button onClick={removeRow} disabled={numRows <= 1}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30 text-xs">
            <Icon name="Minus" size={10} />
          </button>
          <button onClick={addRow}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 text-xs">
            <Icon name="Plus" size={10} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[hsl(var(--text-muted))]">Колонки: {numCols}</span>
          <button onClick={removeCol} disabled={numCols <= 1}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30 text-xs">
            <Icon name="Minus" size={10} />
          </button>
          <button onClick={addCol}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 text-xs">
            <Icon name="Plus" size={10} />
          </button>
        </div>
      </div>

      {/* Сетка ячеек */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: numCols }).map((_, ci) => (
                  <td key={ci} className={`border border-border p-0 ${ri === 0 ? 'bg-[hsl(220,14%,10%)]' : ''}`}>
                    <input
                      value={row[ci] ?? ''}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      placeholder={ri === 0 ? `Колонка ${ci + 1}` : ''}
                      className={`w-full bg-transparent px-1.5 py-1 text-[10px] text-foreground outline-none min-w-[60px] ${ri === 0 ? 'font-medium' : ''}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[hsl(var(--text-muted))]">Первая строка — заголовок таблицы</p>
    </div>
  );
}

export default function DocTemplateBlockItem({
  block, idx, totalBlocks, isEditing,
  onToggleEdit, onToggleEnabled, onMove, onRemove, onUpdate,
}: Props) {
  return (
    <div className={`border rounded-lg transition-all ${block.enabled ? 'border-border' : 'border-border/40 opacity-50'}`}>
      {/* Строка блока */}
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

        {/* Индикаторы активных стилей */}
        {(block.bold || block.italic || block.underline || block.fontSize || block.align) && (
          <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0 flex items-center gap-0.5">
            {block.fontSize && <span>{block.fontSize}pt</span>}
            {block.bold && <span className="font-bold">B</span>}
            {block.italic && <span className="italic">I</span>}
            {block.underline && <span className="underline">U</span>}
            {block.align && block.align !== 'justify' && <span>{({left:'←',center:'⊡',right:'→'})[block.align]}</span>}
          </span>
        )}

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

      {/* Редактор блока */}
      {isEditing && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Название блока */}
          <div>
            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Название блока</label>
            <input
              value={block.label}
              onChange={e => onUpdate('label', e.target.value)}
              className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
            />
          </div>

          {/* Типографика */}
          {HAS_TYPOGRAPHY.includes(block.type) && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Типографика</label>
              <TypographyRow block={block} onUpdate={onUpdate} />
            </div>
          )}

          {/* Содержимое текстовых блоков */}
          {HAS_CONTENT.includes(block.type) && (
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

          {/* Таблица */}
          {block.type === 'table' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Содержимое таблицы</label>
              <TableEditor block={block} onUpdate={onUpdate} />
            </div>
          )}

          {/* Отступ */}
          {block.type === 'spacer' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Высота отступа (px)</label>
              <input type="number" min={5} max={200} value={block.content || '20'}
                onChange={e => onUpdate('content', e.target.value)}
                className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
              />
            </div>
          )}

          {/* Линии */}
          {block.type === 'lines' && (
            <div>
              <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">Количество линий</label>
              <input type="number" min={1} max={20} value={block.content || '6'}
                onChange={e => onUpdate('content', e.target.value)}
                className="w-24 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
              />
            </div>
          )}

          {/* Разделитель */}
          {block.type === 'divider' && (
            <p className="text-[10px] text-[hsl(var(--text-muted))]">Горизонтальная линия — настройка не требуется.</p>
          )}
        </div>
      )}
    </div>
  );
}
