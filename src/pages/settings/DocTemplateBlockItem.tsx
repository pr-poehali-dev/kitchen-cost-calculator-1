import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import type { Block, BlockAlign, BlockCondition, CalcTableSettings } from './docTemplateTypes';
import { parseTableContent, serializeTableContent, VAR_GROUPS, CONDITION_FIELDS, CONDITION_OPERATORS, PAYMENT_TYPE_OPTIONS, CALC_TABLE_COLUMNS } from './docTemplateTypes';

interface Props {
  block: Block;
  idx: number;
  totalBlocks: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | undefined) => void;
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

      {/* Отступ сверху / снизу */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">↑ мм</label>
        <input
          type="number"
          min={0} max={50} step={1}
          placeholder="—"
          value={block.marginTop ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('marginTop', v === '' ? undefined : parseFloat(v));
          }}
          className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">↓ мм</label>
        <input
          type="number"
          min={0} max={50} step={1}
          placeholder="—"
          value={block.marginBottom ?? ''}
          onChange={e => {
            const v = e.target.value;
            onUpdate('marginBottom', v === '' ? undefined : parseFloat(v));
          }}
          className="w-12 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center"
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
  const numRows = rows.length;

  const getColWidths = (): number[] => {
    if (block.colWidths && block.colWidths.length === numCols) return block.colWidths;
    return Array(numCols).fill(Math.round(100 / numCols));
  };
  const colWidths = getColWidths();

  const setColWidth = (ci: number, val: number) => {
    const next = [...colWidths];
    const clamped = Math.max(5, Math.min(90, val));
    const diff = clamped - next[ci];
    next[ci] = clamped;
    // Компенсируем разницу из соседней правой колонки (или левой если последняя)
    const neighbor = ci < numCols - 1 ? ci + 1 : ci - 1;
    if (neighbor >= 0 && neighbor < numCols) {
      next[neighbor] = Math.max(5, next[neighbor] - diff);
    }
    onUpdate('colWidths', next as unknown as number);
  };

  const setCell = (ri: number, ci: number, val: string) => {
    const next = rows.map(r => [...r]);
    while (next[ri].length <= ci) next[ri].push('');
    next[ri][ci] = val;
    onUpdate('content', serializeTableContent(next));
  };

  const addCol = () => {
    const next = rows.map(r => [...r, '']);
    onUpdate('content', serializeTableContent(next));
    const newWidth = Math.round(100 / (numCols + 1));
    const newWidths = [...colWidths.map(w => Math.round(w * numCols / (numCols + 1))), newWidth];
    onUpdate('colWidths', newWidths as unknown as number);
  };

  const removeCol = () => {
    if (numCols <= 1) return;
    const next = rows.map(r => r.slice(0, -1));
    onUpdate('content', serializeTableContent(next));
    const removed = colWidths[numCols - 1];
    const newWidths = colWidths.slice(0, -1).map((w, i) =>
      i === colWidths.length - 2 ? w + removed : w
    );
    onUpdate('colWidths', newWidths as unknown as number);
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

  const total = colWidths.reduce((s, w) => s + w, 0);

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

      {/* Ширины колонок */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[hsl(var(--text-muted))]">
          Ширина колонок (%, итого: <span className={total !== 100 ? 'text-amber-400' : 'text-emerald-400'}>{total}%</span>)
        </p>
        <div className="flex flex-wrap gap-2">
          {colWidths.map((w, ci) => (
            <div key={ci} className="flex items-center gap-1">
              <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">К{ci + 1}:</span>
              <input
                type="number"
                min={5} max={90} step={1}
                value={w}
                onChange={e => setColWidth(ci, parseInt(e.target.value) || 5)}
                className="w-14 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground text-center"
              />
              <span className="text-[10px] text-[hsl(var(--text-muted))]">%</span>
            </div>
          ))}
        </div>
        {/* Визуальная полоса пропорций */}
        <div className="flex h-2 rounded overflow-hidden gap-px">
          {colWidths.map((w, ci) => (
            <div
              key={ci}
              style={{ width: `${w}%` }}
              className={`h-full ${['bg-emerald-500/40','bg-blue-500/40','bg-orange-500/40','bg-violet-500/40','bg-pink-500/40','bg-gold/40'][ci % 6]}`}
              title={`Колонка ${ci + 1}: ${w}%`}
            />
          ))}
        </div>
      </div>

      {/* Сетка ячеек */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {colWidths.map((w, ci) => <col key={ci} style={{ width: `${w}%` }} />)}
          </colgroup>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {Array.from({ length: numCols }).map((_, ci) => (
                  <td key={ci} className={`border border-border p-0 ${ri === 0 ? 'bg-[hsl(220,14%,10%)]' : ''}`}>
                    <input
                      value={row[ci] ?? ''}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      placeholder={ri === 0 ? `Колонка ${ci + 1}` : ''}
                      className={`w-full bg-transparent px-1.5 py-1 text-[10px] text-foreground outline-none ${ri === 0 ? 'font-medium' : ''}`}
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

function VarPicker({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
        title="Вставить переменную"
      >
        <Icon name="Braces" size={10} /> Переменная
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl w-64 max-h-72 overflow-y-auto">
          {VAR_GROUPS.map(group => (
            <div key={group.label}>
              <div className="px-3 py-1.5 text-[10px] text-[hsl(var(--text-muted))] font-medium uppercase tracking-wide border-b border-border/50 bg-[hsl(220,14%,10%)]">
                {group.label}
              </div>
              {group.vars.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => { onInsert(v.key); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/10 transition-colors"
                >
                  <div className="text-[10px] text-emerald-400 font-mono">{v.key}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))]">{v.desc}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: BlockCondition | undefined;
  onChange: (c: BlockCondition | undefined) => void;
  onRemove: () => void;
}) {
  const selectedField = CONDITION_FIELDS.find(f => f.value === condition?.field);
  const selectedOp = CONDITION_OPERATORS.find(o => o.value === condition?.operator);

  if (!condition) {
    return (
      <button
        type="button"
        onClick={() => onChange({ field: 'payment_type', operator: 'eq', value: '' })}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-border text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
      >
        <Icon name="GitBranch" size={10} /> Добавить условие
      </button>
    );
  }

  const needsValue = selectedOp?.needsValue ?? true;
  const isPaymentType = condition.field === 'payment_type';

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <Icon name="GitBranch" size={10} className="text-amber-400 shrink-0" />
      <span className="text-[10px] text-amber-400 shrink-0">Показывать если:</span>

      <select
        value={condition.field}
        onChange={e => onChange({ ...condition, field: e.target.value as BlockCondition['field'], value: '' })}
        className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
      >
        {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        value={condition.operator}
        onChange={e => onChange({ ...condition, operator: e.target.value as BlockCondition['operator'] })}
        className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
      >
        {CONDITION_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {needsValue && isPaymentType && (
        <select
          value={condition.value || ''}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          className="bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
        >
          <option value="">— выбери —</option>
          {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {needsValue && !isPaymentType && (
        <input
          type="text"
          value={condition.value || ''}
          onChange={e => onChange({ ...condition, value: e.target.value })}
          placeholder="значение"
          className="w-20 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground"
        />
      )}

      <button type="button" onClick={onRemove} className="text-red-400/50 hover:text-red-400 transition-all ml-auto">
        <Icon name="X" size={10} />
      </button>
    </div>
  );
}

export default function DocTemplateBlockItem({
  block, idx, totalBlocks, isEditing,
  onToggleEdit, onToggleEnabled, onMove, onRemove, onUpdate,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) {
      onUpdate('content', (block.content || '') + v);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = block.content.slice(0, start) + v + block.content.slice(end);
    onUpdate('content', next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    }, 0);
  };

  const hasCondition = !!block.condition;

  return (
    <div className={`border rounded-lg transition-all ${
      block.enabled
        ? hasCondition ? 'border-amber-500/40' : 'border-border'
        : 'border-border/40 opacity-50'
    }`}>
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
          block.type === 'image'      ? 'border-pink-500/40 text-pink-400 bg-pink-500/10' :
          block.type === 'calc_table' ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' :
          'border-border text-[hsl(var(--text-muted))]'
        }`}>
          {{ section:'раздел', header:'шапка', divider:'линия', spacer:'отступ', lines:'линии', table:'таблица', paragraph:'текст', image:'фото', calc_table:'из расчёта' }[block.type] || block.type}
        </span>

        <span className="flex-1 text-xs text-foreground truncate">{block.label}</span>

        {/* Индикатор условия */}
        {hasCondition && (
          <span title="Есть условие показа" className="shrink-0">
            <Icon name="GitBranch" size={11} className="text-amber-400" />
          </span>
        )}

        {/* Индикаторы активных стилей */}
        {(block.bold || block.italic || block.underline || block.fontSize || block.align || block.marginTop != null || block.marginBottom != null) && (
          <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0 flex items-center gap-0.5">
            {block.fontSize && <span>{block.fontSize}pt</span>}
            {block.bold && <span className="font-bold">B</span>}
            {block.italic && <span className="italic">I</span>}
            {block.underline && <span className="underline">U</span>}
            {block.align && block.align !== 'justify' && <span>{({left:'←',center:'⊡',right:'→'})[block.align]}</span>}
            {block.marginTop != null && <span>↑{block.marginTop}</span>}
            {block.marginBottom != null && <span>↓{block.marginBottom}</span>}
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

          {/* Условие показа */}
          <div>
            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Условие показа блока</label>
            <ConditionEditor
              condition={block.condition}
              onChange={c => onUpdate('condition', c as unknown as string)}
              onRemove={() => onUpdate('condition', undefined)}
            />
            {!block.condition && (
              <p className="text-[10px] text-[hsl(var(--text-muted))] mt-1">
                Без условия блок всегда виден (если включён). С условием — появляется только при выполнении правила.
              </p>
            )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-[hsl(var(--text-muted))]">Содержимое</label>
                <VarPicker onInsert={insertVar} />
              </div>
              <textarea
                ref={textareaRef}
                value={block.content}
                onChange={e => onUpdate('content', e.target.value)}
                rows={3}
                className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground resize-none font-mono"
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

          {/* Таблица из расчёта */}
          {block.type === 'calc_table' && (() => {
            const cts: CalcTableSettings = block.calcTableSettings || {
              columns: ['name','qty','unit','total'],
              showBlockHeaders: true,
              showServices: true,
              showTotal: true,
              priceMode: 'client',
            };
            const updateCts = (patch: Partial<CalcTableSettings>) => {
              onUpdate('calcTableSettings', { ...cts, ...patch } as unknown as string);
            };
            const toggleCol = (col: string) => {
              const cols = cts.columns.includes(col as never)
                ? cts.columns.filter(c => c !== col)
                : [...cts.columns, col as never];
              updateCts({ columns: cols });
            };
            const btnBase = 'px-2 py-0.5 rounded border text-[10px] transition-all';
            const btnOn = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400';
            const btnOff = 'border-border text-[hsl(var(--text-muted))] hover:text-foreground';
            return (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-2">Колонки таблицы</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CALC_TABLE_COLUMNS.map(col => (
                      <button key={col.key} type="button"
                        onClick={() => toggleCol(col.key)}
                        className={`${btnBase} ${cts.columns.includes(col.key) ? btnOn : btnOff}`}
                      >{col.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-[10px] text-[hsl(var(--text-muted))] w-full">Параметры</label>
                  <button type="button" onClick={() => updateCts({ showBlockHeaders: !cts.showBlockHeaders })}
                    className={`${btnBase} ${cts.showBlockHeaders ? btnOn : btnOff}`}>Заголовки блоков</button>
                  <button type="button" onClick={() => updateCts({ showServices: !cts.showServices })}
                    className={`${btnBase} ${cts.showServices ? btnOn : btnOff}`}>Услуги</button>
                  <button type="button" onClick={() => updateCts({ showTotal: !cts.showTotal })}
                    className={`${btnBase} ${cts.showTotal ? btnOn : btnOff}`}>Итоговая строка</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">Цена:</label>
                  <button type="button" onClick={() => updateCts({ priceMode: 'client' })}
                    className={`${btnBase} ${cts.priceMode === 'client' ? btnOn : btnOff}`}>Розничная</button>
                  <button type="button" onClick={() => updateCts({ priceMode: 'base' })}
                    className={`${btnBase} ${cts.priceMode === 'base' ? btnOn : btnOff}`}>Закупочная</button>
                </div>
                <p className="text-[10px] text-[hsl(var(--text-muted))]">
                  Таблица автоматически заполняется из смет, привязанных к карточке клиента.
                </p>
              </div>
            );
          })()}

          {/* Фото */}
          {block.type === 'image' && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">URL изображения</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={block.content}
                    onChange={e => onUpdate('content', e.target.value)}
                    placeholder="https://... или оставь пустым для авто-подстановки из карточки"
                    className="flex-1 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
                  />
                </div>
                <p className="text-[10px] text-[hsl(var(--text-muted))] mt-1">Если оставить пустым — в документе автоматически подставится фото из карточки клиента.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">Выравнивание</label>
                  <div className="flex items-center gap-1">
                    {ALIGN_OPTIONS.filter(a => a.value !== 'justify').map(({ value, icon, title }) => (
                      <button
                        key={value}
                        onClick={() => onUpdate('align', block.align === value ? undefined : value)}
                        className={`w-6 h-6 flex items-center justify-center rounded border text-[10px] transition-all ${block.align === value ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
                        title={title}
                      >
                        <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={11} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {block.content && (
                <img src={block.content} alt="preview" className="max-h-32 rounded border border-border object-contain" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}