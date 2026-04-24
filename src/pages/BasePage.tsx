import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Supplier, Material, Service } from '@/store/types';
import Icon from '@/components/ui/icon';

type Tab = 'suppliers' | 'materials' | 'services';

const fmt = (n: number) => n.toLocaleString('ru-RU');

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
        {label}{required && <span className="text-gold ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)] z-10">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function BasePage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  const supplier = store.suppliers.find(s => s.id === selectedSupplier);
  const supplierMaterials = store.materials.filter(m => m.supplierId === selectedSupplier);

  const TABS = [
    { id: 'suppliers' as Tab, label: 'Поставщики', count: store.suppliers.length },
    { id: 'materials' as Tab, label: 'Материалы', count: store.materials.length },
    { id: 'services' as Tab, label: 'Услуги', count: store.services.length },
  ];

  const allTypes = store.settings.materialTypes;

  // group supplier materials by type
  const groupedByType = allTypes
    .filter(t => supplierMaterials.some(m => m.typeId === t.id))
    .map(t => ({
      type: t,
      materials: supplierMaterials.filter(m => m.typeId === t.id),
    }));
  const ungrouped = supplierMaterials.filter(m => !allTypes.find(t => t.id === m.typeId));

  // all materials filtered
  const filteredMaterials = matTypeFilter === 'all'
    ? store.materials
    : store.materials.filter(m => m.typeId === matTypeFilter);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <h1 className="text-base font-semibold text-foreground mb-3">База данных</h1>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedSupplier(null); }}
              className={`px-4 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                tab === t.id
                  ? 'bg-gold text-[hsl(220,16%,8%)] font-medium'
                  : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,16%)]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-[hsl(220,16%,8%)] text-gold' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-muted))]'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6">

        {/* ========== SUPPLIERS ========== */}
        {tab === 'suppliers' && (
          <div className="flex gap-6 h-full min-h-0">
            {/* Sidebar list */}
            <div className="w-60 shrink-0 space-y-1">
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Список поставщиков</div>
              {store.suppliers.map(s => {
                const matCount = store.materials.filter(m => m.supplierId === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSupplier(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${
                      selectedSupplier === s.id
                        ? 'bg-[hsl(220,12%,18%)] text-foreground border-l-2 border-gold pl-2.5'
                        : 'hover:bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))]'
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex gap-2">
                      <span>{matCount} матер.</span>
                      {s.materialTypeIds?.length > 0 && (
                        <span className="text-gold">{s.materialTypeIds.length} тип.</span>
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setEditingSupplier({ name: '', contact: '', phone: '', materialTypeIds: [] })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded hover:border-gold transition-all mt-2"
              >
                <Icon name="Plus" size={12} /> Добавить поставщика
              </button>
            </div>

            {/* Supplier detail */}
            {supplier ? (
              <div className="flex-1 min-w-0 animate-fade-in space-y-4">
                {/* Info card */}
                <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-lg font-semibold">{supplier.name}</div>
                      {supplier.contact && <div className="text-sm text-[hsl(var(--text-dim))] mt-0.5">{supplier.contact}</div>}
                      {supplier.phone && <div className="text-sm text-[hsl(var(--text-muted))] mt-0.5">{supplier.phone}</div>}
                      {supplier.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-1.5 italic">{supplier.note}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingSupplier(supplier)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-foreground text-[hsl(var(--text-dim))] transition-colors">
                        <Icon name="Pencil" size={11} /> Изменить
                      </button>
                      <button onClick={() => { store.deleteSupplier(supplier.id); setSelectedSupplier(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded hover:text-destructive text-[hsl(var(--text-muted))] transition-colors">
                        <Icon name="Trash2" size={11} /> Удалить
                      </button>
                    </div>
                  </div>

                  {/* Types worked with */}
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы материалов поставщика</div>
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.materialTypeIds?.length > 0
                        ? supplier.materialTypeIds.map(tid => {
                            const t = store.getTypeById(tid);
                            return t ? (
                              <span key={tid} className="px-2.5 py-1 rounded text-xs font-medium text-[hsl(220,16%,8%)]"
                                style={{ backgroundColor: t.color || '#888' }}>
                                {t.name}
                              </span>
                            ) : null;
                          })
                        : <span className="text-xs text-[hsl(var(--text-muted))]">Не указаны — работает со всеми типами</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Materials grouped by type */}
                <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">Материалы поставщика ({supplierMaterials.length})</span>
                    <button
                      onClick={() => setEditingMaterial({ supplierId: supplier.id, unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
                      className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80"
                    >
                      <Icon name="Plus" size={12} /> Добавить материал
                    </button>
                  </div>

                  {supplierMaterials.length === 0 && (
                    <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Материалы не добавлены</div>
                  )}

                  {groupedByType.map(({ type, materials: mats }) => (
                    <div key={type.id}>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,13%)] border-b border-border">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: type.color || '#888' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-dim))]">{type.name}</span>
                        <span className="text-xs text-[hsl(var(--text-muted))]">· {mats.length} позиций</span>
                      </div>
                      {mats.map(m => (
                        <MaterialRow key={m.id} material={m}
                          onEdit={() => setEditingMaterial(m)}
                          onDelete={() => store.deleteMaterial(m.id)}
                          currency={store.settings.currency}
                        />
                      ))}
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-[hsl(220,12%,13%)] border-b border-border">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Без типа</span>
                      </div>
                      {ungrouped.map(m => (
                        <MaterialRow key={m.id} material={m}
                          onEdit={() => setEditingMaterial(m)}
                          onDelete={() => store.deleteMaterial(m.id)}
                          currency={store.settings.currency}
                        />
                      ))}
                    </div>
                  )}
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
        )}

        {/* ========== ALL MATERIALS ========== */}
        {tab === 'materials' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              {/* Type filter tabs */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setMatTypeFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${matTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                >
                  Все ({store.materials.length})
                </button>
                {allTypes.filter(t => store.materials.some(m => m.typeId === t.id)).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setMatTypeFilter(t.id)}
                    className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${matTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                    style={matTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
                  >
                    {t.name} ({store.materials.filter(m => m.typeId === t.id).length})
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEditingMaterial({ unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0"
              >
                <Icon name="Plus" size={14} /> Добавить материал
              </button>
            </div>
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
                <span>Наименование</span><span>Поставщик</span><span>Тип</span><span>Толщ.</span>
                <span>Цвет</span><span>Артикул</span><span className="text-right">Цена</span><span></span>
              </div>
              {filteredMaterials.length === 0 && (
                <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов</div>
              )}
              {filteredMaterials.map(m => {
                const sup = store.suppliers.find(s => s.id === m.supplierId);
                const t = store.getTypeById(m.typeId);
                return (
                  <div key={m.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
                    <div className="flex items-center gap-2 truncate">
                      {t && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />}
                      <span className="truncate text-foreground">{m.name}</span>
                    </div>
                    <span className="text-xs text-[hsl(var(--text-dim))]">{sup?.name || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))]">{t?.name || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))]">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.color || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))]">{m.article || '—'}</span>
                    <span className="text-right font-mono text-sm">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingMaterial(m)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
                      <button onClick={() => store.deleteMaterial(m.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========== SERVICES ========== */}
        {tab === 'services' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[hsl(var(--text-muted))]">Услуги в базе: {store.services.length}</div>
              <button
                onClick={() => setEditingService({ category: '', unit: 'шт', basePrice: 0 })}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >
                <Icon name="Plus" size={14} /> Добавить услугу
              </button>
            </div>
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 28px' }}>
                <span>Наименование</span><span>Категория</span><span>Ед. изм.</span><span className="text-right">Цена</span><span></span>
              </div>
              {store.services.map(sv => (
                <div key={sv.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 28px' }}>
                  <div>
                    <span className="text-foreground">{sv.name}</span>
                    {sv.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{sv.note}</div>}
                  </div>
                  <span className="text-xs text-[hsl(var(--text-dim))]">{sv.category}</span>
                  <span className="text-xs text-[hsl(var(--text-dim))]">{sv.unit}</span>
                  <span className="text-right font-mono">{fmt(sv.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{sv.unit}</span></span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingService(sv)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
                    <button onClick={() => store.deleteService(sv.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== MODAL: SUPPLIER ========== */}
      {editingSupplier !== null && (
        <Modal title={editingSupplier.id ? 'Изменить поставщика' : 'Новый поставщик'} onClose={() => setEditingSupplier(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Название" value={editingSupplier.name || ''} onChange={v => setEditingSupplier(p => ({ ...p!, name: v }))} required />
              <Field label="Контактное лицо" value={editingSupplier.contact || ''} onChange={v => setEditingSupplier(p => ({ ...p!, contact: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Телефон" value={editingSupplier.phone || ''} onChange={v => setEditingSupplier(p => ({ ...p!, phone: v }))} />
              <Field label="Примечание" value={editingSupplier.note || ''} onChange={v => setEditingSupplier(p => ({ ...p!, note: v }))} />
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы материалов поставщика</div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5">Укажите с какими типами работает поставщик. Если не выбрано — работает со всеми.</div>
              <div className="flex flex-wrap gap-1.5">
                {allTypes.map(t => {
                  const selected = (editingSupplier.materialTypeIds || []).includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const cur = editingSupplier.materialTypeIds || [];
                        const next = selected ? cur.filter(x => x !== t.id) : [...cur, t.id];
                        setEditingSupplier(p => ({ ...p!, materialTypeIds: next }));
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all border ${
                        selected
                          ? 'text-[hsl(220,16%,8%)] border-transparent'
                          : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border-transparent hover:border-border'
                      }`}
                      style={selected ? { backgroundColor: t.color || '#c8a96e' } : {}}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!editingSupplier.name) return;
                  const data = { ...editingSupplier, materialTypeIds: editingSupplier.materialTypeIds || [] } as Omit<Supplier, 'id'>;
                  if (editingSupplier.id) store.updateSupplier(editingSupplier.id, editingSupplier);
                  else store.addSupplier(data);
                  setEditingSupplier(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingSupplier(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========== MODAL: MATERIAL ========== */}
      {editingMaterial !== null && (
        <Modal title={editingMaterial.id ? 'Изменить материал' : 'Новый материал'} onClose={() => setEditingMaterial(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingMaterial.name || ''} onChange={v => setEditingMaterial(p => ({ ...p!, name: v }))} required />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Поставщик</label>
                <select value={editingMaterial.supplierId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, supplierId: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {store.suppliers.map(s => <option key={s.id} value={s.id} className="bg-[hsl(220,14%,11%)]">{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип материала <span className="text-gold">*</span></label>
                <select value={editingMaterial.typeId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, typeId: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {allTypes.map(t => <option key={t.id} value={t.id} className="bg-[hsl(220,14%,11%)]">{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Толщина, мм" value={String(editingMaterial.thickness || '')} onChange={v => setEditingMaterial(p => ({ ...p!, thickness: parseFloat(v) || undefined }))} type="number" />
              <Field label="Цвет" value={editingMaterial.color || ''} onChange={v => setEditingMaterial(p => ({ ...p!, color: v }))} />
              <Field label="Артикул" value={editingMaterial.article || ''} onChange={v => setEditingMaterial(p => ({ ...p!, article: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingMaterial.unit || 'м²'} onChange={e => setEditingMaterial(p => ({ ...p!, unit: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {store.settings.units.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
              <Field label="Цена (без наценки)" value={String(editingMaterial.basePrice || '')} onChange={v => setEditingMaterial(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            </div>
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

      {/* ========== MODAL: SERVICE ========== */}
      {editingService !== null && (
        <Modal title={editingService.id ? 'Изменить услугу' : 'Новая услуга'} onClose={() => setEditingService(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingService.name || ''} onChange={v => setEditingService(p => ({ ...p!, name: v }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Категория" value={editingService.category || ''} onChange={v => setEditingService(p => ({ ...p!, category: v }))} />
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingService.unit || 'шт'} onChange={e => setEditingService(p => ({ ...p!, unit: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {store.settings.units.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
            </div>
            <Field label="Цена (без наценки)" value={String(editingService.basePrice || '')} onChange={v => setEditingService(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            <Field label="Примечание" value={editingService.note || ''} onChange={v => setEditingService(p => ({ ...p!, note: v }))} />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!editingService.name) return;
                  if (editingService.id) store.updateService(editingService.id, editingService);
                  else store.addService(editingService as Omit<Service, 'id'>);
                  setEditingService(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingService(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MaterialRow({ material, onEdit, onDelete, currency }: {
  material: Material; onEdit: () => void; onDelete: () => void; currency: string;
}) {
  return (
    <div className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
      style={{ gridTemplateColumns: '2fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
      <span className="truncate text-foreground">{material.name}</span>
      <span className="text-xs text-[hsl(var(--text-dim))]">{material.thickness ? `${material.thickness}мм` : '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{material.color || '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))]">{material.article || '—'}</span>
      <span className="text-right font-mono">{fmt(material.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{material.unit}</span></span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}
