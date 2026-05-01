import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Material, Manufacturer, Vendor, MaterialType, MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from '../BaseShared';

const ROW_HEIGHT = 44;

interface Props {
  filteredMaterials: Material[];
  mfrMap: Map<string, Manufacturer>;
  vendorMap: Map<string, Vendor>;
  typeMap: Map<string, MaterialType>;
  catMap: Map<string, MaterialCategory>;
  selected: Set<string>;
  isAllVisibleSelected: boolean;
  isIndeterminate: boolean;
  onToggleOne: (id: string) => void;
  onToggleAllVisible: () => void;
  onEdit: (m: Material) => void;
  onDelete: (id: string) => void;
}

function GoldCheckbox({ checked, indeterminate, onChange, onClick }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const active = checked || indeterminate;
  return (
    <div
      onClick={e => { onClick?.(e); onChange?.(); }}
      className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 ${
        active
          ? 'bg-gold shadow-[0_0_0_1px_hsl(var(--gold))]'
          : 'bg-[hsl(220,12%,14%)] shadow-[0_0_0_1.5px_hsl(220,12%,26%)] hover:shadow-[0_0_0_1.5px_hsl(var(--gold))]'
      }`}
    >
      {indeterminate && !checked
        ? <span className="block w-2 h-[1.5px] bg-[hsl(220,16%,8%)] rounded-full" />
        : checked
          ? <Icon name="Check" size={9} className="text-[hsl(220,16%,8%)] stroke-[3]" />
          : null
      }
    </div>
  );
}

export default function MatTable({
  filteredMaterials,
  mfrMap, vendorMap, typeMap, catMap,
  selected, isAllVisibleSelected, isIndeterminate,
  onToggleOne, onToggleAllVisible,
  onEdit, onDelete,
}: Props) {
  const COLS = '20px 2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px';
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredMaterials.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border overflow-hidden">
      {/* Заголовок */}
      <div
        className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
        style={{ gridTemplateColumns: COLS, minWidth: '900px' }}
      >
        <div className="flex items-center">
          <GoldCheckbox
            checked={isAllVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={onToggleAllVisible}
          />
        </div>
        <span>Наименование</span>
        <span>Производитель</span>
        <span>Поставщик</span>
        <span>Тип</span>
        <span>Категория</span>
        <span>Толщ.</span>
        <span>Цвет</span>
        <span>Артикул</span>
        <span className="text-right">Цена</span>
        <span></span>
      </div>

      {filteredMaterials.length === 0 && (
        <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов</div>
      )}

      {/* Виртуальный скролл */}
      <div
        ref={parentRef}
        className="overflow-auto scrollbar-thin"
        style={{ maxHeight: 'calc(100vh - 280px)', overflowX: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
            minWidth: '900px',
          }}
        >
          {items.map(virtualRow => {
            const m = filteredMaterials[virtualRow.index];
            const mfr = mfrMap.get(m.manufacturerId);
            const vendor = vendorMap.get(m.vendorId || '');
            const t = typeMap.get(m.typeId);
            const cat = catMap.get(m.categoryId || '');
            const isSelected = selected.has(m.id);

            return (
              <div
                key={m.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                onClick={() => onToggleOne(m.id)}
                className={`grid items-center px-4 border-b border-[hsl(220,12%,14%)] group transition-colors text-sm cursor-pointer absolute top-0 left-0 w-full ${
                  isSelected ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,12%)]'
                }`}
                style={{
                  gridTemplateColumns: COLS,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${ROW_HEIGHT}px`,
                }}
              >
                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                  <GoldCheckbox checked={isSelected} onChange={() => onToggleOne(m.id)} />
                </div>
                <div className="flex items-center gap-2 truncate">
                  {t && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />}
                  <span className="truncate text-foreground">{m.name}</span>
                </div>
                <span className="text-xs text-[hsl(var(--text-dim))] truncate">{mfr?.name || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))] truncate">{vendor?.name || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{t?.name || '—'}</span>
                {cat
                  ? <span className="text-xs font-medium text-gold truncate">{cat.name}</span>
                  : <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
                }
                <span className="text-xs text-[hsl(var(--text-dim))]">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.color || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))] truncate">
                  {m.article?.startsWith('skat__') || m.article?.startsWith('boyard__')
                    ? '—'
                    : m.article || '—'}
                </span>
                <span className="text-right font-mono text-sm whitespace-nowrap">
                  {fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span>
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onEdit(m)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
                  <button onClick={() => { if (window.confirm(`Удалить материал «${m.name}»?`)) onDelete(m.id); }} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}