import { RefObject } from 'react';
import Icon from '@/components/ui/icon';
import type { Block, BlockAlign, CalcTableSettings } from './docTemplateTypes';
import { CALC_TABLE_COLUMNS } from './docTemplateTypes';
import BlockTableEditor from './BlockTableEditor';
import BlockVarPicker from './BlockVarPicker';

const ALIGN_OPTIONS: { value: BlockAlign; icon: string; title: string }[] = [
  { value: 'left',    icon: 'AlignLeft',    title: 'По левому краю' },
  { value: 'center',  icon: 'AlignCenter',  title: 'По центру' },
  { value: 'right',   icon: 'AlignRight',   title: 'По правому краю' },
  { value: 'justify', icon: 'AlignJustify', title: 'По ширине' },
];

export const HAS_CONTENT = ['paragraph', 'section', 'header'];

interface Props {
  block: Block;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | undefined) => void;
  insertVar: (v: string) => void;
}

export default function BlockContentEditor({ block, textareaRef, onUpdate, insertVar }: Props) {
  return (
    <>
      {/* Содержимое текстовых блоков */}
      {HAS_CONTENT.includes(block.type) && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[hsl(var(--text-muted))]">Содержимое</label>
            <BlockVarPicker onInsert={insertVar} />
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
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[hsl(var(--text-muted))]">
                Блок делится на две равные колонки.
              </p>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!block.twoColRightAlign}
                  onChange={e => onUpdate('twoColRightAlign', e.target.checked)}
                  className="w-3 h-3 accent-gold cursor-pointer"
                />
                <span className="text-[10px] text-[hsl(var(--text-muted))]">Правая — по правому краю</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[hsl(var(--text-muted))]">Левая колонка</label>
                  <BlockVarPicker onInsert={v => update(leftVal + v, rightVal)} />
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
                  <BlockVarPicker onInsert={v => update(leftVal, rightVal + v)} />
                </div>
                <textarea
                  value={rightVal}
                  onChange={e => update(leftVal, e.target.value)}
                  rows={8}
                  className={`w-full bg-[hsl(220,14%,12%)] border border-border rounded px-2 py-1.5 text-xs text-foreground resize-y font-mono leading-relaxed${block.twoColRightAlign ? ' text-right' : ''}`}
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
    </>
  );
}