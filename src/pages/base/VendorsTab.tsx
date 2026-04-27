import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Vendor, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { Field, Modal } from './BaseShared';
import VariantsEditor from './VariantsEditor';
import VendorSidebar from './vendors/VendorSidebar';
import VendorHeroCard from './vendors/VendorHeroCard';
import VendorAssortment from './vendors/VendorAssortment';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function VendorsTab({ selectedId, onSelect }: Props) {
  const store = useStore();
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [expandedMfr, setExpandedMfr] = useState<Record<string, boolean>>({});
  const [sideSearch, setSideSearch] = useState('');
  const [matSearch, setMatSearch] = useState('');

  const vendor = store.vendors.find(v => v.id === selectedId);
  const allTypes = store.settings.materialTypes;

  // Map: vendorId → {count, mfrIds} — O(1) для сайдбара
  const vendorStats = useMemo(() => {
    const countMap = new Map<string, number>();
    const mfrMap = new Map<string, Set<string>>();
    for (const m of store.materials) {
      if (!m.vendorId) continue;
      countMap.set(m.vendorId, (countMap.get(m.vendorId) || 0) + 1);
      if (!mfrMap.has(m.vendorId)) mfrMap.set(m.vendorId, new Set());
      if (m.manufacturerId) mfrMap.get(m.vendorId)!.add(m.manufacturerId);
    }
    return { countMap, mfrMap };
  }, [store.materials]);

  const vendorMaterials = useMemo(() =>
    store.materials.filter(m => m.vendorId === selectedId),
    [store.materials, selectedId]
  );

  const visibleVendors = useMemo(() => {
    const sq = sideSearch.trim().toLowerCase();
    return sq ? store.vendors.filter(v => v.name.toLowerCase().includes(sq)) : store.vendors;
  }, [store.vendors, sideSearch]);

  const filteredVendorMaterials = useMemo(() => {
    const mq = matSearch.trim().toLowerCase();
    if (!mq) return vendorMaterials;
    return vendorMaterials.filter(m =>
      m.name.toLowerCase().includes(mq) ||
      (m.article || '').toLowerCase().includes(mq) ||
      (m.color || '').toLowerCase().includes(mq)
    );
  }, [vendorMaterials, matSearch]);

  // Производители у которых уже есть материалы у этого поставщика
  const mfrWithMaterials = useMemo(() =>
    store.manufacturers
      .filter(mfr => filteredVendorMaterials.some(m => m.manufacturerId === mfr.id))
      .map(mfr => ({
        manufacturer: mfr,
        materials: filteredVendorMaterials.filter(m => m.manufacturerId === mfr.id),
      })),
    [store.manufacturers, filteredVendorMaterials]
  );

  const toggleMfr = (mfrId: string) =>
    setExpandedMfr(prev => ({ ...prev, [mfrId]: !prev[mfrId] }));

  const handleAddMaterial = (patch: Partial<Material>) =>
    setEditingMaterial(patch);

  return (
    <>
      <div className="flex gap-6 h-full min-h-0">
        {/* Sidebar */}
        <VendorSidebar
          visibleVendors={visibleVendors}
          selectedId={selectedId}
          sideSearch={sideSearch}
          vendorStats={vendorStats}
          onSelect={onSelect}
          onSearchChange={setSideSearch}
          onAddVendor={() => setEditingVendor({ name: '', contact: '', phone: '', materialTypeIds: [] })}
        />

        {/* Detail */}
        {vendor ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4">
            <VendorHeroCard
              vendor={vendor}
              vendorMaterialsCount={vendorMaterials.length}
              mfrWithMaterials={mfrWithMaterials}
              allTypes={allTypes}
              onEditVendor={() => setEditingVendor(vendor)}
              onDeleteVendor={() => { store.deleteVendor(vendor.id); onSelect(null); }}
              onAddMaterial={handleAddMaterial}
            />
            <VendorAssortment
              vendor={vendor}
              vendorMaterialsCount={vendorMaterials.length}
              mfrWithMaterials={mfrWithMaterials}
              filteredCount={filteredVendorMaterials.length}
              matSearch={matSearch}
              expandedMfr={expandedMfr}
              allTypesFirstId={allTypes[0]?.id}
              onSearchChange={setMatSearch}
              onToggleMfr={toggleMfr}
              onAddMaterial={handleAddMaterial}
              onEditMaterial={m => setEditingMaterial(m)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon name="Truck" size={32} className="text-[hsl(var(--text-muted))] mx-auto mb-3" />
              <p className="text-[hsl(var(--text-muted))] text-sm">Выберите поставщика</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Vendor */}
      {editingVendor !== null && (
        <Modal title={editingVendor.id ? 'Изменить поставщика' : 'Новый поставщик'} onClose={() => setEditingVendor(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Название" value={editingVendor.name || ''} onChange={v => setEditingVendor(p => ({ ...p!, name: v }))} required />
              <Field label="Контактное лицо" value={editingVendor.contact || ''} onChange={v => setEditingVendor(p => ({ ...p!, contact: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Телефон" value={editingVendor.phone || ''} onChange={v => setEditingVendor(p => ({ ...p!, phone: v }))} />
              <Field label="Email" value={(editingVendor as Vendor).email || ''} onChange={v => setEditingVendor(p => ({ ...p!, email: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telegram" value={(editingVendor as Vendor).telegram || ''} onChange={v => setEditingVendor(p => ({ ...p!, telegram: v }))} placeholder="@username или +7..." />
              <Field label="Сайт" value={(editingVendor as Vendor).website || ''} onChange={v => setEditingVendor(p => ({ ...p!, website: v }))} placeholder="https://..." />
            </div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] pt-1 pb-0.5">Логистика</div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Срок доставки (дни)" value={String((editingVendor as Vendor).deliveryDays || '')} onChange={v => setEditingVendor(p => ({ ...p!, deliveryDays: parseInt(v) || undefined }))} type="number" />
              <Field label="Мин. заказ (руб.)" value={String((editingVendor as Vendor).minOrderAmount || '')} onChange={v => setEditingVendor(p => ({ ...p!, minOrderAmount: parseFloat(v) || undefined }))} type="number" />
              <Field label="Дни поставок" value={(editingVendor as Vendor).deliverySchedule || ''} onChange={v => setEditingVendor(p => ({ ...p!, deliverySchedule: v }))} placeholder="Пн, Ср, Пт" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Примечание" value={editingVendor.note || ''} onChange={v => setEditingVendor(p => ({ ...p!, note: v }))} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы поставляемых материалов</div>
              <div className="flex flex-wrap gap-1.5">
                {allTypes.map(t => {
                  const selected = (editingVendor.materialTypeIds || []).includes(t.id);
                  return (
                    <button key={t.id}
                      onClick={() => {
                        const cur = editingVendor.materialTypeIds || [];
                        setEditingVendor(p => ({ ...p!, materialTypeIds: selected ? cur.filter(x => x !== t.id) : [...cur, t.id] }));
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
                  if (!editingVendor.name) return;
                  if (editingVendor.id) store.updateVendor(editingVendor.id, editingVendor);
                  else store.addVendor({ ...editingVendor, materialTypeIds: editingVendor.materialTypeIds || [] } as Omit<Vendor, 'id'>);
                  setEditingVendor(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingVendor(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
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