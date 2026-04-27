import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Vendor, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal, MaterialRow } from './BaseShared';
import VariantsEditor from './VariantsEditor';

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

  // Все доступные производители (для добавления связи)
  const availableMfrs = store.manufacturers;

  const toggleMfr = (mfrId: string) =>
    setExpandedMfr(prev => ({ ...prev, [mfrId]: !prev[mfrId] }));

  return (
    <>
      <div className="flex gap-6 h-full min-h-0">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Поставщики</div>
            <span className="text-xs text-[hsl(var(--text-muted))]">{store.vendors.length}</span>
          </div>
          <div className="relative mb-2">
            <Icon name="Search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
            <input
              value={sideSearch}
              onChange={e => setSideSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
            />
            {sideSearch && (
              <button onClick={() => setSideSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={11} />
              </button>
            )}
          </div>
          {visibleVendors.map(v => {
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
          {visibleVendors.length === 0 && (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))] opacity-60">
              {sideSearch ? 'Не найдено' : 'Нет поставщиков'}
            </div>
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
            {/* Hero card */}
            <div className="bg-[hsl(220,14%,11%)] rounded-lg border border-border overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-[hsl(200,60%,40%)]/60 via-[hsl(200,60%,40%)]/20 to-transparent" />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-[hsl(200,30%,15%)] border border-[hsl(200,40%,25%)]/40 flex items-center justify-center shrink-0">
                    <Icon name="Truck" size={24} className="text-[hsl(200,60%,55%)]" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold leading-tight">{vendor.name}</h2>
                        <div className="flex flex-col gap-1 mt-1.5">
                          {vendor.contact && (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]">
                              <Icon name="User" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                              {vendor.contact}
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]">
                              <Icon name="Phone" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                              {vendor.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingVendor(vendor)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-gold/50 hover:text-gold text-[hsl(var(--text-dim))] transition-all">
                          <Icon name="Pencil" size={11} /> Изменить
                        </button>
                        <button onClick={() => { store.deleteVendor(vendor.id); onSelect(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-destructive/50 hover:text-destructive text-[hsl(var(--text-muted))] transition-all">
                          <Icon name="Trash2" size={11} />
                        </button>
                      </div>
                    </div>
                    {vendor.note && (
                      <div className="mt-2 text-xs text-[hsl(var(--text-muted))] italic bg-[hsl(220,12%,14%)] rounded px-3 py-1.5 border-l-2 border-[hsl(200,40%,35%)]/40">
                        {vendor.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-gold">{vendorMaterials.length}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">позиций</div>
                  </div>
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-foreground">{mfrWithMaterials.length}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">брендов</div>
                  </div>
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-foreground">{(vendor.materialTypeIds || []).length}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">типов</div>
                  </div>
                </div>

                {/* Types */}
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы поставляемых материалов</div>
                  <div className="flex flex-wrap gap-1.5">
                    {vendor.materialTypeIds?.length > 0
                      ? vendor.materialTypeIds.map(tid => {
                          const t = store.getTypeById(tid);
                          return t ? (
                            <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[hsl(220,16%,8%)]"
                              style={{ backgroundColor: t.color || '#888' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(220,16%,8%)]/30" />
                              {t.name}
                            </span>
                          ) : null;
                        })
                      : <span className="text-xs text-[hsl(var(--text-muted))] italic">Не указаны</span>
                    }
                  </div>
                </div>

                {/* Manufacturers linked */}
                <div className="mt-4 pt-4 border-t border-border">
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
              </div>{/* /p-5 */}
            </div>{/* /hero card */}

            {/* Ассортимент grouped by manufacturer */}
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <span className="text-sm font-medium shrink-0">Ассортимент ({vendorMaterials.length} позиций)</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex items-center flex-1 min-w-0 max-w-xs">
                    <Icon name="Search" size={12} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
                    <input
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                      placeholder="Поиск по материалам..."
                      className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
                    />
                    {matSearch && (
                      <button onClick={() => setMatSearch('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground">
                        <Icon name="X" size={11} />
                      </button>
                    )}
                  </div>
                  {matSearch && <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">{filteredVendorMaterials.length} найдено</span>}
                </div>
                <button
                  onClick={() => setEditingMaterial({
                    vendorId: vendor.id,
                    unit: 'м²',
                    typeId: allTypes[0]?.id,
                    basePrice: 0,
                  })}
                  className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80 shrink-0"
                >
                  <Icon name="Plus" size={12} /> Добавить
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