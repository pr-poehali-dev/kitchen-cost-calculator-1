import type { Material, Manufacturer, Vendor, MaterialType, MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from '../BaseShared';

interface Props {
  visibleMaterials: Material[];
  filteredCount: number;
  visibleCount: number;
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
  onLoadMore: () => void;
  PAGE: number;
}

// Кастомный чекбокс в стиле проекта
function GoldCheckbox({ checked, indeterminate, onChange, onClick }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={e => { onClick?.(e); onChange?.(); }}
      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
        checked || indeterminate
          ? 'bg-gold border-gold'
          : 'border-[hsl(220,12%,28%)] hover:border-gold/60 bg-transparent'
      }`}
    >
      {indeterminate && !checked
        ? <span className="block w-2 h-0.5 bg-[hsl(220,16%,8%)] rounded-full" />
        : checked
          ? <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />
          : null
      }
    </div>
  );
}

export default function MatTable({
  visibleMaterials, filteredCount, visibleCount,
  mfrMap, vendorMap, typeMap, catMap,
  selected, isAllVisibleSelected, isIndeterminate,
  onToggleOne, onToggleAllVisible,
  onEdit, onDelete, onLoadMore, PAGE,
}: Props) {
  const COLS = '20px 2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px';

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
      {/* Заголовок */}
      <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
        style={{ gridTemplateColumns: COLS }}>
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

      {filteredCount === 0 && (
        <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов</div>
      )}

      {visibleMaterials.map(m => {
        const mfr = mfrMap.get(m.manufacturerId);
        const vendor = vendorMap.get(m.vendorId || '');
        const t = typeMap.get(m.typeId);
        const cat = catMap.get(m.categoryId || '');
        const isSelected = selected.has(m.id);
        return (
          <div
            key={m.id}
            onClick={() => onToggleOne(m.id)}
            className={`grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] group transition-colors text-sm cursor-pointer ${
              isSelected ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,12%)]'
            }`}
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="flex items-center" onClick={e => e.stopPropagation()}>
              <GoldCheckbox checked={isSelected} onChange={() => onToggleOne(m.id)} />
            </div>
            <div className="flex items-center gap-2 truncate">
              {t && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />}
              <span className="truncate text-foreground">{m.name}</span>
            </div>
            <span className="text-xs text-[hsl(var(--text-dim))]">{mfr?.name || '—'}</span>
            <span className="text-xs text-[hsl(var(--text-dim))]">{vendor?.name || '—'}</span>
            <span className="text-xs text-[hsl(var(--text-dim))]">{t?.name || '—'}</span>
            {cat
              ? <span className="text-xs font-medium text-gold">{cat.name}</span>
              : <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
            }
            <span className="text-xs text-[hsl(var(--text-dim))]">{m.thickness ? `${m.thickness}мм` : '—'}</span>
            <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.color || '—'}</span>
            <span className="text-xs text-[hsl(var(--text-dim))]">{m.article || '—'}</span>
            <span className="text-right font-mono text-sm">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <button onClick={() => onEdit(m)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
              <button onClick={() => onDelete(m.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
            </div>
          </div>
        );
      })}

      {visibleCount < filteredCount && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
          <span>Показано {visibleCount} из {filteredCount}</span>
          <button
            onClick={onLoadMore}
            className="px-3 py-1.5 bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,20%)] rounded transition-colors text-foreground"
          >
            Показать ещё
          </button>
        </div>
      )}
    </div>
  );
}
