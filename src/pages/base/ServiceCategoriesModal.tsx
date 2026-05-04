import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ServiceCategory } from '@/store/types';
import Icon from '@/components/ui/icon';
import { Modal } from './BaseShared';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

const PRESET_COLORS = [
  '#c8a96e', '#78b4c8', '#a0c878', '#b478c8',
  '#c8785a', '#c8c850', '#e8b478', '#909090',
  '#78c8a0', '#c85a78',
];

interface CatFormState {
  id?: string;
  name: string;
  color: string;
  description: string;
}

const emptyForm = (): CatFormState => ({ name: '', color: '#c8a96e', description: '' });

export default function ServiceCategoriesModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [editing, setEditing] = useState<CatFormState | null>(null);

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      store.updateServiceCategory(editing.id, {
        name: editing.name.trim(),
        color: editing.color,
        description: editing.description.trim() || undefined,
      });
    } else {
      store.addServiceCategory({
        name: editing.name.trim(),
        color: editing.color,
        description: editing.description.trim() || undefined,
      });
    }
    setEditing(null);
  };

  const handleDelete = async (cat: ServiceCategory) => {
    const usedCount = store.services.filter(s => s.categoryId === cat.id).length;
    const msg = usedCount > 0
      ? `Удалить категорию «${cat.name}»? ${usedCount} услуг потеряют категорию.`
      : `Удалить категорию «${cat.name}»?`;
    if (await confirmDialog({ message: msg })) {
      store.deleteServiceCategory(cat.id);
    }
  };

  return (
    <Modal title="Категории услуг" onClose={onClose} width="max-w-lg">
      <div className="space-y-4">
        {/* Список категорий */}
        <div className="space-y-1">
          {store.serviceCategories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded bg-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,16%)] group transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">{cat.name}</div>
                {cat.description && (
                  <div className="text-xs text-[hsl(var(--text-muted))] truncate">{cat.description}</div>
                )}
              </div>
              <span className="text-xs text-[hsl(var(--text-muted))]">
                {store.services.filter(s => s.categoryId === cat.id).length} усл.
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing({ id: cat.id, name: cat.name, color: cat.color, description: cat.description || '' })}
                  className="text-[hsl(var(--text-muted))] hover:text-foreground"
                >
                  <Icon name="Pencil" size={13} />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-[hsl(var(--text-muted))] hover:text-destructive"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            </div>
          ))}
          {store.serviceCategories.length === 0 && (
            <div className="text-center py-6 text-sm text-[hsl(var(--text-muted))]">Нет категорий</div>
          )}
        </div>

        {/* Форма редактирования/добавления */}
        {editing !== null ? (
          <div className="border border-border rounded p-3 space-y-3 bg-[hsl(220,12%,12%)]">
            <div className="text-xs font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">
              {editing.id ? 'Редактировать категорию' : 'Новая категория'}
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Название</label>
              <input
                autoFocus
                value={editing.name}
                onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Например: Монтаж"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Описание</label>
              <input
                value={editing.description}
                onChange={e => setEditing(p => p && ({ ...p, description: e.target.value }))}
                placeholder="Краткое описание (необязательно)"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] mb-2 block">Цвет</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditing(p => p && ({ ...p, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: editing.color === c ? 'white' : 'transparent',
                    }}
                  />
                ))}
                <label className="w-6 h-6 rounded-full border border-border cursor-pointer overflow-hidden" title="Свой цвет">
                  <input
                    type="color"
                    value={editing.color}
                    onChange={e => setEditing(p => p && ({ ...p, color: e.target.value }))}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!editing.name.trim()}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(emptyForm())}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded text-sm text-[hsl(var(--text-muted))] hover:text-foreground hover:border-[hsl(var(--text-dim))] transition-colors"
          >
            <Icon name="Plus" size={14} /> Добавить категорию
          </button>
        )}
      </div>
    </Modal>
  );
}
