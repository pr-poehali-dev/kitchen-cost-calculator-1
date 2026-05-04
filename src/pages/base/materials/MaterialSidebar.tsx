import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCatalog, updateMaterial, deleteMaterial } from '@/hooks/useCatalog';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import VariantsEditor from '../VariantsEditor';

interface Props {
  materialId: string | null;
  onClose: () => void;
}

export default function MaterialSidebar({ materialId, onClose }: Props) {
  const store = useStore();
  const catalog = useCatalog();
  const material = materialId ? catalog.materials.find(m => m.id === materialId) : null;

  const [form, setForm] = useState<Partial<Material>>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (material) {
      setForm({ ...material });
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [materialId]);

  if (!material) return null;

  const set = (patch: Partial<Material>) => {
    setForm(f => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.typeId) return;
    await updateMaterial(material.id, form);
    setDirty(false);
  };

  const handleArchive = async () => {
    await updateMaterial(material.id, { archived: !material.archived });
    onClose();
  };

  const handleDelete = async () => {
    await deleteMaterial(material.id);
    onClose();
  };

  const allTypes = store.settings.materialTypes;
  const allCategories = store.settings.materialCategories || [];
  const type = allTypes.find(t => t.id === form.typeId);
  const categoriesForType = allCategories.filter(c => !c.typeId || c.typeId === form.typeId);
  const manufacturer = catalog.manufacturers.find(m => m.id === form.manufacturerId);
  const vendor = catalog.vendors.find(v => v.id === form.vendorId);

  const hasVariants = (form.variants || []).length > 0;

  return (
    <div className="flex flex-col h-full bg-[hsl(220,14%,10%)] border-l border-border w-80 shrink-0 overflow-hidden">
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {type && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: type.color || '#888' }} />
          )}
          <span className="font-semibold text-sm truncate">{material.name}</span>
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
      {material.archived && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(25,60%,20%)] border-b border-[hsl(25,40%,30%)]">
          <Icon name="Archive" size={13} className="text-[hsl(25,80%,60%)]" />
          <span className="text-xs text-[hsl(25,80%,70%)]">Материал в архиве</span>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Тип материала</label>
              <select
                value={form.typeId || ''}
                onChange={e => set({ typeId: e.target.value, categoryId: undefined })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              >
                {allTypes.map(t => (
                  <option key={t.id} value={t.id} className="bg-[hsl(220,14%,11%)]">{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Категория</label>
              <select
                value={form.categoryId || ''}
                onChange={e => set({ categoryId: e.target.value || undefined })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              >
                <option value="" className="bg-[hsl(220,14%,11%)]">— Нет —</option>
                {categoriesForType.map(c => (
                  <option key={c.id} value={c.id} className="bg-[hsl(220,14%,11%)]">{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Производитель</label>
            <select
              value={form.manufacturerId || ''}
              onChange={e => set({ manufacturerId: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="" className="bg-[hsl(220,14%,11%)]">— Не выбран —</option>
              {catalog.manufacturers.map(m => (
                <option key={m.id} value={m.id} className="bg-[hsl(220,14%,11%)]">{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Поставщик</label>
            <select
              value={form.vendorId || ''}
              onChange={e => set({ vendorId: e.target.value || undefined })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="" className="bg-[hsl(220,14%,11%)]">— Не выбран —</option>
              {catalog.vendors.map(v => (
                <option key={v.id} value={v.id} className="bg-[hsl(220,14%,11%)]">{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Ед. изм.</label>
              <select
                value={form.unit || 'м²'}
                onChange={e => set({ unit: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              >
                {store.settings.units.map(u => (
                  <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Толщина, мм</label>
              <input
                type="number"
                value={form.thickness ?? ''}
                onChange={e => set({ thickness: parseFloat(e.target.value) || undefined })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Артикул</label>
              <input
                value={form.article || ''}
                onChange={e => set({ article: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Цвет / декор</label>
            <input
              value={form.color || ''}
              onChange={e => set({ color: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
        </section>

        {/* Цена */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Цена</div>

          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">
              Базовая цена {hasVariants && <span className="text-[hsl(var(--text-dim))]">(перекрыта вариантами)</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.basePrice ?? ''}
                onChange={e => set({ basePrice: parseFloat(e.target.value) || 0 })}
                disabled={hasVariants}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--text-muted))]">
                /{form.unit || 'м²'}
              </span>
            </div>
          </div>
        </section>

        {/* Варианты */}
        <section className="space-y-3">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Варианты</div>
          <VariantsEditor
            variants={form.variants || []}
            unit={form.unit || 'м²'}
            onChange={variants => set({ variants })}
          />
        </section>

        {/* История цены */}
        {material.priceHistory && material.priceHistory.length > 0 && (
          <section className="space-y-2">
            <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">История цены</div>
            <div className="space-y-1">
              {material.priceHistory.slice(-5).reverse().map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 rounded bg-[hsl(220,12%,14%)]">
                  <span className="text-[hsl(var(--text-muted))]">{new Date(h.date).toLocaleDateString('ru-RU')}</span>
                  <span className="font-mono text-foreground">{h.price.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Действия */}
        <section className="space-y-2 pt-1">
          <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">Действия</div>
          <button
            onClick={handleArchive}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,16%)] transition-colors"
          >
            <Icon name="Archive" size={13} />
            {material.archived ? 'Восстановить из архива' : 'В архив'}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-destructive hover:bg-[hsl(220,12%,16%)] transition-colors"
            >
              <Icon name="Trash2" size={13} />
              Удалить материал
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