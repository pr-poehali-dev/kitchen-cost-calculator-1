import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { SavedBlock, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS } from '../calc/constants';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

interface Props {
  block: SavedBlock;
  onClose: () => void;
}

export default function SavedBlockSettingsPanel({ block, onClose }: Props) {
  const store = useStore();
  const [visible, setVisible] = useState<CalcColumnKey[]>(
    block.visibleColumns.length > 0 ? [...block.visibleColumns] : ALL_COLS
  );

  const hidden = ALL_COLS.filter(c => !visible.includes(c));
  const allTypes = store.settings.materialTypes;

  const saveVisible = (next: CalcColumnKey[]) => {
    setVisible(next);
    store.updateSavedBlock(block.id, { visibleColumns: next });
  };

  const addCol = (col: CalcColumnKey) => {
    if (visible.includes(col)) return;
    saveVisible([...visible, col]);
  };

  const removeCol = (col: CalcColumnKey) => {
    if (visible.length <= 2) return;
    saveVisible(visible.filter(c => c !== col));
  };

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateSavedBlock(block.id, { allowedTypeIds: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin px-5 py-4 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Видимые столбцы</div>
            <div className="flex flex-col gap-1.5">
              {visible.map(col => (
                <div key={col} className="flex items-center justify-between px-3 py-2 bg-[hsl(38,40%,18%)] border border-[hsl(38,40%,28%)] rounded text-sm text-gold">
                  <span>{COLUMN_LABELS[col]}</span>
                  <button onClick={() => removeCol(col)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"><Icon name="X" size={12} /></button>
                </div>
              ))}
            </div>
            {hidden.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Нажми чтобы добавить:</div>
                <div className="flex flex-wrap gap-1.5">
                  {hidden.map(col => (
                    <button key={col} onClick={() => addCol(col)} className="flex items-center gap-1 px-2.5 py-1 bg-[hsl(220,12%,16%)] border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold transition-colors">
                      <Icon name="Plus" size={10} />{COLUMN_LABELS[col]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы материалов</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Если не выбрано — все типы</div>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${block.allowedTypeIds.includes(t.id) ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'}`}
                  style={block.allowedTypeIds.includes(t.id) ? { backgroundColor: t.color || '#c8a96e' } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
