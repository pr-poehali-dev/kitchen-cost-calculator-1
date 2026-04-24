import { useStore } from '@/store/useStore';
import type { CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS } from './constants';

const ALL_COLS: CalcColumnKey[] = ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

interface Props {
  blockId: string;
  projectId: string;
  onClose: () => void;
}

export default function CalcBlockSettings({ blockId, projectId, onClose }: Props) {
  const store = useStore();
  const project = store.projects.find(p => p.id === projectId);
  const block = project?.blocks.find(b => b.id === blockId);
  if (!block) return null;

  const allTypes = store.settings.materialTypes;

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateBlock(projectId, blockId, { allowedTypeIds: next });
  };

  const toggleCol = (col: CalcColumnKey) => {
    const cur = block.visibleColumns;
    if (cur.includes(col) && cur.length <= 2) return;
    const next = cur.includes(col) ? cur.filter(x => x !== col) : [...cur, col];
    store.updateBlock(projectId, blockId, { visibleColumns: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2.5">Отображаемые столбцы</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_COLS.map(col => (
                <button
                  key={col}
                  onClick={() => toggleCol(col)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors text-left ${
                    block.visibleColumns.includes(col)
                      ? 'bg-[hsl(38,40%,20%)] text-gold border border-[hsl(38,40%,30%)]'
                      : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border border-transparent hover:border-border'
                  }`}
                >
                  <Icon name={block.visibleColumns.includes(col) ? 'CheckSquare' : 'Square'} size={13} />
                  {COLUMN_LABELS[col]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Разрешённые типы материалов</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5">Если не выбрано — доступны все типы</div>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    block.allowedTypeIds.includes(t.id)
                      ? 'text-[hsl(220,16%,8%)]'
                      : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'
                  }`}
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
