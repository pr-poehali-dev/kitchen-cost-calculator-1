import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ExpenseItem } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

const TYPE_META = {
  fixed:   { label: 'Фиксированный', color: 'bg-[hsl(220,12%,22%)] text-[hsl(var(--text-dim))]' },
  percent: { label: 'Процент',       color: 'bg-[hsl(200,40%,20%)] text-[hsl(200,60%,70%)]' },
  markup:  { label: 'Наценка',       color: 'bg-[hsl(38,40%,20%)] text-gold' },
};

const APPLY_OPTIONS = [
  { value: 'materials', label: 'На материалы' },
  { value: 'services',  label: 'На услуги' },
  { value: 'total',     label: 'На итоговую сумму' },
  { value: 'block',     label: 'На конкретные блоки' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-gold' : 'bg-[hsl(220,12%,22%)]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function ExpenseRow({ expense, currency, projectBlocks, onEdit, onDelete, onToggle }: {
  expense: ExpenseItem;
  currency: string;
  projectBlocks: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const meta = TYPE_META[expense.type];
  const enabled = expense.enabled !== false;

  const applyLabel = () => {
    if (expense.type !== 'markup') return expense.type === 'fixed' ? 'Фиксированная сумма' : '% от итога';
    if (expense.applyTo === 'block') {
      const names = (expense.blockIds || [])
        .map(id => projectBlocks.find(b => b.id === id)?.name || id)
        .join(', ');
      return names || 'Блоки не выбраны';
    }
    return APPLY_OPTIONS.find(o => o.value === expense.applyTo)?.label || '—';
  };

  return (
    <div className={`grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm ${!enabled ? 'opacity-40' : ''}`}
      style={{ gridTemplateColumns: '32px 2fr 0.7fr 1fr 1fr 52px' }}>
      <Toggle enabled={enabled} onChange={onToggle} />
      <div>
        <div className="text-foreground">{expense.name}</div>
        {expense.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{expense.note}</div>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${meta.color}`}>
        {meta.label}
      </span>
      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-1">{applyLabel()}</div>
      <div className="text-right font-mono">
        {expense.type === 'fixed'
          ? <span>{fmt(expense.value)} <span className="text-[hsl(var(--text-muted))] text-xs">{currency}</span></span>
          : <span className={expense.type === 'markup' ? 'text-gold' : 'text-[hsl(200,60%,70%)]'}>{expense.value}%</span>
        }
      </div>
      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1"><Icon name="Pencil" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}

const COL_HEADER = (
  <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
    style={{ gridTemplateColumns: '32px 2fr 0.7fr 1fr 1fr 52px' }}>
    <span></span><span>Статья</span><span>Тип</span><span>Применяется</span><span className="text-right">Значение</span><span></span>
  </div>
);

export default function ExpensesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Partial<ExpenseItem> | null>(null);

  const project = store.getActiveProject();
  const projectBlocks = project?.blocks.map(b => ({ id: b.id, name: b.name })) || [];

  const fixedItems   = store.expenses.filter(e => e.type === 'fixed');
  const percentItems = store.expenses.filter(e => e.type === 'percent');
  const markupItems  = store.expenses.filter(e => e.type === 'markup');

  const fixedTotal    = fixedItems.filter(e => e.enabled !== false).reduce((s, e) => s + e.value, 0);
  const totalPercent  = percentItems.filter(e => e.enabled !== false).reduce((s, e) => s + e.value, 0);

  const totals = project ? store.calcProjectTotals(project) : null;

  const newExpense = (type: ExpenseItem['type']) => ({
    type,
    value: 0,
    name: '',
    enabled: true,
    applyTo: type === 'markup' ? 'materials' as const : undefined,
    blockIds: [],
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Расходы и наценки</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Управляй статьями расходов, включай и выключай их в расчёте</p>
        </div>
        <button
          onClick={() => setEditing(newExpense('markup'))}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} /> Добавить статью
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-5">

        {/* === ИТОГ С РАСХОДАМИ === */}
        {totals && (
          <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Влияние на расчёт</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[hsl(var(--text-dim))]">
                <span>Материалы (с наценкой)</span>
                <span className="font-mono">{fmt(totals.rawMaterials)} {store.settings.currency}</span>
              </div>
              <div className="flex justify-between text-[hsl(var(--text-dim))]">
                <span>Услуги (с наценкой)</span>
                <span className="font-mono">{fmt(totals.rawServices)} {store.settings.currency}</span>
              </div>
              {totals.totalMarkupAmount > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценка на итого</span>
                  <span className="font-mono">+{fmt(totals.totalMarkupAmount)} {store.settings.currency}</span>
                </div>
              )}
              {totals.blockExtraTotal > 0 && (
                <div className="flex justify-between text-gold">
                  <span>Наценки на блоки</span>
                  <span className="font-mono">+{fmt(totals.blockExtraTotal)} {store.settings.currency}</span>
                </div>
              )}
              {totals.percentAmount > 0 && (
                <div className="flex justify-between text-[hsl(200,60%,70%)]">
                  <span>Процентные расходы ({totalPercent}%)</span>
                  <span className="font-mono">+{fmt(totals.percentAmount)} {store.settings.currency}</span>
                </div>
              )}
              {totals.fixedAmount > 0 && (
                <div className="flex justify-between text-[hsl(var(--text-dim))]">
                  <span>Постоянные расходы</span>
                  <span className="font-mono">+{fmt(totals.fixedAmount)} {store.settings.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                <span>Итого с расходами</span>
                <span className="font-mono text-gold">{fmt(totals.grandTotal)} {store.settings.currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* === НАЦЕНКИ === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Наценки</span>
            <button
              onClick={() => setEditing(newExpense('markup'))}
              className="flex items-center gap-1 text-xs text-gold hover:opacity-80"
            >
              <Icon name="Plus" size={12} /> Добавить
            </button>
          </div>
          {COL_HEADER}
          {markupItems.length === 0 && (
            <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет наценок</div>
          )}
          {markupItems.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={store.settings.currency} projectBlocks={projectBlocks}
              onEdit={() => setEditing(e)}
              onDelete={() => store.deleteExpense(e.id)}
              onToggle={v => store.updateExpense(e.id, { enabled: v })}
            />
          ))}
        </div>

        {/* === ПОСТОЯННЫЕ РАСХОДЫ === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Постоянные расходы</span>
            <div className="flex items-center gap-4">
              <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(fixedTotal)} {store.settings.currency}</span>
              <button onClick={() => setEditing(newExpense('fixed'))} className="flex items-center gap-1 text-xs text-gold hover:opacity-80">
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>
          </div>
          {COL_HEADER}
          {fixedItems.length === 0 && (
            <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет записей</div>
          )}
          {fixedItems.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={store.settings.currency} projectBlocks={projectBlocks}
              onEdit={() => setEditing(e)}
              onDelete={() => store.deleteExpense(e.id)}
              onToggle={v => store.updateExpense(e.id, { enabled: v })}
            />
          ))}
        </div>

        {/* === ПРОЦЕНТНЫЕ РАСХОДЫ === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Процентные расходы</span>
            <div className="flex items-center gap-4">
              <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{totalPercent}% от итога</span>
              <button onClick={() => setEditing(newExpense('percent'))} className="flex items-center gap-1 text-xs text-gold hover:opacity-80">
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>
          </div>
          {COL_HEADER}
          {percentItems.length === 0 && (
            <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет записей</div>
          )}
          {percentItems.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={store.settings.currency} projectBlocks={projectBlocks}
              onEdit={() => setEditing(e)}
              onDelete={() => store.deleteExpense(e.id)}
              onToggle={v => store.updateExpense(e.id, { enabled: v })}
            />
          ))}
        </div>

      </div>

      {/* === МОДАЛКА РЕДАКТИРОВАНИЯ === */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)]">
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
                  placeholder="Например: НДС, Реклама, Наценка на ЛДСП"
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>

              {/* Тип */}
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Тип статьи</label>
                <div className="flex gap-2">
                  {(['markup', 'fixed', 'percent'] as const).map(t => (
                    <button key={t}
                      onClick={() => setEditing(p => ({ ...p!, type: t, applyTo: t === 'markup' ? (p?.applyTo || 'materials') : undefined }))}
                      className={`flex-1 py-2 rounded text-xs font-medium transition-colors border ${editing.type === t ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                    >
                      {TYPE_META[t].label}
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

                  {/* Выбор блоков */}
                  {editing.applyTo === 'block' && (
                    <div className="mt-3">
                      <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Выбери блоки материалов:</div>
                      {projectBlocks.length === 0 ? (
                        <div className="text-xs text-[hsl(var(--text-muted))] italic">Нет блоков в активном проекте</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {projectBlocks.map(b => {
                            const selected = (editing.blockIds || []).includes(b.id);
                            return (
                              <button key={b.id}
                                onClick={() => setEditing(p => {
                                  const ids = p?.blockIds || [];
                                  return { ...p!, blockIds: selected ? ids.filter(i => i !== b.id) : [...ids, b.id] };
                                })}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border transition-colors ${selected ? 'bg-gold text-[hsl(220,16%,8%)] border-gold' : 'border-border text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                              >
                                {selected && <Icon name="Check" size={10} />}
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

              {/* Включена в расчёт */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm text-foreground">Включить в расчёт</div>
                  <div className="text-xs text-[hsl(var(--text-muted))]">Влияет на итоговую сумму проекта</div>
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
                  onClick={() => {
                    if (!editing.name?.trim() || !editing.value) return;
                    const data = {
                      name: editing.name,
                      type: editing.type || 'fixed' as const,
                      value: editing.value,
                      applyTo: editing.applyTo,
                      blockIds: editing.blockIds || [],
                      enabled: editing.enabled !== false,
                      note: editing.note,
                    };
                    if (editing.id) store.updateExpense(editing.id, data);
                    else store.addExpense(data as Omit<ExpenseItem, 'id'>);
                    setEditing(null);
                  }}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >Сохранить</button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
