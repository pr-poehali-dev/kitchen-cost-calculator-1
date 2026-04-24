import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Manufacturer, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal, MaterialRow } from './BaseShared';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function ManufacturersTab({ selectedId, onSelect }: Props) {
  const store = useStore();
  const [editingMfr, setEditingMfr] = useState<Partial<Manufacturer> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');

  const manufacturer = store.manufacturers.find(m => m.id === selectedId);
  const mfrMaterials = store.materials.filter(m => m.manufacturerId === selectedId);
  const allTypes = store.settings.materialTypes;
  const allCategories = store.settings.materialCategories || [];

  const filteredMfrMaterials = catFilter === 'all'
    ? mfrMaterials
    : catFilter === 'none'
      ? mfrMaterials.filter(m => !m.categoryId)
      : mfrMaterials.filter(m => m.categoryId === catFilter);

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
        {/* Sidebar */}
        <div className="w-60 shrink-0 space-y-1">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Производители</div>
          {store.manufacturers.map(m => {
            const matCount = store.materials.filter(mat => mat.manufacturerId === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${
                  selectedId === m.id
                    ? 'bg-[hsl(220,12%,18%)] text-foreground border-l-2 border-gold pl-2.5'
                    : 'hover:bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))]'
                }`}
              >
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex gap-2">
                  <span>{matCount} матер.</span>
                  {m.materialTypeIds?.length > 0 && (
                    <span className="text-gold">{m.materialTypeIds.length} тип.</span>
                  )}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => setEditingMfr({ name: '', contact: '', phone: '', materialTypeIds: [] })}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded hover:border-gold transition-all mt-2"
          >
            <Icon name="Plus" size={12} /> Добавить производителя
          </button>
        </div>

        {/* Detail */}
        {manufacturer ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4">
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">{manufacturer.name}</div>
                  {manufacturer.contact && <div className="text-sm text-[hsl(var(--text-dim))] mt-0.5">{manufacturer.contact}</div>}
                  {manufacturer.phone && <div className="text-sm text-[hsl(var(--text-muted))] mt-0.5">{manufacturer.phone}</div>}
                  {manufacturer.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-1.5 italic">{manufacturer.note}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingMfr(manufacturer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-foreground text-[hsl(var(--text-dim))] transition-colors">
                    <Icon name="Pencil" size={11} /> Изменить
                  </button>
                  <button onClick={() => { store.deleteManufacturer(manufacturer.id); onSelect(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-destructive text-[hsl(var(--text-muted))] transition-colors">
                    <Icon name="Trash2" size={11} /> Удалить
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы выпускаемой продукции</div>
                <div className="flex flex-wrap gap-1.5">
                  {manufacturer.materialTypeIds?.length > 0
                    ? manufacturer.materialTypeIds.map(tid => {
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
            </div>

            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Продукция производителя ({mfrMaterials.length})</span>
                <button
                  onClick={() => setEditingMaterial({ manufacturerId: manufacturer.id, unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
                  className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80"
                >
                  <Icon name="Plus" size={12} /> Добавить материал
                </button>
              </div>

              {/* Category filter */}
              {mfrMaterials.length > 0 && (
                <div className="px-4 py-2 border-b border-border flex flex-wrap gap-1.5">
                  <button onClick={() => setCatFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${catFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
                    Все
                  </button>
                  {allCategories.filter(c => mfrMaterials.some(m => m.categoryId === c.id)).map(c => {
                    const ct = c.typeId ? store.getTypeById(c.typeId) : null;
                    return (
                      <button key={c.id} onClick={() => setCatFilter(c.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catFilter === c.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                        style={catFilter === c.id ? { backgroundColor: ct?.color || '#c8a96e' } : {}}>
                        {c.name}
                      </button>
                    );
                  })}
                  {mfrMaterials.some(m => !m.categoryId) && (
                    <button onClick={() => setCatFilter('none')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${catFilter === 'none' ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
                      Без категории
                    </button>
                  )}
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
                          onEdit={() => setEditingMaterial(m)}
                          onDelete={() => store.deleteMaterial(m.id)}
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
                          onEdit={() => setEditingMaterial(m)}
                          onDelete={() => store.deleteMaterial(m.id)}
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
                        onEdit={() => setEditingMaterial(m)}
                        onDelete={() => store.deleteMaterial(m.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
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

// suppress unused import warning
void fmt;