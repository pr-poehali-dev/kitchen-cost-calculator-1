import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ExpenseItem } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) => n.toLocaleString('ru-RU');

const TYPE_META = {
  fixed: { label: 'Фиксированный', desc: '₽ в месяц / раз', color: 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))]' },
  percent: { label: 'Процент', desc: '% от оборота', color: 'bg-[hsl(200,40%,20%)] text-[hsl(200,60%,70%)]' },
  markup: { label: 'Наценка', desc: '% к цене', color: 'bg-[hsl(38,40%,20%)] text-gold' },
};

const APPLY_TO_LABELS: Record<string, string> = {
  materials: 'На материалы',
  services: 'На услуги',
  total: 'На итоговую сумму',
};

function ExpenseRow({ expense, currency, onEdit, onDelete }: {
  expense: ExpenseItem; currency: string; onEdit: () => void; onDelete: () => void;
}) {
  const meta = TYPE_META[expense.type];
  return (
    <div className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
      style={{ gridTemplateColumns: '2fr 0.8fr 1fr 1fr 28px' }}>
      <div>
        <div className="text-foreground">{expense.name}</div>
        {expense.note && <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{expense.note}</div>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${meta.color}`}>
        {meta.label}
      </span>
      <div className="text-xs text-[hsl(var(--text-dim))]">
        {expense.type === 'markup' && expense.applyTo ? APPLY_TO_LABELS[expense.applyTo] || '—' : meta.desc}
      </div>
      <div className="text-right font-mono">
        {expense.type === 'fixed'
          ? <span>{fmt(expense.value)} <span className="text-[hsl(var(--text-muted))] text-xs">{currency}</span></span>
          : <span className={expense.type === 'markup' ? 'text-gold' : 'text-[hsl(200,60%,70%)]'}>{expense.value}%</span>
        }
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}

const COL_HEADER = (
  <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
    style={{ gridTemplateColumns: '2fr 0.8fr 1fr 1fr 28px' }}>
    <span>Статья</span><span>Тип</span><span>Применяется</span><span className="text-right">Значение</span><span></span>
  </div>
);

export default function ExpensesPage() {
  const store = useStore();
  const [editing, setEditing] = useState<Partial<ExpenseItem> | null>(null);

  const fixedItems = store.expenses.filter(e => e.type === 'fixed');
  const percentItems = store.expenses.filter(e => e.type === 'percent');
  const markupItems = store.expenses.filter(e => e.type === 'markup');

  const fixedTotal = fixedItems.reduce((s, e) => s + e.value, 0);
  const totalPercent = percentItems.reduce((s, e) => s + e.value, 0);

  // Effective markups from markup items (override settings.markupMaterial/Service)
  const matMarkup = markupItems.find(e => e.applyTo === 'materials');
  const svcMarkup = markupItems.find(e => e.applyTo === 'services');
  const totalMarkup = markupItems.find(e => e.applyTo === 'total');

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Расходы и наценки</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Постоянные затраты, процентные расходы, наценки на стоимость</p>
        </div>
        <button
          onClick={() => setEditing({ type: 'markup', value: 0, applyTo: 'materials', name: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} /> Добавить статью
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-5">

        {/* === MARKUP OVERVIEW === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-4">Наценки на стоимость</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'На материалы', item: matMarkup, applyTo: 'materials' as const, fallback: store.settings.markupMaterial },
              { label: 'На услуги', item: svcMarkup, applyTo: 'services' as const, fallback: store.settings.markupService },
              { label: 'На итого', item: totalMarkup, applyTo: 'total' as const, fallback: 0 },
            ].map(({ label, item, applyTo, fallback }) => (
              <div key={applyTo} className="bg-[hsl(220,12%,14%)] rounded p-4">
                <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">{label}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item ? item.value : fallback}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (item) {
                        store.updateExpense(item.id, { value: val });
                      } else {
                        if (applyTo === 'materials') store.updateSettings({ markupMaterial: val });
                        else if (applyTo === 'services') store.updateSettings({ markupService: val });
                        else store.addExpense({ name: `Наценка на итого`, type: 'markup', value: val, applyTo: 'total' });
                      }
                    }}
                    className="w-20 bg-[hsl(220,12%,18%)] border border-border rounded px-3 py-1.5 text-lg font-mono text-gold outline-none focus:border-gold text-center"
                  />
                  <span className="text-xl text-[hsl(var(--text-dim))]">%</span>
                  {item && (
                    <button
                      onClick={() => setEditing(item)}
                      className="ml-auto text-[hsl(var(--text-muted))] hover:text-foreground"
                    >
                      <Icon name="Pencil" size={13} />
                    </button>
                  )}
                </div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-2">
                  {item?.note || (applyTo === 'total' ? 'Не настроено' : 'Применяется при подборе из Базы')}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setEditing({ type: 'markup', value: 0, applyTo: 'materials', name: '' })}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors mt-3"
          >
            <Icon name="Plus" size={12} /> Добавить наценку
          </button>
        </div>

        {/* === FIXED EXPENSES === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Постоянные расходы</span>
            <div className="flex items-center gap-4">
              <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(fixedTotal)} {store.settings.currency}/мес</span>
              <button
                onClick={() => setEditing({ type: 'fixed', value: 0, name: '' })}
                className="flex items-center gap-1 text-xs text-gold hover:opacity-80"
              >
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>
          </div>
          {COL_HEADER}
          {fixedItems.length === 0 && (
            <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет записей</div>
          )}
          {fixedItems.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={store.settings.currency}
              onEdit={() => setEditing(e)} onDelete={() => store.deleteExpense(e.id)} />
          ))}
        </div>

        {/* === PERCENT EXPENSES === */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Процентные расходы</span>
            <div className="flex items-center gap-4">
              <span className="text-[hsl(var(--text-muted))] text-xs font-mono text-[hsl(200,60%,60%)]">{totalPercent}% суммарно</span>
              <button
                onClick={() => setEditing({ type: 'percent', value: 0, name: '' })}
                className="flex items-center gap-1 text-xs text-gold hover:opacity-80"
              >
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>
          </div>
          {COL_HEADER}
          {percentItems.length === 0 && (
            <div className="px-4 py-6 text-center text-[hsl(var(--text-muted))] text-sm">Нет записей</div>
          )}
          {percentItems.map(e => (
            <ExpenseRow key={e.id} expense={e} currency={store.settings.currency}
              onEdit={() => setEditing(e)} onDelete={() => store.deleteExpense(e.id)} />
          ))}
        </div>

        {/* === MARKUP ITEMS TABLE === */}
        {markupItems.length > 0 && (
          <div className="bg-[hsl(220,14%,11%)] rounded border border-[hsl(38,30%,25%)]">
            <div className="px-4 py-3 border-b border-[hsl(38,30%,25%)] flex items-center justify-between">
              <span className="text-sm font-medium text-gold">Наценки (детально)</span>
              <span className="text-xs text-[hsl(var(--text-muted))]">Применяются автоматически при подборе из Базы</span>
            </div>
            {COL_HEADER}
            {markupItems.map(e => (
              <ExpenseRow key={e.id} expense={e} currency={store.settings.currency}
                onEdit={() => setEditing(e)} onDelete={() => store.deleteExpense(e.id)} />
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">{editing.id ? 'Изменить статью' : 'Новая статья'}</span>
              <button onClick={() => setEditing(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing(p => ({ ...p!, name: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['fixed', 'percent', 'markup'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setEditing(p => ({ ...p!, type: t }))}
                      className={`py-2 rounded text-xs transition-colors font-medium ${
                        editing.type === t ? 'bg-gold text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'
                      }`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {editing.type === 'markup' && (
                <div>
                  <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Применяется к</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['materials', 'services', 'total'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => setEditing(p => ({ ...p!, applyTo: a }))}
                        className={`py-2 rounded text-xs transition-colors ${
                          editing.applyTo === a ? 'bg-[hsl(38,40%,25%)] text-gold border border-[hsl(38,40%,35%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'
                        }`}
                      >
                        {APPLY_TO_LABELS[a]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
                  {editing.type === 'fixed' ? `Сумма, ${store.settings.currency}` : 'Процент, %'}
                </label>
                <input
                  type="number"
                  value={editing.value || ''}
                  onChange={e => setEditing(p => ({ ...p!, value: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-gold"
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

              <div className="flex gap-2 pt-1">
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
