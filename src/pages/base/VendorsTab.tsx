import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Vendor, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal, MaterialRow } from './BaseShared';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function VendorsTab({ selectedId, onSelect }: Props) {
  const store = useStore();
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [expandedMfr, setExpandedMfr] = useState<Record<string, boolean>>({});

  const vendor = store.vendors.find(v => v.id === selectedId);
  const allTypes = store.settings.materialTypes;

  const vendorMaterials = store.materials.filter(m => m.vendorId === selectedId);

  // Производители у которых уже есть материалы у этого поставщика
  const mfrWithMaterials = store.manufacturers
    .filter(mfr => vendorMaterials.some(m => m.manufacturerId === mfr.id))
    .map(mfr => ({
      manufacturer: mfr,
      materials: vendorMaterials.filter(m => m.manufacturerId === mfr.id),
    }));

  // Все доступные производители (для добавления связи)
  const availableMfrs = store.manufacturers;

  const toggleMfr = (mfrId: string) =>
    setExpandedMfr(prev => ({ ...prev, [mfrId]: !prev[mfrId] }));

  return (
    <>
      <div className="flex gap-6 h-full min-h-0">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Поставщики</div>
            <span className="text-xs text-[hsl(var(--text-muted))]">{store.vendors.length}</span>
          </div>
          {store.vendors.map(v => {
            const matCount = store.materials.filter(m => m.vendorId === v.id).length;
            const mfrCount = store.manufacturers.filter(mfr =>
              store.materials.some(m => m.vendorId === v.id && m.manufacturerId === mfr.id)
            ).length;
            const types = (v.materialTypeIds || []).slice(0, 4).map(tid => store.getTypeById(tid)).filter(Boolean);
            const isActive = selectedId === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`w-full text-left rounded-lg border transition-all duration-150 p-3 ${
                  isActive
                    ? 'bg-[hsl(220,12%,17%)] border-gold/50 shadow-sm'
                    : 'bg-[hsl(220,14%,11%)] border-border hover:border-[hsl(220,12%,26%)] hover:bg-[hsl(220,12%,14%)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-gold text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))]'}`}>
                    <Icon name="Truck" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-sm truncate ${isActive ? 'text-gold' : 'text-foreground'}`}>{v.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[hsl(var(--text-muted))]">{matCount} позиций</span>
                      {mfrCount > 0 && <span className="text-xs text-[hsl(var(--text-muted))]">· {mfrCount} бренд.</span>}
                      {types.length > 0 && (
                        <div className="flex gap-0.5">
                          {types.map(t => (
                            <span key={t!.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: t!.color || '#888' }} title={t!.name} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && <Icon name="ChevronRight" size={14} className="text-gold shrink-0" />}
                </div>
              </button>
            );
          })}
          {store.vendors.length === 0 && (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))] opacity-60">Нет поставщиков</div>
          )}
          <button
            onClick={() => setEditingVendor({ name: '', contact: '', phone: '', materialTypeIds: [] })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded-lg hover:border-gold transition-all mt-1"
          >
            <Icon name="Plus" size={12} /> Добавить поставщика
          </button>
        </div>

        {/* Detail */}
        {vendor ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4">
            {/* Info card */}
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold">{vendor.name}</div>
                  {vendor.contact && <div className="text-sm text-[hsl(var(--text-dim))] mt-0.5">{vendor.contact}</div>}
                  {vendor.phone && <div className="text-sm text-[hsl(var(--text-muted))] mt-0.5">{vendor.phone}</div>}
                  {vendor.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-1.5 italic">{vendor.note}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingVendor(vendor)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-foreground text-[hsl(var(--text-dim))] transition-colors">
                    <Icon name="Pencil" size={11} /> Изменить
                  </button>
                  <button onClick={() => { store.deleteVendor(vendor.id); onSelect(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-destructive text-[hsl(var(--text-muted))] transition-colors">
                    <Icon name="Trash2" size={11} /> Удалить
                  </button>
                </div>
              </div>

              {/* Types */}
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы поставляемых материалов</div>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.materialTypeIds?.length > 0
                    ? vendor.materialTypeIds.map(tid => {
                        const t = store.getTypeById(tid);
                        return t ? (
                          <span key={tid} className="px-2.5 py-1 rounded text-xs font-medium text-[hsl(220,16%,8%)]"
                            style={{ backgroundColor: t.color || '#888' }}>{t.name}</span>
                        ) : null;
                      })
                    : <span className="text-xs text-[hsl(var(--text-muted))]">Не указаны</span>
                  }
                </div>
              </div>

              {/* Manufacturers linked */}
              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Производители в ассортименте</div>
                {mfrWithMaterials.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-muted))]">Пока нет — добавьте материал ниже</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mfrWithMaterials.map(({ manufacturer, materials: mats }) => (
                      <div key={manufacturer.id} className="flex items-center gap-1.5 bg-[hsl(220,12%,16%)] rounded px-2.5 py-1.5">
                        <Icon name="Building2" size={11} className="text-[hsl(var(--text-dim))]" />
                        <span className="text-xs font-medium text-foreground">{manufacturer.name}</span>
                        <span className="text-xs text-[hsl(var(--text-muted))]">{mats.length} поз.</span>
                        <button
                          onClick={() => setEditingMaterial({
                            manufacturerId: manufacturer.id,
                            vendorId: vendor.id,
                            unit: 'м²',
                            typeId: allTypes[0]?.id,
                            basePrice: 0,
                          })}
                          className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors ml-1"
                          title={`Добавить материал от ${manufacturer.name}`}
                        >
                          <Icon name="Plus" size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add manufacturer button */}
                <div className="mt-2">
                  <div className="text-xs text-[hsl(var(--text-muted))] mb-1.5">Добавить материал от производителя:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableMfrs
                      .filter(mfr => !mfrWithMaterials.some(g => g.manufacturer.id === mfr.id))
                      .map(mfr => (
                        <button
                          key={mfr.id}
                          onClick={() => setEditingMaterial({
                            manufacturerId: mfr.id,
                            vendorId: vendor.id,
                            unit: 'м²',
                            typeId: allTypes[0]?.id,
                            basePrice: 0,
                          })}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all"
                        >
                          <Icon name="Plus" size={11} />
                          {mfr.name}
                        </button>
                      ))
                    }
                    {availableMfrs.length === 0 && (
                      <span className="text-xs text-[hsl(var(--text-muted))]">Нет производителей — добавьте в разделе «Производители»</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ассортимент grouped by manufacturer */}
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Ассортимент поставщика ({vendorMaterials.length} позиций)</span>
                <button
                  onClick={() => setEditingMaterial({
                    vendorId: vendor.id,
                    unit: 'м²',
                    typeId: allTypes[0]?.id,
                    basePrice: 0,
                  })}
                  className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80"
                >
                  <Icon name="Plus" size={12} /> Добавить позицию
                </button>
              </div>

              {vendorMaterials.length === 0 && (
                <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">
                  Нет материалов. Нажмите «Добавить позицию» или кнопку «+» у производителя выше.
                </div>
              )}

              {mfrWithMaterials.map(({ manufacturer, materials: mats }) => {
                const isExpanded = expandedMfr[manufacturer.id] !== false; // по умолчанию раскрыто
                return (
                  <div key={manufacturer.id} className="border-b border-border last:border-0">
                    {/* Manufacturer header */}
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(220,12%,13%)] cursor-pointer hover:bg-[hsl(220,12%,15%)] transition-colors"
                      onClick={() => toggleMfr(manufacturer.id)}
                    >
                      <Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={12} className="text-[hsl(var(--text-muted))]" />
                      <Icon name="Building2" size={13} className="text-[hsl(var(--text-dim))]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-dim))] flex-1">{manufacturer.name}</span>
                      <span className="text-xs text-[hsl(var(--text-muted))]">{mats.length} позиций</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingMaterial({
                            manufacturerId: manufacturer.id,
                            vendorId: vendor.id,
                            unit: 'м²',
                            typeId: allTypes[0]?.id,
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
                                onEdit={() => setEditingMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
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
                                        onEdit={() => setEditingMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
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
                                      onEdit={() => setEditingMaterial(m)} onDelete={() => store.deleteMaterial(m.id)} />
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
            <Field label="Цена (без наценки)" value={String(editingMaterial.basePrice || '')} onChange={v => setEditingMaterial(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
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