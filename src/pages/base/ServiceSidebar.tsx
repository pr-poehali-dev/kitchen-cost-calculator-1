import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Service } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Props {
  serviceId: string | null;
  onClose: () => void;
}

export default function ServiceSidebar({ serviceId, onClose }: Props) {
  const store = useStore();
  const service = serviceId ? store.services.find(s => s.id === serviceId) : null;

  const [form, setForm] = useState<Partial<Service>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (service) {
      setForm({ ...service });
      setDirty(false);
    }
  }, [serviceId]);

  if (!service) return null;

  const set = (patch: Partial<Service>) => {
    setForm(f => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    store.updateService(service.id, form);
    setDirty(false);
  };

  const category = store.getServiceCategoryById(form.categoryId);
  const margin = form.clientPrice && form.basePrice
    ? Math.round(((form.clientPrice - form.basePrice) / form.clientPrice) * 100)
    : null;

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,10%)] border-l border-border w-80 shrink-0 overflow-hidden">
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {category && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          )}
          <span className="font-semibold text-sm truncate">{service.name}</span>
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

      {/* Архив-баннер */}
      {service.archived && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(25,60%,20%)] border-b border-[hsl(25,40%,30%)]">
          <Icon name="Archive" size={13} className="text-[hsl(25,80%,60%)]" />
          <span className="text-xs text-[hsl(25,80%,70%)]">Услуга в архиве — не отображается при подборе</span>
        </div>
      )}

      {/* Тело */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5">

        {/* Основное */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Основное</div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Наименование</label>
            <input
              value={form.name || ''}
              onChange={e => set({ name: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Категория</label>
            <select
              value={form.categoryId || ''}
              onChange={e => {
                const cat = store.serviceCategories.find(c => c.id === e.target.value);
                set({ categoryId: e.target.value || undefined, category: cat?.name || '' });
              }}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="" className="bg-[hsl(220,14%,11%)]">— Без категории —</option>
              {store.serviceCategories.map(c => (
                <option key={c.id} value={c.id} className="bg-[hsl(220,14%,11%)]">{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Единица измерения</label>
            <select
              value={form.unit || 'шт'}
              onChange={e => set({ unit: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              {store.settings.units.map(u => (
                <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Описание для клиента</label>
            <textarea
              value={form.description || ''}
              onChange={e => set({ description: e.target.value })}
              placeholder="Что входит в услугу, особые условия..."
              rows={3}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold resize-none transition-colors scrollbar-thin"
            />
          </div>
        </section>

        {/* Цены */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Цены</div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Себестоимость</label>
            <div className="relative">
              <input
                type="number"
                value={form.basePrice ?? ''}
                onChange={e => set({ basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--text-muted))]">
                /{form.unit || 'шт'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Цена для клиента</label>
            <div className="relative">
              <input
                type="number"
                value={form.clientPrice ?? ''}
                onChange={e => set({ clientPrice: parseFloat(e.target.value) || undefined })}
                placeholder="Не задана"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--text-muted))]">
                /{form.unit || 'шт'}
              </span>
            </div>
          </div>

          {/* Маржа */}
          {margin !== null && (
            <div className="flex items-center justify-between px-3 py-2 rounded bg-[hsl(220,12%,14%)]">
              <span className="text-xs text-[hsl(var(--text-muted))]">Маржа</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono font-medium ${margin >= 20 ? 'text-[hsl(140,60%,50%)]' : margin >= 10 ? 'text-[hsl(var(--gold))]' : 'text-destructive'}`}>
                  {margin}%
                </span>
                <span className="text-xs text-[hsl(var(--text-muted))]">
                  +{fmt((form.clientPrice ?? 0) - (form.basePrice ?? 0))} ₽
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Примечание */}
        <section className="space-y-2">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Примечание</div>
          <textarea
            value={form.note || ''}
            onChange={e => set({ note: e.target.value })}
            placeholder="Внутренняя заметка (не видна клиенту)"
            rows={2}
            className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold resize-none transition-colors scrollbar-thin"
          />
        </section>

        {/* Использование */}
        <section className="space-y-2">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Статистика</div>
          <div className="px-3 py-2 rounded bg-[hsl(220,12%,14%)] text-xs text-[hsl(var(--text-muted))]">
            Используется в{' '}
            <span className="text-foreground font-medium">
              {store.projects.reduce((cnt, p) =>
                cnt + p.serviceBlocks.reduce((c2, b) =>
                  c2 + b.rows.filter(r => r.serviceId === service.id).length, 0), 0)
              }
            </span>{' '}
            строках проектов
          </div>
        </section>
      </div>

      {/* Футер */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            store.archiveService(service.id, !service.archived);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-foreground transition-colors"
        >
          <Icon name={service.archived ? 'ArchiveRestore' : 'Archive'} size={12} />
          {service.archived ? 'Разархивировать' : 'В архив'}
        </button>
        {dirty && (
          <button
            onClick={handleSave}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90"
          >
            <Icon name="Check" size={12} /> Сохранить
          </button>
        )}
      </div>
    </div>
  );
}
