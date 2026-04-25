import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import { Field, Modal } from '../BaseShared';
import VariantsEditor from '../VariantsEditor';

interface Props {
  editingMaterial: Partial<Material>;
  onChange: (m: Partial<Material>) => void;
  onClose: () => void;
}

export default function MaterialEditModal({ editingMaterial, onChange, onClose }: Props) {
  const store = useStore();
  const allTypes = store.settings.materialTypes;

  const handleSave = () => {
    if (!editingMaterial.name || !editingMaterial.typeId) return;
    if (editingMaterial.id) store.updateMaterial(editingMaterial.id, editingMaterial);
    else store.addMaterial(editingMaterial as Omit<Material, 'id'>);
    onClose();
  };

  return (
    <Modal title={editingMaterial.id ? 'Изменить материал' : 'Новый материал'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Наименование" value={editingMaterial.name || ''} onChange={v => onChange({ ...editingMaterial, name: v })} required />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Производитель</label>
            <select value={editingMaterial.manufacturerId || ''} onChange={e => onChange({ ...editingMaterial, manufacturerId: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              <option value="">— выбрать —</option>
              {store.manufacturers.map(m => <option key={m.id} value={m.id} className="bg-[hsl(220,14%,11%)]">{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Поставщик</label>
            <select value={editingMaterial.vendorId || ''} onChange={e => onChange({ ...editingMaterial, vendorId: e.target.value || undefined })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              <option value="">— не указан —</option>
              {store.vendors.map(v => <option key={v.id} value={v.id} className="bg-[hsl(220,14%,11%)]">{v.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип материала <span className="text-gold">*</span></label>
            <select value={editingMaterial.typeId || ''} onChange={e => onChange({ ...editingMaterial, typeId: e.target.value, categoryId: undefined })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              <option value="">— выбрать —</option>
              {allTypes.map(t => <option key={t.id} value={t.id} className="bg-[hsl(220,14%,11%)]">{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Категория</label>
            <select value={editingMaterial.categoryId || ''} onChange={e => onChange({ ...editingMaterial, categoryId: e.target.value || undefined })}
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
            <select value={editingMaterial.unit || 'м²'} onChange={e => onChange({ ...editingMaterial, unit: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              {store.settings.units.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Толщина, мм" value={String(editingMaterial.thickness || '')} onChange={v => onChange({ ...editingMaterial, thickness: parseFloat(v) || undefined })} type="number" />
          <Field label="Цвет" value={editingMaterial.color || ''} onChange={v => onChange({ ...editingMaterial, color: v })} />
          <Field label="Артикул" value={editingMaterial.article || ''} onChange={v => onChange({ ...editingMaterial, article: v })} />
        </div>
        <Field label="Базовая цена (если нет вариантов)" value={String(editingMaterial.basePrice || '')} onChange={v => onChange({ ...editingMaterial, basePrice: parseFloat(v) || 0 })} type="number" required />
        <VariantsEditor
          variants={editingMaterial.variants || []}
          unit={editingMaterial.unit || 'шт'}
          onChange={variants => onChange({ ...editingMaterial, variants })}
        />
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
            Сохранить
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}
