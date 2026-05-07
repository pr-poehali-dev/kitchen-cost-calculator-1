import Icon from '@/components/ui/icon';
import type { Block } from './docTemplateTypes';
import { parseTableContent, serializeTableContent } from './docTemplateTypes';

// Рабочая ширина страницы A4 с полями договора (210 - 20 - 10 = 180мм)
const PAGE_WIDTH_MM = 180;

export default function BlockTableEditor({ block, onUpdate }: {
  block: Block;
  onUpdate: (field: keyof Block, value: string | boolean | number | undefined) => void;
}) {
  const rows = parseTableContent(block.content || 'Колонка 1;Колонка 2\nЗначение 1;Значение 2');
  const numCols = Math.max(...rows.map(r => r.length), 1);
  const numRows = rows.length;

  // colWidths хранятся в % внутри, но показываем и принимаем в мм
  const getColWidths = (): number[] => {
    if (block.colWidths && block.colWidths.length === numCols) return block.colWidths;
    return Array(numCols).fill(Math.round(100 / numCols));
  };
  const colWidths = getColWidths(); // проценты

  // Конвертация: % → мм и мм → %
  const pctToMm = (pct: number) => Math.round((pct / 100) * PAGE_WIDTH_MM);
  const mmToPct = (mm: number) => Math.round((mm / PAGE_WIDTH_MM) * 100);

  const setColWidthMm = (ci: number, mm: number) => {
    const clamped = Math.max(5, Math.min(PAGE_WIDTH_MM - 5, mm));
    const newPct = mmToPct(clamped);
    const next = [...colWidths];
    const diff = newPct - next[ci];
    next[ci] = newPct;
    // Компенсируем разницу на соседнюю колонку
    const neighbor = ci < numCols - 1 ? ci + 1 : ci - 1;
    if (neighbor >= 0 && neighbor < numCols) {
      next[neighbor] = Math.max(mmToPct(5), next[neighbor] - diff);
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
    const newPct = Math.round(100 / (numCols + 1));
    const newWidths = [...colWidths.map(w => Math.round(w * numCols / (numCols + 1))), newPct];
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

  const totalMm = colWidths.reduce((s, w) => s + pctToMm(w), 0);
  const totalPct = colWidths.reduce((s, w) => s + w, 0);

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
              className={`h-full ${['bg-emerald-500/40','bg-blue-500/40','bg-orange-500/40','bg-violet-500/40','bg-pink-500/40','bg-gold/40'][ci % 6]}`}
              title={`Колонка ${ci + 1}: ${pctToMm(w)}мм`}
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
