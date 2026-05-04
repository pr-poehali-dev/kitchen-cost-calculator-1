import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCatalog, updateVendor, deleteVendor } from '@/hooks/useCatalog';
import type { Vendor } from '@/store/types';
import Icon from '@/components/ui/icon';

interface Props {
  vendorId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function VendorEditSidebar({ vendorId, onClose, onDeleted }: Props) {
  const store = useStore();
  const catalog = useCatalog();
  const vendor = vendorId ? catalog.vendors.find(v => v.id === vendorId) : null;

  const [form, setForm] = useState<Partial<Vendor>>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (vendor) {
      setForm({ ...vendor });
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [vendorId]);

  if (!vendor) return null;

  const set = (patch: Partial<Vendor>) => {
    setForm(f => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    await updateVendor(vendor.id, form);
    setDirty(false);
  };

  const handleDelete = async () => {
    await deleteVendor(vendor.id);
    onDeleted?.();
    onClose();
  };

  const allTypes = store.settings.materialTypes;
  const matCount = catalog.materials.filter(m => m.vendorId === vendor.id).length;

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,10%)] border-l border-border w-80 shrink-0 overflow-hidden">
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="Truck" size={14} className="text-[hsl(var(--text-muted))] shrink-0" />
          <span className="font-semibold text-sm truncate">{vendor.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {dirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90"
            >
              <Icon name="Check" size={12} /> Сохранить
            </button>
          )}
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1">
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5">

        {/* Основное */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Основное</div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Название</label>
            <input
              value={form.name || ''}
              onChange={e => set({ name: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Контактное лицо</label>
              <input
                value={form.contact || ''}
                onChange={e => set({ contact: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Телефон</label>
              <input
                value={form.phone || ''}
                onChange={e => set({ phone: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Email</label>
              <input
                value={form.email || ''}
                onChange={e => set({ email: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Telegram</label>
              <input
                value={form.telegram || ''}
                onChange={e => set({ telegram: e.target.value })}
                placeholder="@username или +7..."
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Сайт</label>
            <input
              value={form.website || ''}
              onChange={e => set({ website: e.target.value })}
              placeholder="https://..."
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
        </section>

        {/* Логистика */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Логистика</div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Срок доставки (дни)</label>
              <input
                type="number"
                value={form.deliveryDays ?? ''}
                onChange={e => set({ deliveryDays: parseInt(e.target.value) || undefined })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Мин. заказ (руб.)</label>
              <input
                type="number"
                value={form.minOrderAmount ?? ''}
                onChange={e => set({ minOrderAmount: parseFloat(e.target.value) || undefined })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Дни поставок</label>
            <input
              value={form.deliverySchedule || ''}
              onChange={e => set({ deliverySchedule: e.target.value })}
              placeholder="Пн, Ср, Пт"
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
        </section>

        {/* Материалы */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Типы материалов</div>
          <div className="flex flex-wrap gap-1.5">
            {allTypes.map(t => {
              const selected = (form.materialTypeIds || []).includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    const cur = form.materialTypeIds || [];
                    set({ materialTypeIds: selected ? cur.filter(x => x !== t.id) : [...cur, t.id] });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all border ${selected ? 'text-[hsl(220,16%,8%)] border-transparent' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border-transparent hover:border-border'}`}
                  style={selected ? { backgroundColor: t.color || '#c8a96e' } : {}}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Примечание */}
        <section className="space-y-2">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Примечание</div>
          <textarea
            value={form.note || ''}
            onChange={e => set({ note: e.target.value })}
            placeholder="Внутренняя заметка..."
            rows={2}
            className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold resize-none scrollbar-thin"
          />
        </section>

        {/* Статистика */}
        <section className="space-y-2">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Статистика</div>
          <div className="text-xs text-[hsl(var(--text-muted))] px-3 py-2 rounded bg-[hsl(220,12%,14%)]">
            Материалов в базе: {matCount}
          </div>
        </section>

        {/* Действия */}
        <section className="space-y-2 pt-1">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Действия</div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-destructive hover:bg-[hsl(220,12%,16%)] transition-colors"
            >
              <Icon name="Trash2" size={13} />
              Удалить поставщика
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 px-3 py-2 bg-destructive text-white rounded text-xs font-medium hover:opacity-90"
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-3 py-2 bg-[hsl(220,12%,16%)] text-[hsl(var(--text-muted))] rounded text-xs hover:text-foreground"
              >
                Отмена
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
