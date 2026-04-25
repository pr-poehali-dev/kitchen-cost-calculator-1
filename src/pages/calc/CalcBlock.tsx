import { useStore } from '@/store/useStore';
import type { CalcBlock as CalcBlockType, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS_SHORT, COLUMN_ALIGN, COLUMN_WIDTHS, fmt } from './constants';
import CalcRowComponent from './CalcRowComponent';

interface Props {
  block: CalcBlockType;
  projectId: string;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  isEditingName: boolean;
  editingName: string;
  onStartEditName: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEditName: () => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function CalcBlock({
  block, projectId, currency,
  isFirst, isLast,
  isEditingName, editingName,
  onStartEditName, onEditNameChange, onFinishEditName,
  onOpenSettings, onMoveUp, onMoveDown,
}: Props) {
  const store = useStore();

  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0
    ? block.visibleColumns
    : ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm">
      {/* Block header — тёмный акцентный фон */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,14%)] border-b-2 border-[hsl(var(--gold))]/30">
        <div className="flex items-center gap-2 min-w-0">
          {/* Кнопки перемещения */}
          <div className="flex flex-col gap-0.5 mr-1 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="w-4 h-3.5 flex items-center justify-center rounded-sm text-[hsl(var(--text-muted))] hover:text-gold hover:bg-[hsl(220,12%,22%)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Переместить выше"
            >
              <Icon name="ChevronUp" size={10} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="w-4 h-3.5 flex items-center justify-center rounded-sm text-[hsl(var(--text-muted))] hover:text-gold hover:bg-[hsl(220,12%,22%)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Переместить ниже"
            >
              <Icon name="ChevronDown" size={10} />
            </button>
          </div>

          {isEditingName ? (
            <input
              autoFocus
              value={editingName}
              onChange={e => onEditNameChange(e.target.value)}
              onBlur={onFinishEditName}
              onKeyDown={e => { if (e.key === 'Enter') onFinishEditName(); }}
              className="bg-transparent border-b border-gold outline-none text-sm font-semibold"
            />
          ) : (
            <button
              onClick={onStartEditName}
              className="text-sm font-semibold hover:text-gold transition-colors flex items-center gap-1.5 uppercase tracking-wide"
            >
              {block.name}
              <Icon name="Pencil" size={10} className="opacity-30" />
            </button>
          )}

          {block.allowedTypeIds.length > 0 && (
            <div className="flex gap-1 ml-1 flex-wrap">
              {block.allowedTypeIds.map(tid => {
                const t = store.getTypeById(tid);
                return t ? (
                  <span key={tid} className="text-xs px-1.5 py-0.5 rounded text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>
                    {t.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-gold text-sm font-mono font-semibold">{fmt(blockTotal)} {currency}</span>
          <button
            onClick={onOpenSettings}
            className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5"
            title="Настройки блока"
          >
            <Icon name="SlidersHorizontal" size={13} />
          </button>
          <button
            onClick={() => store.deleteBlock(projectId, block.id)}
            className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
          >
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {/* Column header */}
      <div
        className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-1.5 bg-[hsl(220,14%,10%)] border-b border-border select-none"
        style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
      >
        {visibleCols.map(col => (
          <span
            key={col}
            className={`truncate overflow-hidden ${
              COLUMN_ALIGN[col] === 'right'  ? 'text-right'  :
              COLUMN_ALIGN[col] === 'center' ? 'text-center' : ''
            }`}
            title={COLUMN_LABELS_SHORT[col]}
          >
            {COLUMN_LABELS_SHORT[col]}
          </span>
        ))}
        <span />
      </div>

      {/* Rows — чуть светлее фон */}
      <div className="bg-[hsl(220,13%,12%)]">
        {block.rows.map(row => (
          <CalcRowComponent
            key={row.id}
            row={row}
            projectId={projectId}
            blockId={block.id}
            visibleColumns={visibleCols}
            currency={currency}
            allowedTypeIds={block.allowedTypeIds}
            onDelete={() => store.deleteRow(projectId, block.id, row.id)}
          />
        ))}

        <div className="px-4 py-2 border-t border-[hsl(220,12%,14%)]">
          <button
            onClick={() => store.addRow(projectId, block.id)}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          >
            <Icon name="Plus" size={12} /> Добавить строку
          </button>
        </div>
      </div>
    </div>
  );
}