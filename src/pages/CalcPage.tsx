import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { CalcRow, Unit } from '@/store/types';
import Icon from '@/components/ui/icon';

const UNITS: Unit[] = ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'];
const MESSENGERS = ['WhatsApp', 'Telegram', 'Viber', 'Звонок'] as const;

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function InlineEdit({
  value, onChange, className = '', placeholder = ''
}: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--gold))] outline-none transition-colors duration-150 ${className}`}
    />
  );
}

function NumEdit({
  value, onChange, className = ''
}: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className={`bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--gold))] outline-none transition-colors duration-150 font-mono text-right ${className}`}
    />
  );
}

export default function CalcPage() {
  const store = useStore();
  const project = store.getActiveProject();
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [showProjects, setShowProjects] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button
          onClick={() => store.createProject()}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={14} />
          Создать проект
        </button>
      </div>
    );
  }

  const totalMaterials = project.blocks.reduce((sum, block) =>
    sum + block.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const totalServices = project.serviceBlocks.reduce((sum, block) =>
    sum + block.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const total = totalMaterials + totalServices;

  const getMaterialSuggestions = () => store.materials;
  const getSupplierName = (id?: string) =>
    store.suppliers.find(s => s.id === id)?.name || '';

  const applyMaterial = (projectId: string, blockId: string, rowId: string, matId: string) => {
    const mat = store.materials.find(m => m.id === matId);
    if (!mat) return;
    const priceWithMarkup = store.calcPriceWithMarkup(mat.basePrice);
    store.updateRow(projectId, blockId, rowId, {
      materialId: mat.id,
      name: mat.name,
      supplierId: mat.supplierId,
      type: mat.type,
      color: mat.color,
      thickness: mat.thickness,
      unit: mat.unit,
      price: priceWithMarkup,
    });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header bar */}
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-2 text-[hsl(var(--text-dim))] hover:text-foreground transition-colors text-sm"
            >
              <Icon name="FolderOpen" size={14} />
              <span>Проекты</span>
              <Icon name="ChevronDown" size={12} />
            </button>
            {showProjects && (
              <div className="absolute top-16 left-56 z-50 bg-[hsl(220,14%,11%)] border border-border rounded shadow-xl min-w-64">
                {store.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      store.setState(s => ({ ...s, activeProjectId: p.id }));
                      setShowProjects(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[hsl(220,12%,16%)] transition-colors flex items-center justify-between ${
                      p.id === project.id ? 'text-gold' : 'text-foreground'
                    }`}
                  >
                    <span>{p.object || 'Без названия'}</span>
                    <span className="text-[hsl(var(--text-muted))] text-xs">{p.client}</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={() => { store.createProject(); setShowProjects(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gold hover:bg-[hsl(220,12%,16%)] flex items-center gap-2"
                  >
                    <Icon name="Plus" size={13} /> Новый проект
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого</div>
              <div className="text-gold font-mono font-semibold text-lg">{fmt(total)} {store.settings.currency}</div>
            </div>
          </div>
        </div>

        {/* Project info */}
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Клиент</label>
            <InlineEdit
              value={project.client}
              onChange={v => store.updateProjectInfo(project.id, { client: v })}
              placeholder="ФИО клиента"
              className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Изделие</label>
            <InlineEdit
              value={project.object}
              onChange={v => store.updateProjectInfo(project.id, { object: v })}
              placeholder="Название изделия"
              className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
          <div>
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Телефон</label>
            <InlineEdit
              value={project.phone}
              onChange={v => store.updateProjectInfo(project.id, { phone: v })}
              placeholder="+7 000 000-00-00"
              className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
          <div>
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Мессенджер</label>
            <select
              value={project.messenger}
              onChange={e => store.updateProjectInfo(project.id, { messenger: e.target.value as typeof project.messenger })}
              className="bg-transparent text-sm text-foreground border-b border-transparent focus:border-[hsl(var(--gold))] outline-none w-full"
            >
              {MESSENGERS.map(m => <option key={m} value={m} className="bg-[hsl(220,14%,11%)]">{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">Адрес</label>
            <InlineEdit
              value={project.address}
              onChange={v => store.updateProjectInfo(project.id, { address: v })}
              placeholder="Адрес объекта"
              className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {/* Material blocks */}
        {project.blocks.map(block => {
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
                      store.updateBlockName(project.id, block.id, editingBlockName || block.name);
                      setEditingBlock(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        store.updateBlockName(project.id, block.id, editingBlockName || block.name);
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
                    onClick={() => store.deleteBlock(project.id, block.id)}
                    className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr 0.8fr 28px' }}>
                <span>Наименование</span>
                <span>Производитель</span>
                <span>Тип</span>
                <span>Цвет</span>
                <span>Толщ, мм</span>
                <span>Ед. изм.</span>
                <span className="text-right">Кол-во</span>
                <span className="text-right">Цена</span>
                <span></span>
              </div>

              {block.rows.map(row => (
                <CalcRowComponent
                  key={row.id}
                  row={row}
                  projectId={project.id}
                  blockId={block.id}
                  currency={store.settings.currency}
                  materials={getMaterialSuggestions()}
                  getSupplierName={getSupplierName}
                  onUpdate={(data) => store.updateRow(project.id, block.id, row.id, data)}
                  onDelete={() => store.deleteRow(project.id, block.id, row.id)}
                  onApplyMaterial={(matId) => applyMaterial(project.id, block.id, row.id, matId)}
                />
              ))}

              <div className="px-4 py-2">
                <button
                  onClick={() => store.addRow(project.id, block.id)}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
                >
                  <Icon name="Plus" size={12} /> Добавить строку
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => store.addBlock(project.id)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
        >
          <Icon name="Plus" size={14} /> Добавить блок материалов
        </button>

        {/* Summary */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4 mt-6">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Итоговая сводка</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--text-dim))]">Материалы</span>
              <span className="font-mono">{fmt(totalMaterials)} {store.settings.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--text-dim))]">Услуги</span>
              <span className="font-mono">{fmt(totalServices)} {store.settings.currency}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-base font-semibold">
              <span>Итого</span>
              <span className="font-mono text-gold">{fmt(total)} {store.settings.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcRowComponent({ row, currency, materials, getSupplierName, onUpdate, onDelete, onApplyMaterial }: {
  row: CalcRow;
  projectId: string;
  blockId: string;
  currency: string;
  materials: ReturnType<typeof useStore>['materials'];
  getSupplierName: (id?: string) => string;
  onUpdate: (data: Partial<CalcRow>) => void;
  onDelete: () => void;
  onApplyMaterial: (matId: string) => void;
}) {
  const [showSuggest, setShowSuggest] = useState(false);
  const [nameFilter, setNameFilter] = useState(row.name);
  const rowTotal = row.qty * row.price;

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
    m.type.toLowerCase().includes(nameFilter.toLowerCase()) ||
    (m.color || '').toLowerCase().includes(nameFilter.toLowerCase())
  );

  return (
    <div className="relative grid items-center px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] transition-colors group"
      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr 0.8fr 28px' }}>

      <div className="relative pr-2">
        <input
          value={nameFilter}
          onChange={e => { setNameFilter(e.target.value); onUpdate({ name: e.target.value }); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Наименование..."
          className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
        />
        {showSuggest && filtered.length > 0 && (
          <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-72 max-h-48 overflow-auto scrollbar-thin">
            {filtered.slice(0, 8).map(m => (
              <button
                key={m.id}
                onMouseDown={() => {
                  onApplyMaterial(m.id);
                  setNameFilter(m.name);
                  setShowSuggest(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex justify-between items-center"
              >
                <span className="text-foreground">{m.name}</span>
                <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{m.basePrice.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{getSupplierName(row.supplierId)}</div>
      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.type || '—'}</div>
      <div className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.color || '—'}</div>
      <div className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>

      <select
        value={row.unit}
        onChange={e => onUpdate({ unit: e.target.value as Unit })}
        className="bg-transparent text-xs text-[hsl(var(--text-dim))] border-0 outline-none"
      >
        {(['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'] as Unit[]).map(u => (
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
