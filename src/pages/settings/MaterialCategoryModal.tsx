import { useStore } from '@/store/useStore';
import type { MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';

interface Props {
  editingCategory: Partial<MaterialCategory & { typeIds: string[] }>;
  onChange: (c: Partial<MaterialCategory & { typeIds: string[] }>) => void;
  onClose: () => void;
}

export default function MaterialCategoryModal({ editingCategory, onChange, onClose }: Props) {
  const store = useStore();

  const handleSave = () => {
    if (!editingCategory.name) return;
    const typeIds = editingCategory.typeIds || [];
    const data = { name: editingCategory.name, typeIds, typeId: typeIds[0], note: editingCategory.note };
    if (editingCategory.id) store.updateMaterialCategory(editingCategory.id, data);
    else store.addMaterialCategory(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">{editingCategory.id ? 'Изменить категорию' : 'Новая категория'}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
            <input value={editingCategory.name || ''} onChange={e => onChange({ ...editingCategory, name: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Например: Е1, Kapso, Стандарт" />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Типы материалов</label>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Можно выбрать несколько. Если не выбрать — категория будет общей</div>
            <div className="flex flex-wrap gap-1.5">
              {store.settings.materialTypes.map(t => {
                const selected = (editingCategory.typeIds || []).includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      const ids = editingCategory.typeIds || [];
                      onChange({ ...editingCategory, typeIds: selected ? ids.filter(id => id !== t.id) : [...ids, t.id] });
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all border ${
                      selected ? 'text-[hsl(220,16%,8%)] border-transparent' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border-border hover:text-foreground'
                    }`}
                    style={selected ? { backgroundColor: t.color || '#c8a96e', borderColor: t.color || '#c8a96e' } : {}}
                  >
                    {selected && <Icon name="Check" size={10} />}
                    {t.name}
                  </button>
                );
              })}
            </div>
            {(editingCategory.typeIds?.length ?? 0) === 0 && (
              <div className="mt-2 text-xs text-[hsl(var(--text-muted))] italic">Нет выбранных типов — категория общая</div>
            )}
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
            <input value={editingCategory.note || ''} onChange={e => onChange({ ...editingCategory, note: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Краткое описание" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">Сохранить</button>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}
