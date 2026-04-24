import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ExpenseItem } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function ExpensesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Partial<ExpenseItem> | null>(null);

  const fixedTotal = store.expenses
    .filter(e => e.type === 'fixed')
    .reduce((s, e) => s + e.value, 0);

  const percentItems = store.expenses.filter(e => e.type === 'percent');

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Расходы и наценки</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Постоянные затраты и процентные надбавки</p>
        </div>
        <button
          onClick={() => setEditing({ type: 'fixed', value: 0, name: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} /> Добавить статью
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-6">
        {/* Markup */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-4">Наценки на стоимость</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[hsl(220,12%,14%)] rounded p-4">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">Наценка на материалы</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={store.settings.markupMaterial}
                  onChange={e => store.updateSettings({ markupMaterial: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-[hsl(220,12%,18%)] border border-border rounded px-3 py-1.5 text-lg font-mono text-gold outline-none focus:border-gold text-center"
                />
                <span className="text-xl text-[hsl(var(--text-dim))]">%</span>
              </div>
              <div className="text-xs text-[hsl(var(--text-muted))] mt-2">Применяется к базовой цене материала из Базы</div>
            </div>
            <div className="bg-[hsl(220,12%,14%)] rounded p-4">
              <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">Наценка на услуги</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={store.settings.markupService}
                  onChange={e => store.updateSettings({ markupService: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-[hsl(220,12%,18%)] border border-border rounded px-3 py-1.5 text-lg font-mono text-gold outline-none focus:border-gold text-center"
                />
                <span className="text-xl text-[hsl(var(--text-dim))]">%</span>
              </div>
              <div className="text-xs text-[hsl(var(--text-muted))] mt-2">Применяется к базовой цене услуги из Базы</div>
            </div>
          </div>
        </div>

        {/* Fixed expenses */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Постоянные расходы</span>
            <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(fixedTotal)} {store.settings.currency}/мес</span>
          </div>
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
            <span>Статья расходов</span><span>Тип</span><span className="text-right">Значение</span><span></span>
          </div>
          {store.expenses.filter(e => e.type === 'fixed').map(e => (
            <ExpenseRow key={e.id} expense={e}
              currency={store.settings.currency}
              onEdit={() => setEditing(e)}
              onDelete={() => store.deleteExpense(e.id)}
            />
          ))}
          <div className="px-4 py-2">
            <button
              onClick={() => setEditing({ type: 'fixed', value: 0, name: '' })}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              <Icon name="Plus" size={12} /> Добавить постоянный расход
            </button>
          </div>
        </div>

        {/* Percent expenses */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Процентные расходы</span>
            <div className="flex gap-2 text-xs text-[hsl(var(--text-muted))]">
              {percentItems.map(e => (
                <span key={e.id} className="bg-[hsl(220,12%,16%)] px-2 py-0.5 rounded">{e.name}: {e.value}%</span>
              ))}
            </div>
          </div>
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
            <span>Статья расходов</span><span>Тип</span><span className="text-right">Процент</span><span></span>
          </div>
          {percentItems.map(e => (
            <ExpenseRow key={e.id} expense={e}
              currency={store.settings.currency}
              onEdit={() => setEditing(e)}
              onDelete={() => store.deleteExpense(e.id)}
            />
          ))}
          <div className="px-4 py-2">
            <button
              onClick={() => setEditing({ type: 'percent', value: 0, name: '' })}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              <Icon name="Plus" size={12} /> Добавить процентный расход
            </button>
          </div>
        </div>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">{editing.id ? 'Изменить статью' : 'Новая статья расходов'}</span>
              <button onClick={() => setEditing(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название *</label>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип</label>
                <div className="flex gap-2">
                  {(['fixed', 'percent'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setEditing(p => ({ ...p!, type: t }))}
                      className={`flex-1 py-2 rounded text-sm transition-colors ${
                        editing.type === t ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'
                      }`}
                    >
                      {t === 'fixed' ? 'Фиксированный (₽)' : 'Процент (%)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
                  {editing.type === 'fixed' ? `Сумма, ${store.settings.currency}` : 'Процент, %'}
                </label>
                <input
                  type="number"
                  value={editing.value || ''}
                  onChange={e => setEditing(p => ({ ...p!, value: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
                <input
                  value={editing.note || ''}
                  onChange={e => setEditing(p => ({ ...p!, note: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    if (!editing.name) return;
                    if (editing.id) store.updateExpense(editing.id, editing);
                    else store.addExpense(editing as Omit<ExpenseItem, 'id'>);
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

function ExpenseRow({ expense, currency, onEdit, onDelete }: {
  expense: ExpenseItem; currency: string; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
      style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
      <div>
        <div className="text-foreground">{expense.name}</div>
        {expense.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{expense.note}</div>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
        expense.type === 'fixed'
          ? 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))]'
          : 'bg-[hsl(38,40%,20%)] text-gold'
      }`}>
        {expense.type === 'fixed' ? 'Фиксир.' : 'Процент'}
      </span>
      <div className="text-right font-mono">
        {expense.type === 'fixed'
          ? <span>{expense.value.toLocaleString()} <span className="text-[hsl(var(--text-muted))] text-xs">{currency}</span></span>
          : <span className="text-gold">{expense.value}%</span>
        }
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}
