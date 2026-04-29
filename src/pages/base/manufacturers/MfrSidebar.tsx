import { useStore } from '@/store/useStore';
import type { Manufacturer } from '@/store/types';
import Icon from '@/components/ui/icon';

interface Props {
  visibleMfrs: Manufacturer[];
  selectedId: string | null;
  sideSearch: string;
  mfrMatCount: Map<string, number>;
  onSelect: (id: string | null) => void;
  onSearchChange: (v: string) => void;
  onAddMfr: () => void;
}

export default function MfrSidebar({
  visibleMfrs, selectedId, sideSearch, mfrMatCount,
  onSelect, onSearchChange, onAddMfr,
}: Props) {
  const store = useStore();

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Производители</div>
        <span className="text-xs text-[hsl(var(--text-muted))]">{store.manufacturers.length}</span>
      </div>
      <div className="relative mb-2">
        <Icon name="Search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] pointer-events-none" />
        <input
          value={sideSearch}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск..."
          className="w-full bg-[hsl(220,12%,14%)] border border-border rounded pl-7 pr-6 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors"
        />
        {sideSearch && (
          <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={11} />
          </button>
        )}
      </div>
      {visibleMfrs.map(m => {
        const matCount = mfrMatCount.get(m.id) || 0;
        const types = (m.materialTypeIds || []).slice(0, 4).map(tid => store.getTypeById(tid)).filter(Boolean);
        const isActive = selectedId === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`w-full text-left rounded-lg border transition-all duration-150 p-3 ${
              isActive
                ? 'bg-[hsl(220,12%,17%)] border-gold/50 shadow-sm'
                : 'bg-[hsl(220,14%,11%)] border-border hover:border-[hsl(220,12%,26%)] hover:bg-[hsl(220,12%,14%)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${isActive ? 'bg-gold text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))]'}`}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-semibold text-sm truncate ${isActive ? 'text-gold' : 'text-foreground'}`}>{m.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[hsl(var(--text-muted))]">{matCount} позиций</span>
                  {types.length > 0 && (
                    <div className="flex gap-0.5">
                      {types.map(t => (
                        <span key={t!.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: t!.color || '#888' }} title={t!.name} />
                      ))}
                      {(m.materialTypeIds || []).length > 4 && (
                        <span className="text-[10px] text-[hsl(var(--text-muted))] ml-0.5">+{(m.materialTypeIds || []).length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {isActive && <Icon name="ChevronRight" size={14} className="text-gold shrink-0" />}
            </div>
          </button>
        );
      })}
      {visibleMfrs.length === 0 && (
        <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))] opacity-60">
          {sideSearch ? 'Не найдено' : 'Нет производителей'}
        </div>
      )}
      <button
        onClick={onAddMfr}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold border border-dashed border-[hsl(var(--surface-3))] rounded-lg hover:border-gold transition-all mt-1"
      >
        <Icon name="Plus" size={12} /> Добавить производителя
      </button>
    </div>
  );
}