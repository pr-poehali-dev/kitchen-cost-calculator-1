import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { MaterialType, MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';
import MaterialTypeModal from './MaterialTypeModal';
import MaterialCategoryModal from './MaterialCategoryModal';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
      <div className="text-xs uppercase tracking-wider mb-4 font-medium text-[hsl(var(--text-muted))]">{title}</div>
      {children}
    </div>
  );
}

function getCatTypeIds(cat: MaterialCategory): string[] {
  if (cat.typeIds?.length) return cat.typeIds;
  if (cat.typeId) return [cat.typeId];
  return [];
}

export default function SettingsCatalogSection() {
  const store = useStore();
  const [editingType, setEditingType] = useState<Partial<MaterialType> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<MaterialCategory & { typeIds: string[] }> | null>(null);
  const [catTypeFilter, setCatTypeFilter] = useState<string>('all');

  const categories = store.settings.materialCategories || [];
  const filteredCategories = catTypeFilter === 'all'
    ? categories
    : categories.filter(c => {
        const ids = getCatTypeIds(c);
        return ids.length === 0 || ids.includes(catTypeFilter);
      });

  return (
    <>
      <Section title="Типы материалов">
        <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">Используются для группировки материалов в Базе и фильтрации в блоках Расчёта</div>
        <div className="space-y-1.5 mb-4">
          {store.settings.materialTypes.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />
              <span className="flex-1 text-sm text-foreground">{t.name}</span>
              <span className="text-xs text-[hsl(var(--text-muted))] font-mono">{store.materials.filter(m => m.typeId === t.id).length} матер.</span>
              <span className="text-xs text-[hsl(var(--text-muted))]">
                {categories.filter(c => getCatTypeIds(c).includes(t.id)).length > 0 && `${categories.filter(c => getCatTypeIds(c).includes(t.id)).length} катег.`}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingType(t)} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors"><Icon name="Pencil" size={12} /></button>
                <button onClick={() => store.deleteMaterialType(t.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors"><Icon name="Trash2" size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setEditingType({ name: '', color: '#c8a96e' })}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all">
          <Icon name="Plus" size={14} /> Добавить тип
        </button>
      </Section>

      <Section title="Категории материалов">
        <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">Подкатегории внутри типов — например Е1, Е2, Kapso у Столешниц или Стандарт/Премиум</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setCatTypeFilter('all')}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
            Все ({categories.length})
          </button>
          {store.settings.materialTypes.filter(t => categories.some(c => getCatTypeIds(c).includes(t.id))).map(t => (
            <button key={t.id} onClick={() => setCatTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${catTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
              style={catTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}>
              {t.name} ({categories.filter(c => getCatTypeIds(c).includes(t.id)).length})
            </button>
          ))}
          {categories.some(c => getCatTypeIds(c).length === 0) && (
            <button onClick={() => setCatTypeFilter('general')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'general' ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
              Общие ({categories.filter(c => getCatTypeIds(c).length === 0).length})
            </button>
          )}
        </div>
        <div className="space-y-1.5 mb-4">
          {(catTypeFilter === 'general' ? categories.filter(c => getCatTypeIds(c).length === 0) : filteredCategories).map(cat => {
            const typeIds = getCatTypeIds(cat);
            const types = store.settings.materialTypes.filter(t => typeIds.includes(t.id));
            return (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
                {types.length > 0
                  ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: types[0].color || '#888' }} />
                  : <span className="w-3 h-3 rounded-full shrink-0 bg-[hsl(220,12%,30%)]" />}
                <span className="flex-1 text-sm text-foreground font-medium">{cat.name}</span>
                <div className="flex gap-1 flex-wrap">
                  {types.length > 0
                    ? types.map(t => <span key={t.id} className="text-xs px-2 py-0.5 rounded-full text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>{t.name}</span>)
                    : <span className="text-xs text-[hsl(var(--text-muted))]">Общая</span>}
                </div>
                {cat.note && <span className="text-xs text-[hsl(var(--text-muted))] truncate max-w-32">{cat.note}</span>}
                <span className="text-xs text-[hsl(var(--text-muted))] font-mono">{store.materials.filter(m => m.categoryId === cat.id).length} матер.</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingCategory({ ...cat, typeIds: getCatTypeIds(cat) })} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors"><Icon name="Pencil" size={12} /></button>
                  <button onClick={() => store.deleteMaterialCategory(cat.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors"><Icon name="Trash2" size={12} /></button>
                </div>
              </div>
            );
          })}
          {filteredCategories.length === 0 && <div className="text-xs text-[hsl(var(--text-muted))] py-2">Нет категорий</div>}
        </div>
        <button onClick={() => setEditingCategory({ name: '', typeIds: catTypeFilter !== 'all' && catTypeFilter !== 'general' ? [catTypeFilter] : [] })}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all">
          <Icon name="Plus" size={14} /> Добавить категорию
        </button>
      </Section>

      {editingType !== null && (
        <MaterialTypeModal
          editingType={editingType}
          onChange={setEditingType}
          onClose={() => setEditingType(null)}
        />
      )}

      {editingCategory !== null && (
        <MaterialCategoryModal
          editingCategory={editingCategory}
          onChange={setEditingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </>
  );
}
