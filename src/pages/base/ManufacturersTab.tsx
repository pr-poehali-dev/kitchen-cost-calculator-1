import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Manufacturer, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { Field, Modal } from './BaseShared';
import VariantsEditor from './VariantsEditor';
import MfrSidebar from './manufacturers/MfrSidebar';
import MfrHeroCard from './manufacturers/MfrHeroCard';
import MfrAssortment from './manufacturers/MfrAssortment';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function ManufacturersTab({ selectedId, onSelect }: Props) {
  const store = useStore();
  const [editingMfr, setEditingMfr] = useState<Partial<Manufacturer> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [sideSearch, setSideSearch] = useState('');
  const [matSearch, setMatSearch] = useState('');

  const manufacturer = store.manufacturers.find(m => m.id === selectedId);
  const allTypes = store.settings.materialTypes;
  const allCategories = store.settings.materialCategories || [];

  // Map: manufacturerId → count (O(1) вместо filter() внутри map сайдбара)
  const mfrMatCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of store.materials) {
      map.set(m.manufacturerId, (map.get(m.manufacturerId) || 0) + 1);
    }
    return map;
  }, [store.materials]);

  const mfrMaterials = useMemo(() =>
    store.materials.filter(m => m.manufacturerId === selectedId),
    [store.materials, selectedId]
  );

  const visibleMfrs = useMemo(() => {
    const sq = sideSearch.trim().toLowerCase();
    return sq ? store.manufacturers.filter(m => m.name.toLowerCase().includes(sq)) : store.manufacturers;
  }, [store.manufacturers, sideSearch]);

  const filteredMfrMaterials = useMemo(() => {
    const catMaterials = catFilter === 'all'
      ? mfrMaterials
      : catFilter === 'none'
        ? mfrMaterials.filter(m => !m.categoryId)
        : mfrMaterials.filter(m => m.categoryId === catFilter);
    const mq = matSearch.trim().toLowerCase();
    if (!mq) return catMaterials;
    return catMaterials.filter(m =>
      m.name.toLowerCase().includes(mq) ||
      (m.article || '').toLowerCase().includes(mq) ||
      (m.color || '').toLowerCase().includes(mq)
    );
  }, [mfrMaterials, catFilter, matSearch]);

  const groupedByType = allTypes
    .filter(t => filteredMfrMaterials.some(m => m.typeId === t.id))
    .map(t => {
      const typeMaterials = filteredMfrMaterials.filter(m => m.typeId === t.id);
      const typeCategories = allCategories.filter(c => c.typeId === t.id || !c.typeId);
      const groupedByCat = typeCategories
        .filter(c => typeMaterials.some(m => m.categoryId === c.id))
        .map(c => ({ category: c, materials: typeMaterials.filter(m => m.categoryId === c.id) }));
      const uncategorized = typeMaterials.filter(m => !m.categoryId);
      return { type: t, groupedByCat, uncategorized };
    });
  const ungrouped = filteredMfrMaterials.filter(m => !allTypes.find(t => t.id === m.typeId));

  return (
    <>
      <div className="flex gap-6 h-full min-h-0">
        {/* Sidebar — скрываем на мобильном когда выбран производитель */}
        <div className={`${manufacturer ? 'hidden md:flex' : 'flex'} w-full md:w-64 md:shrink-0`}>
          <MfrSidebar
            visibleMfrs={visibleMfrs}
            selectedId={selectedId}
            sideSearch={sideSearch}
            mfrMatCount={mfrMatCount}
            onSelect={onSelect}
            onSearchChange={setSideSearch}
            onAddMfr={() => setEditingMfr({ name: '', contact: '', phone: '', materialTypeIds: [] })}
          />
        </div>

        {/* Detail — на мобильном занимает весь экран */}
        {manufacturer ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4 w-full">
            {/* Кнопка назад на мобильном */}
            <button
              onClick={() => onSelect(null)}
              className="md:hidden flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors mb-2"
            >
              <Icon name="ChevronLeft" size={14} /> Производители
            </button>
            <MfrHeroCard
              manufacturer={manufacturer}
              mfrMaterialsCount={mfrMaterials.length}
              onEdit={() => setEditingMfr(manufacturer)}
              onDelete={() => { store.deleteManufacturer(manufacturer.id); onSelect(null); }}
            />
            <MfrAssortment
              manufacturer={manufacturer}
              mfrMaterials={mfrMaterials}
              filteredMfrMaterials={filteredMfrMaterials}
              groupedByType={groupedByType}
              ungrouped={ungrouped}
              matSearch={matSearch}
              catFilter={catFilter}
              allCategories={allCategories}
              allTypesFirstId={allTypes[0]?.id}
              onMatSearchChange={setMatSearch}
              onCatFilterChange={setCatFilter}
              onAddMaterial={() => setEditingMaterial({ manufacturerId: manufacturer.id, unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
              onEditMaterial={m => setEditingMaterial(m)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <Icon name="Factory" size={32} className="text-[hsl(var(--text-muted))] mx-auto mb-3" fallback="Building2" />
              <p className="text-[hsl(var(--text-muted))] text-sm">Выберите производителя</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Manufacturer */}
      {editingMfr !== null && (
        <Modal title={editingMfr.id ? 'Изменить производителя' : 'Новый производитель'} onClose={() => setEditingMfr(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Название бренда" value={editingMfr.name || ''} onChange={v => setEditingMfr(p => ({ ...p!, name: v }))} required />
              <Field label="Контактное лицо" value={editingMfr.contact || ''} onChange={v => setEditingMfr(p => ({ ...p!, contact: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Телефон" value={editingMfr.phone || ''} onChange={v => setEditingMfr(p => ({ ...p!, phone: v }))} />
              <Field label="Email" value={(editingMfr as Manufacturer).email || ''} onChange={v => setEditingMfr(p => ({ ...p!, email: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telegram" value={(editingMfr as Manufacturer).telegram || ''} onChange={v => setEditingMfr(p => ({ ...p!, telegram: v }))} placeholder="@username" />
              <Field label="Сайт" value={(editingMfr as Manufacturer).website || ''} onChange={v => setEditingMfr(p => ({ ...p!, website: v }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Примечание" value={editingMfr.note || ''} onChange={v => setEditingMfr(p => ({ ...p!, note: v }))} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы выпускаемой продукции</div>
              <div className="flex flex-wrap gap-1.5">
                {allTypes.map(t => {
                  const selected = (editingMfr.materialTypeIds || []).includes(t.id);
                  return (
                    <button key={t.id}
                      onClick={() => {
                        const cur = editingMfr.materialTypeIds || [];
                        setEditingMfr(p => ({ ...p!, materialTypeIds: selected ? cur.filter(x => x !== t.id) : [...cur, t.id] }));
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all border ${selected ? 'text-[hsl(220,16%,8%)] border-transparent' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border-transparent hover:border-border'}`}
                      style={selected ? { backgroundColor: t.color || '#c8a96e' } : {}}
                    >{t.name}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!editingMfr.name) return;
                  if (editingMfr.id) store.updateManufacturer(editingMfr.id, editingMfr);
                  else store.addManufacturer({ ...editingMfr, materialTypeIds: editingMfr.materialTypeIds || [] } as Omit<Manufacturer, 'id'>);
                  setEditingMfr(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingMfr(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Material */}
      {editingMaterial !== null && (
        <Modal title={editingMaterial.id ? 'Изменить материал' : 'Новый материал'} onClose={() => setEditingMaterial(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingMaterial.name || ''} onChange={v => setEditingMaterial(p => ({ ...p!, name: v }))} required />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Производитель</label>
                <select value={editingMaterial.manufacturerId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, manufacturerId: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {store.manufacturers.map(m => <option key={m.id} value={m.id} className="bg-[hsl(220,14%,11%)]">{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Поставщик</label>
                <select value={editingMaterial.vendorId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, vendorId: e.target.value || undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— не указан —</option>
                  {store.vendors.map(v => <option key={v.id} value={v.id} className="bg-[hsl(220,14%,11%)]">{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип материала <span className="text-gold">*</span></label>
                <select value={editingMaterial.typeId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, typeId: e.target.value, categoryId: undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {allTypes.map(t => <option key={t.id} value={t.id} className="bg-[hsl(220,14%,11%)]">{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Категория</label>
                <select value={editingMaterial.categoryId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, categoryId: e.target.value || undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— не указана —</option>
                  {store.getCategoriesForType(editingMaterial.typeId).map(c => (
                    <option key={c.id} value={c.id} className="bg-[hsl(220,14%,11%)]">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingMaterial.unit || 'м²'} onChange={e => setEditingMaterial(p => ({ ...p!, unit: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {store.settings.units.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Толщина, мм" value={String(editingMaterial.thickness || '')} onChange={v => setEditingMaterial(p => ({ ...p!, thickness: parseFloat(v) || undefined }))} type="number" />
              <Field label="Цвет" value={editingMaterial.color || ''} onChange={v => setEditingMaterial(p => ({ ...p!, color: v }))} />
              <Field label="Артикул" value={editingMaterial.article || ''} onChange={v => setEditingMaterial(p => ({ ...p!, article: v }))} />
            </div>
            <Field label="Базовая цена (если нет вариантов)" value={String(editingMaterial.basePrice || '')} onChange={v => setEditingMaterial(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            <VariantsEditor
              variants={editingMaterial.variants || []}
              unit={editingMaterial.unit || 'шт'}
              onChange={variants => setEditingMaterial(p => ({ ...p!, variants }))}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!editingMaterial.name || !editingMaterial.typeId) return;
                  if (editingMaterial.id) store.updateMaterial(editingMaterial.id, editingMaterial);
                  else store.addMaterial(editingMaterial as Omit<Material, 'id'>);
                  setEditingMaterial(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingMaterial(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}