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

const HAS_TYPOGRAPHY = ['paragraph', 'section', 'header', 'table', 'two_col'];
const HAS_CONTENT    = ['paragraph', 'section', 'header'];

function VarPicker({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filtered = q
    ? VAR_GROUPS.map(g => ({
        ...g,
        vars: g.vars.filter(v =>
          v.key.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q) || v.preview.toLowerCase().includes(q)
        ),
      })).filter(g => g.vars.length > 0)
    : VAR_GROUPS;

  const totalCount = VAR_GROUPS.reduce((s, g) => s + g.vars.length, 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(p => !p); setQuery(''); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-[10px] text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
        title="Вставить переменную"
      >
        <Icon name="Braces" size={10} /> Переменная
      </button>
      {open && (
        <>
          {/* Оверлей для закрытия */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-2xl flex flex-col"
               style={{ width: 320, maxHeight: 440 }}>
            {/* Шапка */}
            <div className="px-3 pt-2.5 pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Braces" size={12} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground">Переменные</span>
                <span className="ml-auto text-[10px] text-[hsl(var(--text-muted))]">{totalCount} шт.</span>
              </div>
              {/* Поиск */}
              <div className="relative">
                <Icon name="Search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="w-full bg-[hsl(220,14%,10%)] border border-border rounded pl-6 pr-2 py-1 text-[11px] text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-emerald-500/50"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
                    <Icon name="X" size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Список */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-[hsl(var(--text-muted))]">
                  Ничего не найдено
                </div>
              ) : (
                filtered.map(group => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-[10px] text-[hsl(var(--text-muted))] font-semibold uppercase tracking-wide border-b border-border/40 bg-[hsl(220,14%,10%)] sticky top-0">
                      {group.label}
                      <span className="ml-1.5 normal-case font-normal opacity-60">({group.vars.length})</span>
                    </div>
                    {group.vars.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => { onInsert(v.key); setOpen(false); setQuery(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 transition-colors group border-b border-border/20 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-emerald-400 font-mono group-hover:text-emerald-300">{v.key}</span>
                          <span className="text-[10px] text-[hsl(var(--text-muted))] truncate text-right">{v.preview}</span>
                        </div>
                        <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Подсказка */}
            <div className="px-3 py-2 border-t border-border shrink-0 flex items-center gap-1.5">
              <Icon name="Info" size={10} className="text-[hsl(var(--text-muted))] shrink-0" />
              <span className="text-[10px] text-[hsl(var(--text-muted))]">Кликни — вставится в позицию курсора</span>
            </div>
          </div>
        </>
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

      {/* Две колонки */}
      {block.type === 'two_col' && (() => {
        const sep = block.content.indexOf('\n---\n');
        const leftVal  = sep >= 0 ? block.content.slice(0, sep)  : block.content;
        const rightVal = sep >= 0 ? block.content.slice(sep + 5) : '';
        const update = (left: string, right: string) => onUpdate('content', left + '\n---\n' + right);
        return (
          <div className="space-y-2">
            <p className="text-[10px] text-[hsl(var(--text-muted))]">
              Блок делится на две равные колонки. Разделитель <code className="bg-[hsl(220,14%,10%)] px-1 rounded">---</code> нельзя удалять.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[hsl(var(--text-muted))]">Левая колонка</label>
                  <VarPicker onInsert={v => update(leftVal + v, rightVal)} />
                </div>
                <textarea
                  value={leftVal}
                  onChange={e => update(e.target.value, rightVal)}
                  rows={8}
                  className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1.5 text-xs text-foreground resize-y font-mono leading-relaxed"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[hsl(var(--text-muted))]">Правая колонка</label>
                  <VarPicker onInsert={v => update(leftVal, rightVal + v)} />
                </div>
                <textarea
                  value={rightVal}
                  onChange={e => update(leftVal, e.target.value)}
                  rows={8}
                  className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1.5 text-xs text-foreground resize-y font-mono leading-relaxed"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Фото */}
      {block.type === 'image' && (
        <div className="space-y-3">
          {/* URL */}
          <div>
            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1">URL изображения</label>
            <input
              type="text"
              value={block.content}
              onChange={e => onUpdate('content', e.target.value)}
              placeholder="https://... или оставь пустым — подставится из карточки"
              className="w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1 text-xs text-foreground"
            />
            <p className="text-[10px] text-[hsl(var(--text-muted))] mt-1">Если оставить пустым — подставится фото из карточки клиента.</p>
          </div>

          {/* Размер */}
          <div>
            <label className="text-[10px] text-[hsl(var(--text-muted))] block mb-1.5">Размер (мм, 0 = авто)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1">
                <Icon name="ArrowLeftRight" size={11} className="text-[hsl(var(--text-muted))] shrink-0" />
                <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">Ш</span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={block.imageWidth ?? ''}
                  onChange={e => onUpdate('imageWidth', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="авто"
                  className="flex-1 bg-transparent text-xs text-foreground outline-none w-0 min-w-0"
                />
                <span className="text-[10px] text-[hsl(var(--text-muted))]">мм</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1">
                <Icon name="ArrowUpDown" size={11} className="text-[hsl(var(--text-muted))] shrink-0" />
                <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">В</span>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={block.imageHeight ?? ''}
                  onChange={e => onUpdate('imageHeight', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="авто"
                  className="flex-1 bg-transparent text-xs text-foreground outline-none w-0 min-w-0"
                />
                <span className="text-[10px] text-[hsl(var(--text-muted))]">мм</span>
              </div>
            </div>
            {/* Быстрые пресеты */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[
                { label: 'Мал', w: 60, h: 45 },
                { label: 'Средн', w: 120, h: 90 },
                { label: 'Больш', w: 180, h: 135 },
                { label: 'Полная ширина', w: 0, h: 0 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => { onUpdate('imageWidth', p.w || undefined); onUpdate('imageHeight', p.h || undefined); }}
                  className={`px-2 py-0.5 rounded border text-[10px] transition-all ${
                    (block.imageWidth ?? 0) === p.w && (block.imageHeight ?? 0) === p.h
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                      : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Выравнивание */}
          <div className="flex items-center gap-2">
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

          {/* Превью */}
          {block.content && (
            <div className="relative rounded border border-border overflow-hidden bg-[hsl(220,14%,10%)]">
              <img
                src={block.content}
                alt="preview"
                className="object-contain mx-auto block"
                style={{
                  maxHeight: 140,
                  width: block.imageWidth ? `${block.imageWidth}mm` : '100%',
                  height: block.imageHeight ? `${block.imageHeight}mm` : 'auto',
                  maxWidth: '100%',
                }}
              />
              {(block.imageWidth || block.imageHeight) && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
                  {block.imageWidth ? `${block.imageWidth}мм` : 'авто'} × {block.imageHeight ? `${block.imageHeight}мм` : 'авто'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}