import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Service } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal } from './BaseShared';

export default function ServicesTab() {
  const store = useStore();
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filteredServices = q
    ? store.services.filter(sv =>
        sv.name.toLowerCase().includes(q) ||
        (sv.category || '').toLowerCase().includes(q)
      )
    : store.services;

  return (
    <>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex items-center flex-1 max-w-sm">
            <Icon name="Search" size={13} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию или категории..."
              className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-8 pr-7 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={12} />
              </button>
            )}
          </div>
          <span className="text-xs text-[hsl(var(--text-muted))]">{filteredServices.length} из {store.services.length}</span>
          <button
            onClick={() => setEditingService({ category: '', unit: 'шт', basePrice: 0 })}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 ml-auto"
          >
            <Icon name="Plus" size={14} /> Добавить услугу
          </button>
        </div>
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 28px' }}>
            <span>Наименование</span><span>Категория</span><span>Ед. изм.</span><span className="text-right">Цена</span><span></span>
          </div>
          {filteredServices.length === 0 && (
            <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">
              {search ? 'Ничего не найдено' : 'Нет услуг'}
            </div>
          )}
          {filteredServices.map(sv => (
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

      {/* Modal: Service */}
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
    </>
  );
}