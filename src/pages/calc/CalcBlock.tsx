import { useStore } from '@/store/useStore';
import type { CalcBlock as CalcBlockType, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS, COLUMN_WIDTHS, fmt } from './constants';
import CalcRowComponent from './CalcRowComponent';

interface Props {
  block: CalcBlockType;
  projectId: string;
  currency: string;
  isEditingName: boolean;
  editingName: string;
  onStartEditName: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEditName: () => void;
  onOpenSettings: () => void;
}

export default function CalcBlock({
  block, projectId, currency,
  isEditingName, editingName,
  onStartEditName, onEditNameChange, onFinishEditName,
  onOpenSettings,
}: Props) {
  const store = useStore();

  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0
    ? block.visibleColumns
    : ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
      {/* Block header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
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
              className="text-sm font-semibold hover:text-gold transition-colors flex items-center gap-1.5"
            >
              {block.name}
              <Icon name="Pencil" size={11} className="opacity-40" />
            </button>
          )}

          {block.allowedTypeIds.length > 0 && (
            <div className="flex gap-1 ml-2 flex-wrap">
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
          <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(blockTotal)} {currency}</span>
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
        className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
      >
        {visibleCols.map(col => (
          <span key={col} className={col === 'qty' || col === 'price' ? 'text-right' : ''}>
            {COLUMN_LABELS[col]}
          </span>
        ))}
        <span />
      </div>

      {/* Rows */}
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

      <div className="px-4 py-2">
        <button
          onClick={() => store.addRow(projectId, block.id)}
          className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
        >
          <Icon name="Plus" size={12} /> Добавить строку
        </button>
      </div>
    </div>
  );
}
