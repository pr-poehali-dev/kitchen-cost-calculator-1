import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ExpenseItem, ExpenseGroup } from '@/store/types';
import Icon from '@/components/ui/icon';
import ExpenseSummary from './expenses/ExpenseSummary';
import ExpenseGroupBlock from './expenses/ExpenseGroupBlock';
import { ExpenseModal, GroupModal } from './expenses/ExpenseModals';

export default function ExpensesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Partial<ExpenseItem> | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id?: string; name: string } | null>(null);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);

  const project = store.getActiveProject();
  const projectBlocks = project?.blocks.map(b => ({ id: b.id, name: b.name })) || [];
  const groups: ExpenseGroup[] = store.expenseGroups || [];
  const totals = project ? store.calcProjectTotals(project) : null;

  const ungroupedExpenses = store.expenses.filter(e => !e.groupId);

  const newExpense = (type: ExpenseItem['type'], groupId?: string) => ({
    type,
    value: 0,
    name: '',
    enabled: true,
    groupId,
    applyTo: type === 'markup' ? 'materials' as const : undefined,
    blockIds: [],
  });

  const notifyIfMarkupChanged = (type: ExpenseItem['type'], applyTo?: string) => {
    if (type === 'markup' && (applyTo === 'materials' || applyTo === 'services')) {
      setShowRefreshBanner(true);
      setRefreshDone(false);
    }
  };

  const handleSaveExpense = () => {
    if (!editing?.name?.trim()) return;
    const data = {
      name: editing.name.trim(),
      type: editing.type ?? 'fixed' as const,
      value: editing.value ?? 0,
      applyTo: editing.applyTo,
      blockIds: editing.blockIds || [],
      groupId: editing.groupId,
      enabled: editing.enabled !== false,
      note: editing.note,
    };
    if (editing.id) store.updateExpense(editing.id, data);
    else store.addExpense(data as Omit<ExpenseItem, 'id'>);
    notifyIfMarkupChanged(data.type, data.applyTo);
    setEditing(null);
  };

  const handleToggleExpense = (expense: ExpenseItem, enabled: boolean) => {
    store.updateExpense(expense.id, { enabled });
    notifyIfMarkupChanged(expense.type, expense.applyTo);
  };

  const handleApplyRefresh = () => {
    if (!project) return;
    store.refreshProjectPrices(project.id);
    setRefreshDone(true);
    setTimeout(() => { setShowRefreshBanner(false); setRefreshDone(false); }, 2000);
  };

  const handleSaveGroup = () => {
    if (!editingGroup?.name.trim()) return;
    if (editingGroup.id) store.updateExpenseGroup(editingGroup.id, { name: editingGroup.name });
    else store.addExpenseGroup(editingGroup.name.trim());
    setEditingGroup(null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">Расходы и наценки</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5 truncate">Группируй статьи, включай и выключай в расчёте</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditingGroup({ name: '' })}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground hover:border-[hsl(var(--text-dim))] transition-colors"
          >
            <Icon name="FolderPlus" size={14} /> Группа
          </button>
          <button
            onClick={() => setEditing(newExpense('markup'))}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
          >
            <Icon name="Plus" size={14} /> Добавить
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        <ExpenseSummary
          totals={totals}
          currency={store.settings.currency}
          project={project ?? null}
          showRefreshBanner={showRefreshBanner}
          refreshDone={refreshDone}
          onApplyRefresh={handleApplyRefresh}
          onDismissBanner={() => setShowRefreshBanner(false)}
        />

        <ExpenseGroupBlock
          groups={groups}
          ungroupedExpenses={ungroupedExpenses}
          allExpenses={store.expenses}
          currency={store.settings.currency}
          projectBlocks={projectBlocks}
          onEdit={e => setEditing(e)}
          onDelete={id => store.deleteExpense(id)}
          onToggle={handleToggleExpense}
          onAddToGroup={groupId => setEditing(newExpense('markup', groupId))}
          onAddUngrouped={() => setEditing(newExpense('markup'))}
          onEditGroup={g => setEditingGroup({ id: g.id, name: g.name })}
          onDeleteGroup={id => store.deleteExpenseGroup(id)}
          onAddGroup={() => setEditingGroup({ name: '' })}
          onAddFirst={() => setEditing(newExpense('markup'))}
        />
      </div>

      {editing !== null && (
        <ExpenseModal
          editing={editing}
          groups={groups}
          projectBlocks={projectBlocks}
          currency={store.settings.currency}
          onSave={handleSaveExpense}
          onClose={() => setEditing(null)}
          onChange={updater => setEditing(p => updater(p!))}
        />
      )}

      {editingGroup !== null && (
        <GroupModal
          editingGroup={editingGroup}
          onSave={handleSaveGroup}
          onClose={() => setEditingGroup(null)}
          onChange={name => setEditingGroup(p => ({ ...p!, name }))}
        />
      )}
    </div>
  );
}
