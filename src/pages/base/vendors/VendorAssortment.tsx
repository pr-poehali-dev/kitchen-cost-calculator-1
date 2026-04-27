import { useStore } from '@/store/useStore';
import type { Material, Vendor } from '@/store/types';
import Icon from '@/components/ui/icon';
import { MaterialRow } from '../BaseShared';

interface MfrGroup {
  manufacturer: { id: string; name: string };
  materials: Material[];
}

interface Props {
  vendor: Vendor;
  vendorMaterialsCount: number;
  mfrWithMaterials: MfrGroup[];
  filteredCount: number;
  matSearch: string;
  expandedMfr: Record<string, boolean>;
  allTypesFirstId: string | undefined;
  onSearchChange: (v: string) => void;
  onToggleMfr: (mfrId: string) => void;
  onAddMaterial: (patch: Partial<Material>) => void;
  onEditMaterial: (m: Material) => void;
}

export default function VendorAssortment({
  vendor,
  vendorMaterialsCount,
  mfrWithMaterials,
  filteredCount,
  matSearch,
  expandedMfr,
  allTypesFirstId,
  onSearchChange,
  onToggleMfr,
  onAddMaterial,
  onEditMaterial,
}: Props) {
  const store = useStore();

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <span className="text-sm font-medium shrink-0">Ассортимент ({vendorMaterialsCount} позиций)</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex items-center flex-1 min-w-0 max-w-xs">
            <Icon name="Search" size={12} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
            <input
              value={matSearch}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Поиск по материалам..."
              className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
            />
            {matSearch && (
              <button onClick={() => onSearchChange('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={11} />
              </button>
            )}
          </div>
          {matSearch && <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">{filteredCount} найдено</span>}
        </div>
        <button
          onClick={() => onAddMaterial({
            vendorId: vendor.id,
            unit: 'м²',
            typeId: allTypesFirstId,
            basePrice: 0,
          })}
          className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80 shrink-0"
        >
          <Icon name="Plus" size={12} /> Добавить
        </button>
      </div>

      {vendorMaterialsCount === 0 && (
        <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">
          Нет материалов. Нажмите «Добавить позицию» или кнопку «+» у производителя выше.
        </div>
      )}

      {mfrWithMaterials.map(({ manufacturer, materials: mats }) => {
        const isExpanded = expandedMfr[manufacturer.id] !== false;
        return (
          <div key={manufacturer.id} className="border-b border-border last:border-0">
            {/* Manufacturer header */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(220,12%,13%)] cursor-pointer hover:bg-[hsl(220,12%,15%)] transition-colors"
              onClick={() => onToggleMfr(manufacturer.id)}
            >
              <Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={12} className="text-[hsl(var(--text-muted))]" />
              <Icon name="Building2" size={13} className="text-[hsl(var(--text-dim))]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-dim))] flex-1">{manufacturer.name}</span>
              <span className="text-xs text-[hsl(var(--text-muted))]">{mats.length} позиций</span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onAddMaterial({
                    manufacturerId: manufacturer.id,
                    vendorId: vendor.id,
                    unit: 'м²',
                    typeId: allTypesFirstId,
                    basePrice: 0,
                  });
                }}
                className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors p-0.5 ml-1"
                title="Добавить материал"
              >
                <Icon name="Plus" size={13} />
              </button>
            </div>

            {isExpanded && (
              <div>
                {(() => {
                  const allCategories = store.settings.materialCategories || [];
                  const catsUsed = allCategories.filter(c => mats.some(m => m.categoryId === c.id));
                  const uncategorized = mats.filter(m => !m.categoryId);
                  if (catsUsed.length === 0) {
                    return mats.map(m => (
                      <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                        onEdit={() => onEditMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
                    ));
                  }
                  return (
                    <>
                      {catsUsed.map(cat => {
                        const ct = cat.typeId ? store.getTypeById(cat.typeId) : null;
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center gap-2 px-6 py-1.5 bg-[hsl(220,12%,15%)] border-b border-[hsl(220,12%,17%)]">
                              <span className="text-xs font-medium text-gold">{cat.name}</span>
                              {ct && <span className="text-xs text-[hsl(var(--text-muted))]">· {ct.name}</span>}
                              <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">{mats.filter(m => m.categoryId === cat.id).length} поз.</span>
                            </div>
                            {mats.filter(m => m.categoryId === cat.id).map(m => (
                              <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                                onEdit={() => onEditMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
                            ))}
                          </div>
                        );
                      })}
                      {uncategorized.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-6 py-1.5 bg-[hsl(220,12%,15%)] border-b border-[hsl(220,12%,17%)]">
                            <span className="text-xs text-[hsl(var(--text-muted))]">Без категории</span>
                            <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">{uncategorized.length} поз.</span>
                          </div>
                          {uncategorized.map(m => (
                            <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                              onEdit={() => onEditMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
