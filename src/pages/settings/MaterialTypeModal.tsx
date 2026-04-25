import { useStore } from '@/store/useStore';
import type { MaterialType } from '@/store/types';
import Icon from '@/components/ui/icon';

const COLOR_PRESETS = [
  '#c8a96e', '#a0c878', '#78b4c8', '#c8a050', '#b4b4b4',
  '#a0d4e8', '#d0d8e8', '#c8785a', '#b478c8', '#c8c850',
  '#909090', '#e8b478', '#787878', '#e87878', '#78e8a0',
];

interface Props {
  editingType: Partial<MaterialType>;
  onChange: (t: Partial<MaterialType>) => void;
  onClose: () => void;
}

export default function MaterialTypeModal({ editingType, onChange, onClose }: Props) {
  const store = useStore();

  const handleSave = () => {
    if (!editingType.name) return;
    if (editingType.id) store.updateMaterialType(editingType.id, editingType);
    else store.addMaterialType({ name: editingType.name, color: editingType.color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">{editingType.id ? 'Изменить тип' : 'Новый тип материала'}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
            <input value={editingType.name || ''} onChange={e => onChange({ ...editingType, name: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Например: Стекло" />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Цвет метки</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => onChange({ ...editingType, color: c })}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${editingType.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[hsl(220,14%,11%)] scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={editingType.color || '#888888'} onChange={e => onChange({ ...editingType, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
              <input value={editingType.color || ''} onChange={e => onChange({ ...editingType, color: e.target.value })}
                className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground outline-none focus:border-gold" placeholder="#c8a96e" />
              <div className="w-8 h-8 rounded" style={{ backgroundColor: editingType.color || '#888' }} />
            </div>
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
