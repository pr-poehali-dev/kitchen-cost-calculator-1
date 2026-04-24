import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Supplier, Material, Service, MaterialType, Unit } from '@/store/types';
import Icon from '@/components/ui/icon';

type Tab = 'suppliers' | 'materials' | 'services';

const MATERIAL_TYPES: MaterialType[] = ['ЛДСП', 'МДФ', 'ХДФ', 'Фанера', 'ДСП', 'Стекло', 'Зеркало', 'Столешница', 'Фасад', 'Фурнитура', 'Профиль', 'Кромка', 'Другое'];
const UNITS: Unit[] = ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'];

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function BasePage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  const supplier = store.suppliers.find(s => s.id === selectedSupplier);
  const supplierMaterials = store.materials.filter(m => m.supplierId === selectedSupplier);

  const TABS = [
    { id: 'suppliers' as Tab, label: 'Поставщики', count: store.suppliers.length },
    { id: 'materials' as Tab, label: 'Материалы', count: store.materials.length },
    { id: 'services' as Tab, label: 'Услуги', count: store.services.length },
  ];

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

        {/* === SUPPLIERS === */}
        {tab === 'suppliers' && (
          <div className="flex gap-6 h-full">
            <div className="w-64 space-y-1">
              <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Поставщики</div>
              {store.suppliers.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSupplier(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${
                    selectedSupplier === s.id
                      ? 'bg-[hsl(220,12%,18%)] text-foreground border border-[hsl(var(--gold))] border-opacity-40'
                      : 'hover:bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))]'
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                    {store.materials.filter(m => m.supplierId === s.id).length} материалов
                  </div>
                </button>
              ))}
              <button
                onClick={() => setEditingSupplier({ name: '', contact: '', phone: '' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded hover:border-gold transition-all mt-2"
              >
                <Icon name="Plus" size={12} /> Добавить поставщика
              </button>
            </div>

            {supplier && (
              <div className="flex-1 animate-fade-in">
                <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{supplier.name}</div>
                      {supplier.contact && <div className="text-sm text-[hsl(var(--text-dim))] mt-0.5">{supplier.contact}</div>}
                      {supplier.phone && <div className="text-sm text-[hsl(var(--text-muted))] mt-0.5">{supplier.phone}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSupplier(supplier)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-dim))] hover:text-foreground border border-border rounded transition-colors"
                      >
                        <Icon name="Pencil" size={11} /> Изменить
                      </button>
                      <button
                        onClick={() => { store.deleteSupplier(supplier.id); setSelectedSupplier(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-destructive border border-border rounded transition-colors"
                      >
                        <Icon name="Trash2" size={11} /> Удалить
                      </button>
                    </div>
                  </div>
                  {supplier.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-2">{supplier.note}</div>}
                </div>

                <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">Материалы поставщика</span>
                    <button
                      onClick={() => setEditingMaterial({ supplierId: supplier.id, unit: 'м²', type: 'ЛДСП', basePrice: 0 })}
                      className="flex items-center gap-1.5 text-xs text-gold hover:opacity-80"
                    >
                      <Icon name="Plus" size={12} /> Добавить материал
                    </button>
                  </div>
                  <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
                    style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}>
                    <span>Наименование</span><span>Тип</span><span>Толщ.</span><span>Цвет</span><span className="text-right">Цена</span><span></span>
                  </div>
                  {supplierMaterials.length === 0 && (
                    <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Материалы не добавлены</div>
                  )}
                  {supplierMaterials.map(m => (
                    <div key={m.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
                      style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}>
                      <span className="truncate text-foreground">{m.name}</span>
                      <span className="text-[hsl(var(--text-dim))] text-xs">{m.type}</span>
                      <span className="text-[hsl(var(--text-dim))] text-xs">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                      <span className="text-[hsl(var(--text-dim))] text-xs truncate">{m.color || '—'}</span>
                      <span className="text-right font-mono text-sm">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingMaterial(m)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
                        <button onClick={() => store.deleteMaterial(m.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!supplier && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[hsl(var(--text-muted))] text-sm">Выберите поставщика</p>
              </div>
            )}
          </div>
        )}

        {/* === ALL MATERIALS === */}
        {tab === 'materials' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[hsl(var(--text-muted))]">Все материалы в базе: {store.materials.length}</div>
              <button
                onClick={() => setEditingMaterial({ unit: 'м²', type: 'ЛДСП', basePrice: 0 })}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Icon name="Plus" size={14} /> Добавить материал
              </button>
            </div>
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr 28px' }}>
                <span>Наименование</span><span>Поставщик</span><span>Тип</span><span>Толщ.</span><span>Цвет</span><span className="text-right">Цена</span><span></span>
              </div>
              {store.materials.map(m => {
                const sup = store.suppliers.find(s => s.id === m.supplierId);
                return (
                  <div key={m.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr 28px' }}>
                    <span className="truncate text-foreground">{m.name}</span>
                    <span className="text-[hsl(var(--text-dim))] text-xs">{sup?.name || '—'}</span>
                    <span className="text-[hsl(var(--text-dim))] text-xs">{m.type}</span>
                    <span className="text-[hsl(var(--text-dim))] text-xs">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                    <span className="text-[hsl(var(--text-dim))] text-xs truncate">{m.color || '—'}</span>
                    <span className="text-right font-mono">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
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

        {/* === SERVICES === */}
        {tab === 'services' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[hsl(var(--text-muted))]">Услуги в базе: {store.services.length}</div>
              <button
                onClick={() => setEditingService({ category: '', unit: 'шт', basePrice: 0 })}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
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
                  <span className="text-foreground">{sv.name}</span>
                  <span className="text-[hsl(var(--text-dim))] text-xs">{sv.category}</span>
                  <span className="text-[hsl(var(--text-dim))] text-xs">{sv.unit}</span>
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

      {/* === MODALS === */}
      {editingSupplier !== null && (
        <Modal title={editingSupplier.id ? 'Изменить поставщика' : 'Новый поставщик'} onClose={() => setEditingSupplier(null)}>
          <div className="space-y-3">
            <Field label="Название" value={editingSupplier.name || ''} onChange={v => setEditingSupplier(p => ({ ...p!, name: v }))} required />
            <Field label="Контактное лицо" value={editingSupplier.contact || ''} onChange={v => setEditingSupplier(p => ({ ...p!, contact: v }))} />
            <Field label="Телефон" value={editingSupplier.phone || ''} onChange={v => setEditingSupplier(p => ({ ...p!, phone: v }))} />
            <Field label="Примечание" value={editingSupplier.note || ''} onChange={v => setEditingSupplier(p => ({ ...p!, note: v }))} />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!editingSupplier.name) return;
                  if (editingSupplier.id) store.updateSupplier(editingSupplier.id, editingSupplier);
                  else store.addSupplier(editingSupplier as Omit<Supplier, 'id'>);
                  setEditingSupplier(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >Сохранить</button>
              <button onClick={() => setEditingSupplier(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {editingMaterial !== null && (
        <Modal title={editingMaterial.id ? 'Изменить материал' : 'Новый материал'} onClose={() => setEditingMaterial(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingMaterial.name || ''} onChange={v => setEditingMaterial(p => ({ ...p!, name: v }))} required />
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Поставщик</label>
              <select value={editingMaterial.supplierId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, supplierId: e.target.value }))}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                <option value="">— выбрать —</option>
                {store.suppliers.map(s => <option key={s.id} value={s.id} className="bg-[hsl(220,14%,11%)]">{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип</label>
              <select value={editingMaterial.type || 'ЛДСП'} onChange={e => setEditingMaterial(p => ({ ...p!, type: e.target.value as MaterialType }))}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                {MATERIAL_TYPES.map(t => <option key={t} value={t} className="bg-[hsl(220,14%,11%)]">{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Толщина, мм" value={String(editingMaterial.thickness || '')} onChange={v => setEditingMaterial(p => ({ ...p!, thickness: parseFloat(v) || undefined }))} type="number" />
              <Field label="Цвет" value={editingMaterial.color || ''} onChange={v => setEditingMaterial(p => ({ ...p!, color: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingMaterial.unit || 'м²'} onChange={e => setEditingMaterial(p => ({ ...p!, unit: e.target.value as Unit }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {UNITS.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
              <Field label="Цена (без наценки)" value={String(editingMaterial.basePrice || '')} onChange={v => setEditingMaterial(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!editingMaterial.name) return;
                  if (editingMaterial.id) store.updateMaterial(editingMaterial.id, editingMaterial);
                  else store.addMaterial(editingMaterial as Omit<Material, 'id'>);
                  setEditingMaterial(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >Сохранить</button>
              <button onClick={() => setEditingMaterial(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {editingService !== null && (
        <Modal title={editingService.id ? 'Изменить услугу' : 'Новая услуга'} onClose={() => setEditingService(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingService.name || ''} onChange={v => setEditingService(p => ({ ...p!, name: v }))} required />
            <Field label="Категория" value={editingService.category || ''} onChange={v => setEditingService(p => ({ ...p!, category: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingService.unit || 'шт'} onChange={e => setEditingService(p => ({ ...p!, unit: e.target.value as Unit }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {UNITS.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
              <Field label="Цена (без наценки)" value={String(editingService.basePrice || '')} onChange={v => setEditingService(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            </div>
            <Field label="Примечание" value={editingService.note || ''} onChange={v => setEditingService(p => ({ ...p!, note: v }))} />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!editingService.name) return;
                  if (editingService.id) store.updateService(editingService.id, editingService);
                  else store.addService(editingService as Omit<Service, 'id'>);
                  setEditingService(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >Сохранить</button>
              <button onClick={() => setEditingService(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
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
        className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
