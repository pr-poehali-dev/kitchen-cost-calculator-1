import type { ExpenseItem, ExpenseGroup } from '@/store/types';
import Icon from '@/components/ui/icon';
import ExpenseRow from './ExpenseRow';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Props {
  groups: ExpenseGroup[];
  ungroupedExpenses: ExpenseItem[];
  allExpenses: ExpenseItem[];
  currency: string;
  projectBlocks: { id: string; name: string }[];
  onEdit: (e: ExpenseItem) => void;
  onDelete: (id: string) => void;
  onToggle: (e: ExpenseItem, v: boolean) => void;
  onAddToGroup: (groupId: string) => void;
  onAddUngrouped: () => void;
  onEditGroup: (group: ExpenseGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddGroup: () => void;
  onAddFirst: () => void;
}

export default function ExpenseGroupBlock({
  groups, ungroupedExpenses, allExpenses, currency, projectBlocks,
  onEdit, onDelete, onToggle,
  onAddToGroup, onAddUngrouped,
  onEditGroup, onDeleteGroup,
  onAddGroup, onAddFirst,
}: Props) {
  return (
    <>
      {/* Группы расходов */}
      {groups.map(group => {
        const items = allExpenses.filter(e => e.groupId === group.id);
        const groupTotal = items.filter(e => e.enabled !== false && e.type === 'fixed').reduce((s, e) => s + e.value, 0);
        const groupPct = items.filter(e => e.enabled !== false && e.type !== 'fixed').reduce((s, e) => s + e.value, 0);

        return (
          <div key={group.id} className="bg-[hsl(220,14%,11%)] rounded border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,13%)] border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="Folder" size={13} className="text-[hsl(var(--text-muted))] shrink-0" />
                <span className="text-sm font-medium truncate">{group.name}</span>
                <span className="text-xs text-[hsl(var(--text-muted))]">{items.length} статей</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {groupTotal > 0 && (
                  <span className="text-xs font-mono text-[hsl(var(--text-dim))]">{fmt(groupTotal)} {currency}</span>
                )}
                {groupPct > 0 && (
                  <span className="text-xs font-mono text-[hsl(200,60%,70%)]">{groupPct}%</span>
                )}
                <button
                  onClick={() => onAddToGroup(group.id)}
                  className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors p-1"
                  title="Добавить статью в группу"
                >
                  <Icon name="Plus" size={13} />
                </button>
                <button
                  onClick={() => onEditGroup(group)}
                  className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-1"
                >
                  <Icon name="Pencil" size={12} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Удалить группу «${group.name}» со всеми статьями?`)) onDeleteGroup(group.id); }}
                  className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors p-1"
                >
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[hsl(var(--text-muted))] text-center">
                Нет статей — <button className="text-gold hover:underline" onClick={() => onAddToGroup(group.id)}>добавить</button>
              </div>
            ) : (
              items.map(e => (
                <ExpenseRow key={e.id} expense={e} currency={currency} projectBlocks={projectBlocks}
                  onEdit={() => onEdit(e)}
                  onDelete={() => onDelete(e.id)}
                  onToggle={v => onToggle(e, v)}
                />
              ))
            )}
          </div>
        );
      })}

      {/* Статьи без группы */}
      {ungroupedExpenses.length > 0 && (
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,13%)] border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="LayoutList" size={13} className="text-[hsl(var(--text-muted))]" />
              <span className="text-sm font-medium">Без группы</span>
            </div>
            <button
              onClick={onAddUngrouped}
              className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors p-1"
            >
              <Icon name="Plus" size={13} />
            </button>
          </div>
          {ungroupedExpenses.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={currency} projectBlocks={projectBlocks}
              onEdit={() => onEdit(e)}
              onDelete={() => onDelete(e.id)}
              onToggle={v => onToggle(e, v)}
            />
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {groups.length === 0 && ungroupedExpenses.length === 0 && (
        <div className="bg-[hsl(220,14%,11%)] rounded border border-dashed border-border p-10 text-center">
          <div className="text-[hsl(var(--text-muted))] text-sm mb-3">Нет статей расходов</div>
          <div className="flex justify-center gap-2">
            <button onClick={onAddGroup} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-foreground">
              <Icon name="FolderPlus" size={12} /> Создать группу
            </button>
            <button onClick={onAddFirst} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90">
              <Icon name="Plus" size={12} /> Добавить статью
            </button>
          </div>
        </div>
      )}
    </>
  );
}