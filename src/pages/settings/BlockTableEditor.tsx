import Icon from '@/components/ui/icon';
import type { Block } from './docTemplateTypes';
import { parseTableContent, serializeTableContent } from './docTemplateTypes';

type Align = 'left' | 'center' | 'right';
const ALIGN_ICONS: { value: Align; icon: string; title: string }[] = [
  { value: 'left',   icon: 'AlignLeft',   title: 'По левому краю' },
  { value: 'center', icon: 'AlignCenter', title: 'По центру' },
  { value: 'right',  icon: 'AlignRight',  title: 'По правому краю' },
];

// Рабочая ширина страницы A4 с полями договора (210 - 20 - 10 = 180мм)
const PAGE_WIDTH_MM = 180;

const PRESET_COLORS = [
  '#f0f0f0', '#e8f4e8', '#e8f0f8', '#fff8e1', '#fce8e8',
  '#e8e8fc', '#f5f0e8', '#e0f0f0', '#ffffff', '#d0d0d0',
];

export default function BlockTableEditor({ block, onUpdate, onPatch }: {
  block: Block;
  onUpdate: (field: keyof Block, value: string | boolean | number | number[] | Align[] | undefined) => void;
  onPatch: (patch: Partial<Block>) => void;
}) {
  const rows = parseTableContent(block.content || 'Колонка 1;Колонка 2\nЗначение 1;Значение 2');
  const numCols = Math.max(...rows.map(r => r.length), 1);
  const numRows = rows.length;

  const getColWidths = (): number[] => {
    if (block.colWidths && block.colWidths.length === numCols) return block.colWidths;
    return Array(numCols).fill(Math.round(100 / numCols));
  };
  const colWidths = getColWidths();

  const pctToMm = (pct: number) => Math.round((pct / 100) * PAGE_WIDTH_MM);
  const mmToPct = (mm: number) => Math.round((mm / PAGE_WIDTH_MM) * 100);

  const setColWidthMm = (ci: number, mm: number) => {
    const clamped = Math.max(5, Math.min(PAGE_WIDTH_MM - 5, mm));
    const newPct = mmToPct(clamped);
    const next = [...colWidths];
    const diff = newPct - next[ci];
    next[ci] = newPct;
    const neighbor = ci < numCols - 1 ? ci + 1 : ci - 1;
    if (neighbor >= 0 && neighbor < numCols) {
      next[neighbor] = Math.max(mmToPct(5), next[neighbor] - diff);
    }
    onUpdate('colWidths', next);
  };

  const setCell = (ri: number, ci: number, val: string) => {
    const next = rows.map(r => [...r]);
    while (next[ri].length <= ci) next[ri].push('');
    next[ri][ci] = val;
    onUpdate('content', serializeTableContent(next));
  };

  // Батчинг: content + colWidths обновляются атомарно одним вызовом
  const addCol = () => {
    const next = rows.map(r => [...r, '']);
    const newWidths = [...colWidths.map(w => Math.round(w * numCols / (numCols + 1))), Math.round(100 / (numCols + 1))];
    onPatch({ content: serializeTableContent(next), colWidths: newWidths });
  };

  const removeCol = () => {
    if (numCols <= 1) return;
    const next = rows.map(r => r.slice(0, -1));
    const removed = colWidths[numCols - 1];
    const newWidths = colWidths.slice(0, -1).map((w, i) =>
      i === colWidths.slice(0, -1).length - 1 ? w + removed : w
    );
    onPatch({ content: serializeTableContent(next), colWidths: newWidths });
  };

  const addRow = () => {
    onUpdate('content', serializeTableContent([...rows, Array(numCols).fill('')]));
  };

  const removeRow = () => {
    if (numRows <= 1) return;
    onUpdate('content', serializeTableContent(rows.slice(0, -1)));
  };

  const totalMm = colWidths.reduce((s, w) => s + pctToMm(w), 0);
  const totalPct = colWidths.reduce((s, w) => s + w, 0);
  const rowHeight = block.rowHeight ?? 0;

  const getColAligns = (): Align[] => {
    if (block.colAligns && block.colAligns.length === numCols) return block.colAligns;
    return Array(numCols).fill('left');
  };
  const colAligns = getColAligns();

  const setColAlign = (ci: number, align: Align) => {
    const next = [...colAligns];
    next[ci] = align;
    onUpdate('colAligns', next);
  };

  const headerBg = block.headerBg ?? '#f0f0f0';

  return (
    <div className="space-y-2">
      {/* Контролы строк/колонок */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[hsl(var(--text-muted))]">Строки: {numRows}</span>
          <button onClick={removeRow} disabled={numRows <= 1}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="Minus" size={10} />
          </button>
          <button onClick={addRow}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40">
            <Icon name="Plus" size={10} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[hsl(var(--text-muted))]">Колонки: {numCols}</span>
          <button onClick={removeCol} disabled={numCols <= 1}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-foreground disabled:opacity-30">
            <Icon name="Minus" size={10} />
          </button>
          <button onClick={addCol}
            className="w-5 h-5 flex items-center justify-center rounded border border-border text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-500/40">
            <Icon name="Plus" size={10} />
          </button>
        </div>

        {/* Высота строки */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-[hsl(var(--text-muted))]">Высота:</span>
          <input
            type="number"
            min={0} max={50} step={1}
            value={rowHeight || ''}
            placeholder="авто"
            onChange={e => onUpdate('rowHeight', parseInt(e.target.value) || undefined)}
            className="w-14 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground text-center"
          />
          <span className="text-[10px] text-[hsl(var(--text-muted))]">мм</span>
        </div>
      </div>

      {/* Цвет фона заголовка */}
      <div className="space-y-1">
        <p className="text-[10px] text-[hsl(var(--text-muted))]">Цвет фона заголовка (первая строка)</p>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              title={color}
              onClick={() => onUpdate('headerBg', color)}
              className={`w-5 h-5 rounded border transition-all shrink-0 ${
                headerBg === color ? 'border-emerald-500 scale-110' : 'border-border hover:border-foreground/40'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <label
              className="w-5 h-5 rounded border border-border hover:border-foreground/40 cursor-pointer overflow-hidden shrink-0"
              title="Свой цвет"
              style={{ backgroundColor: headerBg }}
            >
              <input
                type="color"
                value={headerBg}
                onChange={e => onUpdate('headerBg', e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </label>
            <span className="text-[10px] text-[hsl(var(--text-muted))] font-mono">{headerBg}</span>
          </div>
        </div>
      </div>

      {/* Ширины колонок в мм */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-[hsl(var(--text-muted))]">
          Ширина колонок (мм, страница {PAGE_WIDTH_MM}мм, итого:{' '}
          <span className={Math.abs(totalPct - 100) > 2 ? 'text-amber-400' : 'text-emerald-400'}>
            {totalMm}мм
          </span>)
        </p>
        <div className="flex flex-wrap gap-2">
          {colWidths.map((w, ci) => (
            <div key={ci} className="flex items-center gap-1">
              <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">К{ci + 1}:</span>
              <input
                type="number"
                min={5} max={PAGE_WIDTH_MM - 5} step={1}
                value={pctToMm(w)}
                onChange={e => setColWidthMm(ci, parseInt(e.target.value) || 5)}
                className="w-14 bg-[hsl(220,14%,12%)] border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground text-center"
              />
              <span className="text-[10px] text-[hsl(var(--text-muted))]">мм</span>
            </div>
          ))}
        </div>
        {/* Визуальная полоса пропорций */}
        <div className="flex h-2 rounded overflow-hidden gap-px">
          {colWidths.map((w, ci) => (
            <div
              key={ci}
              style={{ width: `${w}%` }}
              className={`h-full ${['bg-emerald-500/40','bg-blue-500/40','bg-orange-500/40','bg-violet-500/40','bg-pink-500/40','bg-yellow-500/40'][ci % 6]}`}
              title={`Колонка ${ci + 1}: ${pctToMm(w)}мм`}
            />
          ))}
        </div>
      </div>

      {/* Выравнивание колонок */}
      <div className="space-y-1">
        <p className="text-[10px] text-[hsl(var(--text-muted))]">Выравнивание колонок</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {colWidths.map((_, ci) => (
            <div key={ci} className="flex items-center gap-1">
              <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0 w-5">К{ci + 1}</span>
              <div className="flex gap-0.5">
                {ALIGN_ICONS.map(({ value, icon, title }) => (
                  <button
                    key={value}
                    title={title}
                    onClick={() => setColAlign(ci, value)}
                    className={`w-5 h-5 flex items-center justify-center rounded border transition-all ${
                      colAligns[ci] === value
                        ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                        : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'
                    }`}
                  >
                    <Icon name={icon} size={10} />
                  </button>
                ))}
              </div>
            </div>
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
                  <td
                    key={ci}
                    className="border border-border p-0"
                    style={ri === 0 ? { backgroundColor: headerBg } : undefined}
                  >
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
