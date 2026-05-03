import { useCatalog, updateMaterial } from '@/hooks/useCatalog';
import type { MaterialCategory, Manufacturer, Vendor } from '@/store/types';
import Icon from '@/components/ui/icon';
import SearchInput from '@/components/ui/search-input';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  catFilter: string;
  onCatFilterChange: (v: string) => void;
  mfrFilter: string;
  onMfrFilterChange: (v: string) => void;
  visibleManufacturers: Manufacturer[];
  vendorFilter: string;
  onVendorFilterChange: (v: string) => void;
  visibleVendors: Vendor[];
  hasNoVendor: boolean;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  staleCount: number;
  archivedCount: number;
  visibleCategories: MaterialCategory[];
  hasNoCat: boolean;
  filteredCount: number;
  // Массовые действия
  selectedSize: number;
  totalFilteredCount: number;
  onSelectAll: () => void;
  onBulkArchive: () => void;
  onBulkDeleteRequest: () => void;
  onClearSelection: () => void;
}

export default function MatFilterBar({
  search, onSearchChange,
  catFilter, onCatFilterChange,
  mfrFilter, onMfrFilterChange, visibleManufacturers,
  vendorFilter, onVendorFilterChange, visibleVendors, hasNoVendor,
  showArchived, onShowArchivedChange,
  staleCount, archivedCount,
  visibleCategories, hasNoCat,
  filteredCount,
  selectedSize, totalFilteredCount,
  onSelectAll, onBulkArchive, onBulkDeleteRequest, onClearSelection,
}: Props) {
  const catalog = useCatalog();

  return (
    <>
      {/* Предупреждение о старых ценах */}
      {staleCount > 0 && !showArchived && (
        <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-400">
          <Icon name="Clock" size={13} className="shrink-0" />
          <span className="flex-1">
            <span className="font-medium">{staleCount} материалов</span> не обновлялись более 30 дней — возможно, цены устарели
          </span>
        </div>
      )}

      {/* Переключатель архив / активные */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onShowArchivedChange(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${!showArchived ? 'bg-gold/20 text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
        >
          <Icon name="Package" size={12} /> Активные ({catalog.materials.filter(m => !m.archived).length})
        </button>
        {archivedCount > 0 && (
          <button
            onClick={() => onShowArchivedChange(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${showArchived ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
          >
            <Icon name="Archive" size={12} /> Архив ({archivedCount})
          </button>
        )}
        {showArchived && archivedCount > 0 && (
          <button
            onClick={() => {
              if (!confirm(`Восстановить все ${archivedCount} архивных материалов?`)) return;
              catalog.materials.filter(m => m.archived).forEach(m => updateMaterial(m.id, { archived: false }));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors ml-auto"
          >
            <Icon name="ArchiveRestore" size={12} /> Восстановить все
          </button>
        )}
      </div>

      {/* Поиск + фильтры */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Поиск по названию, артикулу, цвету..."
          className="flex-1 min-w-0 sm:flex-none sm:w-64"
        />

        {/* Фильтр по производителю */}
        {visibleManufacturers.length > 0 && (
          <select
            value={mfrFilter}
            onChange={e => onMfrFilterChange(e.target.value)}
            className={`bg-[hsl(220,12%,14%)] border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors cursor-pointer ${mfrFilter !== 'all' ? 'border-gold/60 text-gold' : 'border-border'}`}
          >
            <option value="all">Все производители</option>
            {visibleManufacturers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Фильтр по поставщику */}
        {(visibleVendors.length > 0 || hasNoVendor) && (
          <select
            value={vendorFilter}
            onChange={e => onVendorFilterChange(e.target.value)}
            className={`bg-[hsl(220,12%,14%)] border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors cursor-pointer ${vendorFilter !== 'all' ? 'border-gold/60 text-gold' : 'border-border'}`}
          >
            <option value="all">Все поставщики</option>
            {visibleVendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            {hasNoVendor && <option value="none">Без поставщика</option>}
          </select>
        )}

        {/* Фильтр по категории */}
        {(visibleCategories.length > 0 || hasNoCat) && (
          <select
            value={catFilter}
            onChange={e => onCatFilterChange(e.target.value)}
            className={`bg-[hsl(220,12%,14%)] border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors cursor-pointer ${catFilter !== 'all' ? 'border-gold/60 text-gold' : 'border-border'}`}
          >
            <option value="all">Все категории</option>
            {visibleCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {hasNoCat && <option value="none">Без категории</option>}
          </select>
        )}

        {/* Сброс активных фильтров */}
        {(mfrFilter !== 'all' || vendorFilter !== 'all' || catFilter !== 'all') && (
          <button
            onClick={() => { onMfrFilterChange('all'); onVendorFilterChange('all'); onCatFilterChange('all'); }}
            className="text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon name="X" size={12} /> Сбросить
          </button>
        )}

        <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">
          {filteredCount} позиций
        </span>
      </div>

      {/* Панель массовых действий */}
      {selectedSize > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-[hsl(220,12%,16%)] border border-gold/30 rounded-lg">
          <span className="text-xs text-gold font-medium">
            Выбрано: {selectedSize}
          </span>
          {selectedSize < totalFilteredCount && (
            <button
              onClick={onSelectAll}
              className="text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              Выбрать все {totalFilteredCount}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {!showArchived && (
              <button
                onClick={onBulkArchive}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,20%)] border border-border rounded hover:border-[hsl(220,12%,30%)] text-[hsl(var(--text-dim))] hover:text-foreground transition-all"
              >
                <Icon name="Archive" size={12} /> В архив
              </button>
            )}
            <button
              onClick={onBulkDeleteRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 border border-destructive/30 rounded hover:bg-destructive/20 text-destructive transition-all"
            >
              <Icon name="Trash2" size={12} /> Удалить {selectedSize}
            </button>
            <button
              onClick={onClearSelection}
              className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
            >
              <Icon name="X" size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}