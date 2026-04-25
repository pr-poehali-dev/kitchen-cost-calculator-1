import type { ExpenseItem, ExpenseGroup } from '@/store/types';
import Icon from '@/components/ui/icon';
import { Toggle, APPLY_OPTIONS } from './ExpenseRow';

interface ExpenseModalProps {
  editing: Partial<ExpenseItem>;
  groups: ExpenseGroup[];
  projectBlocks: { id: string; name: string }[];
  currency: string;
  onSave: () => void;
  onClose: () => void;
  onChange: (updater: (p: Partial<ExpenseItem>) => Partial<ExpenseItem>) => void;
}

export function ExpenseModal({
  editing, groups, projectBlocks, currency,
  onSave, onClose, onChange,
}: ExpenseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)] z-10">
          <span className="font-semibold text-sm">{editing.id ? 'Редактировать статью' : 'Новая статья'}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">

          {/* Название */}
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
            <input
              value={editing.name || ''}
              onChange={e => onChange(p => ({ ...p, name: e.target.value }))}
              placeholder="Например: НДС, Аренда, Наценка"
              autoFocus
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>

          {/* Тип */}
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Тип</label>
            <div className="flex gap-2">
              {(['markup', 'fixed', 'percent'] as const).map(t => (
                <button key={t}
                  onClick={() => onChange(p => ({ ...p, type: t, applyTo: t === 'markup' ? (p?.applyTo || 'materials') : undefined }))}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors border ${editing.type === t ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                >
                  {t === 'markup' ? 'Наценка' : t === 'fixed' ? 'Фиксированный' : 'Процент'}
                </button>
              ))}
            </div>
          </div>

          {/* Значение */}
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
              {editing.type === 'fixed' ? `Сумма, ${currency}` : 'Процент, %'}
            </label>
            <input
              type="number"
              value={editing.value || ''}
              onChange={e => onChange(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Применяется к (только для markup) */}
          {editing.type === 'markup' && (
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Применяется к</label>
              <div className="flex flex-wrap gap-2">
                {APPLY_OPTIONS.map(o => (
                  <button key={o.value}
                    onClick={() => onChange(p => ({ ...p, applyTo: o.value as ExpenseItem['applyTo'], blockIds: o.value !== 'block' ? [] : p?.blockIds }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${editing.applyTo === o.value ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {editing.applyTo === 'block' && (
                <div className="mt-3">
                  <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Блоки материалов:</div>
                  {projectBlocks.length === 0 ? (
                    <div className="text-xs text-[hsl(var(--text-muted))] italic">Нет блоков в проекте</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {projectBlocks.map(b => {
                        const sel = (editing.blockIds || []).includes(b.id);
                        return (
                          <button key={b.id}
                            onClick={() => onChange(p => {
                              const ids = p?.blockIds || [];
                              return { ...p, blockIds: sel ? ids.filter(i => i !== b.id) : [...ids, b.id] };
                            })}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border transition-colors ${sel ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                          >
                            {sel && <Icon name="Check" size={10} />}
                            {b.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Группа */}
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Группа</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onChange(p => ({ ...p, groupId: undefined }))}
                className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${!editing.groupId ? 'bg-[hsl(220,12%,26%)] text-foreground border-[hsl(220,12%,30%)]' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
              >Без группы</button>
              {groups.map(g => (
                <button key={g.id}
                  onClick={() => onChange(p => ({ ...p, groupId: g.id }))}
                  className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${editing.groupId === g.id ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                >{g.name}</button>
              ))}
            </div>
          </div>

          {/* Включить в расчёт */}
          <div className="flex items-center justify-between py-1 border-t border-border">
            <div>
              <div className="text-sm text-foreground">Включить в расчёт</div>
              <div className="text-xs text-[hsl(var(--text-muted))]">Влияет на итоговую сумму</div>
            </div>
            <Toggle
              enabled={editing.enabled !== false}
              onChange={v => onChange(p => ({ ...p, enabled: v }))}
            />
          </div>

          {/* Примечание */}
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
            <input
              value={editing.note || ''}
              onChange={e => onChange(p => ({ ...p, note: e.target.value }))}
              placeholder="Необязательно"
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onSave}
              className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
            >Сохранить</button>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GroupModalProps {
  editingGroup: { id?: string; name: string };
  onSave: () => void;
  onClose: () => void;
  onChange: (name: string) => void;
}

export function GroupModal({ editingGroup, onSave, onClose, onChange }: GroupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-xs mx-4 animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">{editingGroup.id ? 'Переименовать группу' : 'Новая группа'}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
            <input
              value={editingGroup.name}
              onChange={e => onChange(e.target.value)}
              placeholder="Персонал, Налоги, Накладные…"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && editingGroup.name.trim()) onSave(); }}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
            >Сохранить</button>
            <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
