import { useState, RefObject } from 'react';
import Icon from '@/components/ui/icon';
import type { Block, BlockAlign, BlockCondition, CalcTableSettings } from './docTemplateTypes';
import { VAR_GROUPS, CONDITION_FIELDS, CONDITION_OPERATORS, PAYMENT_TYPE_OPTIONS, CALC_TABLE_COLUMNS } from './docTemplateTypes';
import BlockTypographyRow from './BlockTypographyRow';
import BlockTableEditor from './BlockTableEditor';

const ALIGN_OPTIONS: { value: BlockAlign; icon: string; title: string }[] = [
  { value: 'left',    icon: 'AlignLeft',    title: 'По левому краю' },
  { value: 'center',  icon: 'AlignCenter',  title: 'По центру' },
  { value: 'right',   icon: 'AlignRight',   title: 'По правому краю' },
  { value: 'justify', icon: 'AlignJustify', title: 'По ширине' },
];

const HAS_TYPOGRAPHY = ['paragraph', 'section', 'header', 'table'];
const HAS_CONTENT    = ['paragraph', 'section', 'header'];

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

interface BlockEditorPanelsProps {
  block: Block;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | undefined) => void;
  insertVar: (v: string) => void;
}

export default function BlockEditorPanels({ block, textareaRef, onUpdate, insertVar }: BlockEditorPanelsProps) {
  return (
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
          <BlockTypographyRow block={block} onUpdate={onUpdate} />
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
            rows={6}
            spellCheck={false}
            className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1.5 text-xs text-foreground resize-y font-mono leading-relaxed"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />
        </div>
      )}

      {/* Таблица */}
      {block.type === 'table' && (
        <div>
          <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Содержимое таблицы</label>
          <BlockTableEditor block={block} onUpdate={onUpdate} />
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
  );
}