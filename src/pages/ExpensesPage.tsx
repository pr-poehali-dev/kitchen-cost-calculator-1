import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ExpenseItem, ExpenseGroup } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

const TYPE_META = {
  fixed:   { label: 'Фикс.',    color: 'bg-[hsl(220,12%,22%)] text-[hsl(var(--text-dim))]' },
  percent: { label: '%',        color: 'bg-[hsl(200,40%,20%)] text-[hsl(200,60%,70%)]' },
  markup:  { label: 'Наценка',  color: 'bg-[hsl(38,40%,20%)] text-gold' },
};

const APPLY_OPTIONS = [
  { value: 'materials', label: 'На материалы' },
  { value: 'services',  label: 'На услуги' },
  { value: 'total',     label: 'На итог' },
  { value: 'block',     label: 'На блоки' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!enabled); }}
      className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${enabled ? 'bg-gold' : 'bg-[hsl(220,12%,22%)]'}`}
    >
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function ExpenseRow({
  expense, currency, projectBlocks, onEdit, onDelete, onToggle
}: {
  expense: ExpenseItem;
  currency: string;
  projectBlocks: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const meta = TYPE_META[expense.type];
  const enabled = expense.enabled !== false;

  const applyLabel = () => {
    if (expense.type !== 'markup') return '—';
    if (expense.applyTo === 'block') {
      const names = (expense.blockIds || [])
        .map(id => projectBlocks.find(b => b.id === id)?.name || '?')
        .join(', ');
      return names || 'Блоки не выбраны';
    }
    return APPLY_OPTIONS.find(o => o.value === expense.applyTo)?.label || '—';
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm ${!enabled ? 'opacity-40' : ''}`}
    >
      <Toggle enabled={enabled} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="text-foreground truncate">{expense.name}</div>
        {expense.note && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{expense.note}</div>}
      </div>

      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${meta.color}`}>
        {meta.label}
      </span>

      {expense.type === 'markup' && (
        <span className="text-xs text-[hsl(var(--text-dim))] shrink-0 hidden sm:block max-w-[100px] truncate">
          {applyLabel()}
        </span>
      )}

      <div className="text-right font-mono shrink-0 w-20">
        {expense.type === 'fixed'
          ? <span className="text-foreground">{fmt(expense.value)}<span className="text-[hsl(var(--text-muted))] text-xs ml-0.5">{currency}</span></span>
          : <span className={expense.type === 'markup' ? 'text-gold' : 'text-[hsl(200,60%,70%)]'}>{expense.value}%</span>
        }
      </div>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 rounded">
          <Icon name="Pencil" size={12} />
        </button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 rounded">
          <Icon name="Trash2" size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Partial<ExpenseItem> | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id?: string; name: string } | null>(null);

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
    setEditing(null);
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

        {/* Влияние на расчёт */}
        {totals && (
          <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Влияние на расчёт</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[hsl(var(--text-dim))]">
                <span>Материалы</span>
                <span className="font-mono">{fmt(totals.rawMaterials)} {store.settings.currency}</span>
              </div>
              {totals.matMarkupAmount > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценка на материалы ({totals.matMarkupPct}%)</span>
                  <span className="font-mono">+{fmt(totals.matMarkupAmount)} {store.settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-[hsl(var(--text-dim))]">
                <span>Услуги</span>
                <span className="font-mono">{fmt(totals.rawServices)} {store.settings.currency}</span>
              </div>
              {totals.svcMarkupAmount > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценка на услуги ({totals.svcMarkupPct}%)</span>
                  <span className="font-mono">+{fmt(totals.svcMarkupAmount)} {store.settings.currency}</span>
                </div>
              )}
              {totals.blockExtraTotal > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценки на блоки</span>
                  <span className="font-mono">+{fmt(totals.blockExtraTotal)} {store.settings.currency}</span>
                </div>
              )}
              {totals.totalMarkupAmount > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценка на итог ({totals.totalMarkupPct}%)</span>
                  <span className="font-mono">+{fmt(totals.totalMarkupAmount)} {store.settings.currency}</span>
                </div>
              )}
              {totals.percentAmount > 0 && (
                <div className="flex justify-between text-[hsl(200,60%,70%)]">
                  <span>Процентные расходы</span>
                  <span className="font-mono">+{fmt(totals.percentAmount)} {store.settings.currency}</span>
                </div>
              )}
              {totals.fixedAmount > 0 && (
                <div className="flex justify-between text-[hsl(var(--text-dim))]">
                  <span>Постоянные расходы</span>
                  <span className="font-mono">+{fmt(totals.fixedAmount)} {store.settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-1">
                <span>Итого с расходами</span>
                <span className="font-mono text-gold">{fmt(totals.grandTotal)} {store.settings.currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* Группы расходов */}
        {groups.map(group => {
          const items = store.expenses.filter(e => e.groupId === group.id);
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
                    <span className="text-xs font-mono text-[hsl(var(--text-dim))]">{fmt(groupTotal)} {store.settings.currency}</span>
                  )}
                  {groupPct > 0 && (
                    <span className="text-xs font-mono text-[hsl(200,60%,70%)]">{groupPct}%</span>
                  )}
                  <button
                    onClick={() => setEditing(newExpense('markup', group.id))}
                    className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors p-1"
                    title="Добавить статью в группу"
                  >
                    <Icon name="Plus" size={13} />
                  </button>
                  <button
                    onClick={() => setEditingGroup({ id: group.id, name: group.name })}
                    className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-1"
                  >
                    <Icon name="Pencil" size={12} />
                  </button>
                  <button
                    onClick={() => store.deleteExpenseGroup(group.id)}
                    className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors p-1"
                  >
                    <Icon name="Trash2" size={12} />
                  </button>
                </div>
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-4 text-xs text-[hsl(var(--text-muted))] text-center">
                  Нет статей — <button className="text-gold hover:underline" onClick={() => setEditing(newExpense('markup', group.id))}>добавить</button>
                </div>
              ) : (
                items.map(e => (
                  <ExpenseRow key={e.id} expense={e} currency={store.settings.currency} projectBlocks={projectBlocks}
                    onEdit={() => setEditing(e)}
                    onDelete={() => store.deleteExpense(e.id)}
                    onToggle={v => store.updateExpense(e.id, { enabled: v })}
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
                onClick={() => setEditing(newExpense('markup'))}
                className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors p-1"
              >
                <Icon name="Plus" size={13} />
              </button>
            </div>
            {ungroupedExpenses.map(e => (
              <ExpenseRow key={e.id} expense={e} currency={store.settings.currency} projectBlocks={projectBlocks}
                onEdit={() => setEditing(e)}
                onDelete={() => store.deleteExpense(e.id)}
                onToggle={v => store.updateExpense(e.id, { enabled: v })}
              />
            ))}
          </div>
        )}

        {groups.length === 0 && ungroupedExpenses.length === 0 && (
          <div className="bg-[hsl(220,14%,11%)] rounded border border-dashed border-border p-10 text-center">
            <div className="text-[hsl(var(--text-muted))] text-sm mb-3">Нет статей расходов</div>
            <div className="flex justify-center gap-2">
              <button onClick={() => setEditingGroup({ name: '' })} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-foreground">
                <Icon name="FolderPlus" size={12} /> Создать группу
              </button>
              <button onClick={() => setEditing(newExpense('markup'))} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-medium hover:opacity-90">
                <Icon name="Plus" size={12} /> Добавить статью
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка: редактирование статьи */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)] z-10">
              <span className="font-semibold text-sm">{editing.id ? 'Редактировать статью' : 'Новая статья'}</span>
              <button onClick={() => setEditing(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">

              {/* Название */}
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
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
                      onClick={() => setEditing(p => ({ ...p!, type: t, applyTo: t === 'markup' ? (p?.applyTo || 'materials') : undefined }))}
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
                  {editing.type === 'fixed' ? `Сумма, ${store.settings.currency}` : 'Процент, %'}
                </label>
                <input
                  type="number"
                  value={editing.value || ''}
                  onChange={e => setEditing(p => ({ ...p!, value: parseFloat(e.target.value) || 0 }))}
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
                        onClick={() => setEditing(p => ({ ...p!, applyTo: o.value as ExpenseItem['applyTo'], blockIds: o.value !== 'block' ? [] : p?.blockIds }))}
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
                                onClick={() => setEditing(p => {
                                  const ids = p?.blockIds || [];
                                  return { ...p!, blockIds: sel ? ids.filter(i => i !== b.id) : [...ids, b.id] };
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
                    onClick={() => setEditing(p => ({ ...p!, groupId: undefined }))}
                    className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${!editing.groupId ? 'bg-[hsl(220,12%,26%)] text-foreground border-[hsl(220,12%,30%)]' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                  >Без группы</button>
                  {groups.map(g => (
                    <button key={g.id}
                      onClick={() => setEditing(p => ({ ...p!, groupId: g.id }))}
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
                  onChange={v => setEditing(p => ({ ...p!, enabled: v }))}
                />
              </div>

              {/* Примечание */}
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
                <input
                  value={editing.note || ''}
                  onChange={e => setEditing(p => ({ ...p!, note: e.target.value }))}
                  placeholder="Необязательно"
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveExpense}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >Сохранить</button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: группа */}
      {editingGroup !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-xs mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">{editingGroup.id ? 'Переименовать группу' : 'Новая группа'}</span>
              <button onClick={() => setEditingGroup(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
                <input
                  value={editingGroup.name}
                  onChange={e => setEditingGroup(p => ({ ...p!, name: e.target.value }))}
                  placeholder="Персонал, Налоги, Накладные…"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editingGroup.name.trim()) {
                      if (editingGroup.id) store.updateExpenseGroup(editingGroup.id, { name: editingGroup.name });
                      else store.addExpenseGroup(editingGroup.name.trim());
                      setEditingGroup(null);
                    }
                  }}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!editingGroup.name.trim()) return;
                    if (editingGroup.id) store.updateExpenseGroup(editingGroup.id, { name: editingGroup.name });
                    else store.addExpenseGroup(editingGroup.name.trim());
                    setEditingGroup(null);
                  }}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >Сохранить</button>
                <button onClick={() => setEditingGroup(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}