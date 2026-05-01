import { useStore } from '@/store/useStore';
import { deleteMaterial } from '@/hooks/useCatalog';
import type { Manufacturer, Material, MaterialType, MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';
import { MaterialRow } from '../BaseShared';

interface GroupedByCat {
  category: MaterialCategory;
  materials: Material[];
}

interface GroupedByType {
  type: MaterialType;
  groupedByCat: GroupedByCat[];
  uncategorized: Material[];
}

interface Props {
  manufacturer: Manufacturer;
  mfrMaterials: Material[];
  filteredMfrMaterials: Material[];
  groupedByType: GroupedByType[];
  ungrouped: Material[];
  matSearch: string;
  catFilter: string;
  allCategories: MaterialCategory[];
  allTypesFirstId: string | undefined;
  onMatSearchChange: (v: string) => void;
  onCatFilterChange: (v: string) => void;
  onAddMaterial: () => void;
  onEditMaterial: (m: Material) => void;
}

export default function MfrAssortment({
  manufacturer, mfrMaterials, filteredMfrMaterials,
  groupedByType, ungrouped,
  matSearch, catFilter, allCategories, allTypesFirstId,
  onMatSearchChange, onCatFilterChange, onAddMaterial, onEditMaterial,
}: Props) {
  const store = useStore();

  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">Продукция производителя ({mfrMaterials.length})</span>
        <button
          onClick={onAddMaterial}
          className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80"
        >
          <Icon name="Plus" size={12} /> Добавить материал
        </button>
      </div>

      {/* Search + Category filter */}
      {mfrMaterials.length > 0 && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Icon name="Search" size={12} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
            <input
              value={matSearch}
              onChange={e => onMatSearchChange(e.target.value)}
              placeholder="Поиск по материалам..."
              className="bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors w-52"
            />
            {matSearch && (
              <button onClick={() => onMatSearchChange('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={11} />
              </button>
            )}
          </div>
          {allCategories.filter(c => mfrMaterials.some(m => m.categoryId === c.id)).length > 0 && (
            <select value={catFilter} onChange={e => onCatFilterChange(e.target.value)}
              className="bg-[hsl(220,12%,14%)] border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors cursor-pointer">
              <option value="all">Все категории</option>
              {allCategories.filter(c => mfrMaterials.some(m => m.categoryId === c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {mfrMaterials.some(m => !m.categoryId) && <option value="none">Без категории</option>}
            </select>
          )}
          <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">{filteredMfrMaterials.length} позиций</span>
        </div>
      )}

      {mfrMaterials.length === 0 && (
        <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Материалы не добавлены</div>
      )}
      {filteredMfrMaterials.length === 0 && mfrMaterials.length > 0 && (
        <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов в выбранной категории</div>
      )}

      {groupedByType.map(({ type, groupedByCat, uncategorized }) => (
        <div key={type.id} className="border-b border-border last:border-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,13%)]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: type.color || '#888' }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-dim))]">{type.name}</span>
            <span className="text-xs text-[hsl(var(--text-muted))]">· {groupedByCat.reduce((s, g) => s + g.materials.length, 0) + uncategorized.length} позиций</span>
          </div>
          {groupedByCat.map(({ category, materials: catMats }) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 px-6 py-1.5 bg-[hsl(220,12%,15%)] border-b border-[hsl(220,12%,17%)]">
                <span className="text-xs text-gold font-medium">{category.name}</span>
                {category.note && <span className="text-xs text-[hsl(var(--text-muted))]">— {category.note}</span>}
                <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">{catMats.length} поз.</span>
              </div>
              {catMats.map(m => (
                <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                  onEdit={() => onEditMaterial(m)}
                  onDelete={() => deleteMaterial(m.id)}
                />
              ))}
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              {groupedByCat.length > 0 && (
                <div className="flex items-center gap-2 px-6 py-1.5 bg-[hsl(220,12%,15%)] border-b border-[hsl(220,12%,17%)]">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Без категории</span>
                  <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">{uncategorized.length} поз.</span>
                </div>
              )}
              {uncategorized.map(m => (
                <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                  onEdit={() => onEditMaterial(m)}
                  onDelete={() => deleteMaterial(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-[hsl(220,12%,13%)] border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Без типа</span>
          </div>
          <div>
            {ungrouped.map(m => (
              <MaterialRow key={m.id} material={m} currency={store.settings.currency}
                onEdit={() => onEditMaterial(m)}
                onDelete={() => deleteMaterial(m.id)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}