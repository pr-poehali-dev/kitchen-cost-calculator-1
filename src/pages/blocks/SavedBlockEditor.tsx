import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { SavedBlock, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS_SHORT, COLUMN_ALIGN, COLUMN_WIDTHS, fmt } from '../calc/constants';
import SavedBlockRow from './SavedBlockRow';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

interface Props {
  block: SavedBlock;
  currency: string;
  onOpenSettings: () => void;
  onDelete: () => void;
}

export default function SavedBlockEditor({ block, currency, onOpenSettings, onDelete }: Props) {
  const store = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(block.name);

  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0 ? block.visibleColumns : ALL_COLS;
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');
  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);

  const finishEditName = () => {
    store.updateSavedBlock(block.id, { name: nameVal || block.name });
    setEditingName(false);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,14%)] border-b-2 border-[hsl(var(--gold))]/30">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={finishEditName}
              onKeyDown={e => { if (e.key === 'Enter') finishEditName(); }}
              className="bg-transparent border-b border-gold outline-none text-sm font-semibold"
            />
          ) : (
            <button
              onClick={() => { setNameVal(block.name); setEditingName(true); }}
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
          <button onClick={onOpenSettings} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5" title="Настройки">
            <Icon name="SlidersHorizontal" size={13} />
          </button>
          <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {/* Column headers */}
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

      {/* Rows */}
      <div className="bg-[hsl(220,13%,12%)]">
        {block.rows.map(row => (
          <SavedBlockRow
            key={row.id}
            block={block}
            rowId={row.id}
            visibleCols={visibleCols}
            gridCols={gridCols}
            currency={currency}
          />
        ))}
        <div className="px-4 py-2 border-t border-[hsl(220,12%,14%)]">
          <button
            onClick={() => store.addSavedBlockRow(block.id)}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          >
            <Icon name="Plus" size={12} /> Добавить строку
          </button>
        </div>
      </div>
    </div>
  );
}
