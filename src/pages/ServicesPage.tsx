import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ServiceRow, Unit } from '@/store/types';
import Icon from '@/components/ui/icon';

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ServicesPage() {
  const store = useStore();
  const project = store.getActiveProject();
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта. Перейдите в раздел «Расчёт».</p>
      </div>
    );
  }

  const grandTotal = project.serviceBlocks.reduce((sum, block) =>
    sum + block.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Услуги</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">{project.object} · {project.client}</p>
        </div>
        <div className="text-right">
          <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого услуг</div>
          <div className="text-gold font-mono font-semibold text-lg">{fmt(grandTotal)} {store.settings.currency}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {project.serviceBlocks.map(block => {
          const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
          return (
            <div key={block.id} className="bg-[hsl(220,14%,11%)] rounded border border-border">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                {editingBlock === block.id ? (
                  <input
                    autoFocus
                    value={editingBlockName}
                    onChange={e => setEditingBlockName(e.target.value)}
                    onBlur={() => {
                      store.updateServiceBlockName(project.id, block.id, editingBlockName || block.name);
                      setEditingBlock(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        store.updateServiceBlockName(project.id, block.id, editingBlockName || block.name);
                        setEditingBlock(null);
                      }
                    }}
                    className="bg-transparent border-b border-gold outline-none text-sm font-semibold text-foreground"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingBlock(block.id); setEditingBlockName(block.name); }}
                    className="text-sm font-semibold text-foreground hover:text-gold transition-colors flex items-center gap-2"
                  >
                    {block.name}
                    <Icon name="Pencil" size={11} className="opacity-40" />
                  </button>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(blockTotal)} {store.settings.currency}</span>
                  <button
                    onClick={() => store.deleteServiceBlock(project.id, block.id)}
                    className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>

              <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}>
                <span>Наименование</span>
                <span>Категория</span>
                <span>Ед. изм.</span>
                <span className="text-right">Кол-во</span>
                <span className="text-right">Цена / Сумма</span>
                <span></span>
              </div>

              {block.rows.map(row => (
                <ServiceRowComponent
                  key={row.id}
                  row={row}
                  currency={store.settings.currency}
                  services={store.services}
                  onUpdate={(data) => store.updateServiceRow(project.id, block.id, row.id, data)}
                  onDelete={() => store.deleteServiceRow(project.id, block.id, row.id)}
                  onApplyService={(svId) => {
                    const sv = store.services.find(s => s.id === svId);
                    if (!sv) return;
                    store.updateServiceRow(project.id, block.id, row.id, {
                      serviceId: sv.id,
                      name: sv.name,
                      unit: sv.unit,
                      price: store.calcPriceWithMarkup(sv.basePrice, true),
                    });
                  }}
                />
              ))}

              <div className="px-4 py-2">
                <button
                  onClick={() => store.addServiceRow(project.id, block.id)}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
                >
                  <Icon name="Plus" size={12} /> Добавить строку
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => store.addServiceBlock(project.id)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
        >
          <Icon name="Plus" size={14} /> Добавить блок услуг
        </button>
      </div>
    </div>
  );
}

function ServiceRowComponent({ row, currency, services, onUpdate, onDelete, onApplyService }: {
  row: ServiceRow;
  currency: string;
  services: ReturnType<typeof useStore>['services'];
  onUpdate: (data: Partial<ServiceRow>) => void;
  onDelete: () => void;
  onApplyService: (id: string) => void;
}) {
  const [showSuggest, setShowSuggest] = useState(false);
  const [nameFilter, setNameFilter] = useState(row.name);
  const rowTotal = row.qty * row.price;

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
    s.category.toLowerCase().includes(nameFilter.toLowerCase())
  );

  const sv = services.find(s => s.id === row.serviceId);

  return (
    <div className="relative grid items-center px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] transition-colors group"
      style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 28px' }}>

      <div className="relative pr-2">
        <input
          value={nameFilter}
          onChange={e => { setNameFilter(e.target.value); onUpdate({ name: e.target.value }); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Наименование услуги..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
        />
        {showSuggest && filtered.length > 0 && (
          <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-64 max-h-40 overflow-auto scrollbar-thin">
            {filtered.slice(0, 6).map(s => (
              <button
                key={s.id}
                onMouseDown={() => { onApplyService(s.id); setNameFilter(s.name); setShowSuggest(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex justify-between"
              >
                <span>{s.name}</span>
                <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{s.basePrice.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{sv?.category || '—'}</div>

      <select
        value={row.unit}
        onChange={e => onUpdate({ unit: e.target.value as Unit })}
        className="bg-transparent text-xs text-[hsl(var(--text-dim))] border-0 outline-none"
      >
        {(['шт', 'компл', 'м²', 'м.п.', 'л', 'кг'] as Unit[]).map(u => (
          <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
        ))}
      </select>

      <input
        type="number"
        value={row.qty || ''}
        onChange={e => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
        className="bg-transparent text-sm font-mono text-right outline-none w-full border-b border-transparent focus:border-[hsl(var(--gold))] pr-1"
      />

      <div className="text-right pr-1">
        <input
          type="number"
          value={row.price || ''}
          onChange={e => onUpdate({ price: parseFloat(e.target.value) || 0 })}
          className="bg-transparent text-sm font-mono text-right outline-none w-full border-b border-transparent focus:border-[hsl(var(--gold))]"
        />
        <div className="text-xs text-gold font-mono mt-0.5">{fmt(rowTotal)} {currency}</div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive transition-all ml-1"
      >
        <Icon name="X" size={13} />
      </button>
    </div>
  );
}
