import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Vendor } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal } from './BaseShared';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function VendorsTab({ selectedId, onSelect }: Props) {
  const store = useStore();
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null);

  const vendor = store.vendors.find(v => v.id === selectedId);
  const allTypes = store.settings.materialTypes;

  // Материалы, доступные у этого поставщика — те что он поставляет
  const vendorMaterials = store.materials.filter(m => m.vendorId === selectedId);

  const groupedByMfr = store.manufacturers
    .filter(mfr => vendorMaterials.some(m => m.manufacturerId === mfr.id))
    .map(mfr => ({
      manufacturer: mfr,
      materials: vendorMaterials.filter(m => m.manufacturerId === mfr.id),
    }));

  return (
    <>
      <div className="flex gap-6 h-full min-h-0">
        {/* Sidebar */}
        <div className="w-60 shrink-0 space-y-1">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Поставщики</div>
          {store.vendors.map(v => {
            const matCount = store.materials.filter(m => m.vendorId === v.id).length;
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`w-full text-left px-3 py-2.5 rounded text-sm transition-colors ${
                  selectedId === v.id
                    ? 'bg-[hsl(220,12%,18%)] text-foreground border-l-2 border-gold pl-2.5'
                    : 'hover:bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))]'
                }`}
              >
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 flex gap-2">
                  <span>{matCount} позиций</span>
                  {v.materialTypeIds?.length > 0 && (
                    <span className="text-gold">{v.materialTypeIds.length} тип.</span>
                  )}
                </div>
              </button>
            );
          })}
          <button
            onClick={() => setEditingVendor({ name: '', contact: '', phone: '', materialTypeIds: [] })}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded hover:border-gold transition-all mt-2"
          >
            <Icon name="Plus" size={12} /> Добавить поставщика
          </button>
        </div>

        {/* Detail */}
        {vendor ? (
          <div className="flex-1 min-w-0 animate-fade-in space-y-4">
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
              <div className="flex items-start justify-between mb-3">
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
              <div>
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
            </div>

            {/* Materials grouped by manufacturer */}
            <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">Ассортимент поставщика ({vendorMaterials.length} позиций)</span>
              </div>
              {vendorMaterials.length === 0 && (
                <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">
                  Нет материалов. Назначьте поставщика в разделе «Производители → материал»
                </div>
              )}
              {groupedByMfr.map(({ manufacturer, materials: mats }) => (
                <div key={manufacturer.id} className="border-b border-border last:border-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,13%)]">
                    <Icon name="Building2" size={12} className="text-[hsl(var(--text-dim))]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-dim))]">{manufacturer.name}</span>
                    <span className="text-xs text-[hsl(var(--text-muted))]">· {mats.length} позиций</span>
                  </div>
                  <div>
                    {mats.map(m => {
                      const t = store.getTypeById(m.typeId);
                      return (
                        <div key={m.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] text-sm"
                          style={{ gridTemplateColumns: '2fr 1fr 0.7fr 1fr 1fr' }}>
                          <div className="flex items-center gap-2 truncate">
                            {t && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />}
                            <span className="truncate text-foreground">{m.name}</span>
                          </div>
                          <span className="text-xs text-[hsl(var(--text-dim))]">{t?.name || '—'}</span>
                          <span className="text-xs text-[hsl(var(--text-dim))]">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                          <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.color || '—'}</span>
                          <span className="text-right font-mono text-sm">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
    </>
  );
}
