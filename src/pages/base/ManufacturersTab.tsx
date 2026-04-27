import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Manufacturer, Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal, MaterialRow } from './BaseShared';
import VariantsEditor from './VariantsEditor';

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
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Производители</div>
            <span className="text-xs text-[hsl(var(--text-muted))]">{store.manufacturers.length}</span>
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
          {visibleMfrs.map(m => {
            const matCount = mfrMatCount.get(m.id) || 0;
            const types = (m.materialTypeIds || []).slice(0, 4).map(tid => store.getTypeById(tid)).filter(Boolean);
            const isActive = selectedId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`w-full text-left rounded-lg border transition-all duration-150 p-3 ${
                  isActive
                    ? 'bg-[hsl(220,12%,17%)] border-gold/50 shadow-sm'
                    : 'bg-[hsl(220,14%,11%)] border-border hover:border-[hsl(220,12%,26%)] hover:bg-[hsl(220,12%,14%)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-gold text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))]'}`}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-sm truncate ${isActive ? 'text-gold' : 'text-foreground'}`}>{m.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[hsl(var(--text-muted))]">{matCount} позиций</span>
                      {types.length > 0 && (
                        <div className="flex gap-0.5">
                          {types.map(t => (
                            <span key={t!.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: t!.color || '#888' }} title={t!.name} />
                          ))}
                          {(m.materialTypeIds || []).length > 4 && (
                            <span className="text-[10px] text-[hsl(var(--text-muted))] ml-0.5">+{(m.materialTypeIds || []).length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && <Icon name="ChevronRight" size={14} className="text-gold shrink-0" />}
                </div>
              </button>
            );
          })}
          {visibleMfrs.length === 0 && (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))] opacity-60">
              {sideSearch ? 'Не найдено' : 'Нет производителей'}
            </div>
          )}
          <button
            onClick={() => setEditingMfr({ name: '', contact: '', phone: '', materialTypeIds: [] })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded-lg hover:border-gold transition-all mt-1"
          >
            <Icon name="Plus" size={12} /> Добавить производителя
          </button>
        </div>

        {/* Detail */}
        {manufacturer ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4">
            {/* Hero card */}
            <div className="bg-[hsl(220,14%,11%)] rounded-lg border border-border overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-gold/60 via-gold/30 to-transparent" />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-gold">{manufacturer.name.charAt(0).toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold leading-tight">{manufacturer.name}</h2>
                        <div className="flex flex-col gap-1 mt-1.5">
                          {manufacturer.contact && (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]">
                              <Icon name="User" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                              {manufacturer.contact}
                            </div>
                          )}
                          {manufacturer.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-dim))]">
                              <Icon name="Phone" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
                              {manufacturer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setEditingMfr(manufacturer)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-gold/50 hover:text-gold text-[hsl(var(--text-dim))] transition-all">
                          <Icon name="Pencil" size={11} /> Изменить
                        </button>
                        <button onClick={() => { store.deleteManufacturer(manufacturer.id); onSelect(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,16%)] border border-border rounded-lg hover:border-destructive/50 hover:text-destructive text-[hsl(var(--text-muted))] transition-all">
                          <Icon name="Trash2" size={11} />
                        </button>
                      </div>
                    </div>
                    {manufacturer.note && (
                      <div className="mt-2 text-xs text-[hsl(var(--text-muted))] italic bg-[hsl(220,12%,14%)] rounded px-3 py-1.5 border-l-2 border-gold/30">
                        {manufacturer.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-gold">{mfrMaterials.length}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">позиций</div>
                  </div>
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-foreground">{(manufacturer.materialTypeIds || []).length}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">типов</div>
                  </div>
                  <div className="bg-[hsl(220,12%,14%)] rounded-lg px-3 py-2.5 text-center">
                    <div className="text-lg font-bold text-foreground">
                      {new Set(mfrMaterials.map(m => m.vendorId).filter(Boolean)).size || '—'}
                    </div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">поставщ.</div>
                  </div>
                </div>

                {/* Types */}
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы выпускаемой продукции</div>
                  <div className="flex flex-wrap gap-1.5">
                    {manufacturer.materialTypeIds?.length > 0
                      ? manufacturer.materialTypeIds.map(tid => {
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

              {/* Search + Category filter */}
              {mfrMaterials.length > 0 && (
                <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
                  <div className="relative flex items-center">
                    <Icon name="Search" size={12} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
                    <input
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                      placeholder="Поиск по материалам..."
                      className="bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors w-52"
                    />
                    {matSearch && (
                      <button onClick={() => setMatSearch('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground">
                        <Icon name="X" size={11} />
                      </button>
                    )}
                  </div>
                  {allCategories.filter(c => mfrMaterials.some(m => m.categoryId === c.id)).length > 0 && (
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
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

// suppress unused import warning
void fmt;