import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { CalcRow, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';

const MESSENGERS = ['WhatsApp', 'Telegram', 'Viber', 'Звонок'] as const;

const fmt = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const COLUMN_LABELS: Record<CalcColumnKey, string> = {
  material: 'Материал',
  supplier: 'Производитель',
  article: 'Артикул',
  color: 'Цвет',
  thickness: 'Толщина',
  unit: 'Ед. изм.',
  qty: 'Кол-во',
  price: 'Цена',
};

const COLUMN_WIDTHS: Record<CalcColumnKey, string> = {
  material: '2fr',
  supplier: '1fr',
  article: '0.8fr',
  color: '1fr',
  thickness: '0.6fr',
  unit: '0.6fr',
  qty: '0.7fr',
  price: '1fr',
};

function InlineEdit({ value, onChange, placeholder = '', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--gold))] outline-none transition-colors duration-150 ${className}`}
    />
  );
}

function BlockSettings({ blockId, projectId, onClose }: { blockId: string; projectId: string; onClose: () => void }) {
  const store = useStore();
  const project = store.projects.find(p => p.id === projectId);
  const block = project?.blocks.find(b => b.id === blockId);
  if (!block) return null;

  const allTypes = store.settings.materialTypes;
  const allCols: CalcColumnKey[] = ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'];

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateBlock(projectId, blockId, { allowedTypeIds: next });
  };

  const toggleCol = (col: CalcColumnKey) => {
    const cur = block.visibleColumns;
    if (cur.includes(col) && cur.length <= 2) return;
    const next = cur.includes(col) ? cur.filter(x => x !== col) : [...cur, col];
    store.updateBlock(projectId, blockId, { visibleColumns: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2.5">Отображаемые столбцы</div>
            <div className="grid grid-cols-2 gap-1.5">
              {allCols.map(col => (
                <button
                  key={col}
                  onClick={() => toggleCol(col)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors text-left ${
                    block.visibleColumns.includes(col)
                      ? 'bg-[hsl(38,40%,20%)] text-gold border border-[hsl(38,40%,30%)]'
                      : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] border border-transparent hover:border-border'
                  }`}
                >
                  <Icon name={block.visibleColumns.includes(col) ? 'CheckSquare' : 'Square'} size={13} />
                  {COLUMN_LABELS[col]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Разрешённые типы материалов</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2.5">Если не выбрано — доступны все типы</div>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    block.allowedTypeIds.includes(t.id)
                      ? 'text-[hsl(220,16%,8%)]'
                      : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'
                  }`}
                  style={block.allowedTypeIds.includes(t.id) ? { backgroundColor: t.color || '#c8a96e' } : {}}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcRowComponent({ row, projectId, blockId, visibleColumns, currency, allowedTypeIds, onDelete }: {
  row: CalcRow;
  projectId: string;
  blockId: string;
  visibleColumns: CalcColumnKey[];
  currency: string;
  allowedTypeIds: string[];
  onDelete: () => void;
}) {
  const store = useStore();
  const [showSuggest, setShowSuggest] = useState(false);
  const [nameFilter, setNameFilter] = useState(row.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameFilter(row.name); }, [row.name]);

  const rowTotal = row.qty * row.price;

  const filteredMaterials = store.materials.filter(m => {
    const typeOk = allowedTypeIds.length === 0 || allowedTypeIds.includes(m.typeId);
    const textOk = nameFilter === '' ||
      m.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      (m.color || '').toLowerCase().includes(nameFilter.toLowerCase()) ||
      (m.article || '').toLowerCase().includes(nameFilter.toLowerCase());
    return typeOk && textOk;
  });

  const applyMaterial = (matId: string) => {
    const mat = store.materials.find(m => m.id === matId);
    if (!mat) return;
    const price = store.calcPriceWithMarkup(mat.basePrice, 'materials');
    store.updateRow(projectId, blockId, row.id, {
      materialId: mat.id,
      name: mat.name,
      supplierId: mat.supplierId,
      typeId: mat.typeId,
      color: mat.color,
      article: mat.article,
      thickness: mat.thickness,
      unit: mat.unit,
      price,
    });
    setNameFilter(mat.name);
    setShowSuggest(false);
  };

  const gridCols = [...visibleColumns.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');

  return (
    <div
      className="relative group border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] transition-colors"
      style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', padding: '6px 16px' }}
    >
      {visibleColumns.map(col => {
        switch (col) {
          case 'material':
            return (
              <div key={col} className="relative pr-2">
                <input
                  ref={inputRef}
                  value={nameFilter}
                  onChange={e => { setNameFilter(e.target.value); store.updateRow(projectId, blockId, row.id, { name: e.target.value, materialId: undefined }); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 160)}
                  placeholder="Выбрать материал..."
                  className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-[hsl(var(--text-muted))] border-b border-transparent focus:border-[hsl(var(--gold))]"
                />
                {showSuggest && filteredMaterials.length > 0 && (
                  <div className="absolute left-0 top-full z-50 bg-[hsl(220,16%,10%)] border border-border rounded shadow-xl w-80 max-h-52 overflow-auto scrollbar-thin">
                    {filteredMaterials.slice(0, 10).map(m => {
                      const t = store.getTypeById(m.typeId);
                      const sup = store.suppliers.find(s => s.id === m.supplierId);
                      return (
                        <button
                          key={m.id}
                          onMouseDown={() => applyMaterial(m.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,16%)] flex items-center gap-3"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: t?.color || '#888' }}
                          />
                          <span className="flex-1 text-foreground truncate">{m.name}</span>
                          <span className="text-[hsl(var(--text-muted))] text-xs shrink-0">{sup?.name}</span>
                          <span className="text-gold text-xs font-mono shrink-0">{store.calcPriceWithMarkup(m.basePrice).toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          case 'supplier': {
            const sup = store.suppliers.find(s => s.id === row.supplierId);
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{sup?.name || '—'}</div>;
          }
          case 'article':
            return (
              <div key={col} className="pr-1">
                <input
                  value={row.article || ''}
                  onChange={e => store.updateRow(projectId, blockId, row.id, { article: e.target.value })}
                  placeholder="—"
                  className="bg-transparent text-xs text-[hsl(var(--text-dim))] w-full outline-none border-b border-transparent focus:border-[hsl(var(--gold))] placeholder:text-[hsl(var(--text-muted))]"
                />
              </div>
            );
          case 'color':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate pr-2">{row.color || '—'}</div>;
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return (
              <select
                key={col}
                value={row.unit}
                onChange={e => store.updateRow(projectId, blockId, row.id, { unit: e.target.value })}
                className="bg-transparent text-xs text-[hsl(var(--text-dim))] border-0 outline-none w-full"
              >
                {store.settings.units.map(u => (
                  <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
                ))}
              </select>
            );
          case 'qty':
            return (
              <input
                key={col}
                type="number"
                value={row.qty || ''}
                onChange={e => store.updateRow(projectId, blockId, row.id, { qty: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right outline-none w-full border-b border-transparent focus:border-[hsl(var(--gold))] pr-1"
              />
            );
          case 'price':
            return (
              <div key={col} className="text-right pr-1">
                <div className="text-sm font-mono text-foreground">{row.price > 0 ? row.price.toLocaleString() : '—'}</div>
                <div className="text-xs text-gold font-mono mt-0.5">{row.price > 0 && row.qty > 0 ? fmt(rowTotal) + ' ' + currency : ''}</div>
              </div>
            );
          default:
            return null;
        }
      })}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive transition-all ml-1"
      >
        <Icon name="X" size={13} />
      </button>
    </div>
  );
}

export default function CalcPage() {
  const store = useStore();
  const project = store.getActiveProject();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [blockSettingsId, setBlockSettingsId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button
          onClick={() => store.createProject()}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90"
        >
          <Icon name="Plus" size={14} /> Создать проект
        </button>
      </div>
    );
  }

  const totalMaterials = project.blocks.reduce((sum, b) =>
    sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const totalServices = project.serviceBlocks.reduce((sum, b) =>
    sum + b.rows.reduce((s, r) => s + r.qty * r.price, 0), 0
  );
  const total = totalMaterials + totalServices;

  return (
    <div className="flex flex-col h-full animate-fade-in" onClick={() => setShowProjects(false)}>
      {/* Header */}
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="flex items-center gap-2 text-[hsl(var(--text-dim))] hover:text-foreground transition-colors text-sm"
            >
              <Icon name="FolderOpen" size={14} />
              <span className="font-medium">{project.object || 'Проект'}</span>
              <Icon name="ChevronDown" size={12} />
            </button>
            {showProjects && (
              <div className="absolute top-8 left-0 z-50 bg-[hsl(220,14%,11%)] border border-border rounded shadow-xl min-w-64">
                {store.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { store.setState(s => ({ ...s, activeProjectId: p.id })); setShowProjects(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[hsl(220,12%,16%)] flex items-center justify-between ${p.id === project.id ? 'text-gold' : 'text-foreground'}`}
                  >
                    <span>{p.object || 'Без названия'}</span>
                    <span className="text-[hsl(var(--text-muted))] text-xs ml-4">{p.client}</span>
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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[hsl(var(--text-muted))]">Материалы: <span className="font-mono text-foreground">{fmt(totalMaterials)}</span></span>
              <span className="text-[hsl(var(--border))]">·</span>
              <span className="text-[hsl(var(--text-muted))]">Услуги: <span className="font-mono text-foreground">{fmt(totalServices)}</span></span>
            </div>
            <div className="text-right">
              <div className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">Итого</div>
              <div className="text-gold font-mono font-semibold text-lg">{fmt(total)} {store.settings.currency}</div>
            </div>
          </div>
        </div>

        {/* Project info */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Клиент', key: 'client' as const, placeholder: 'ФИО клиента' },
            { label: 'Изделие', key: 'object' as const, placeholder: 'Название изделия', colSpan: 2 },
            { label: 'Телефон', key: 'phone' as const, placeholder: '+7 000 000-00-00' },
            { label: 'Адрес', key: 'address' as const, placeholder: 'Адрес объекта' },
          ].map(f => (
            <div key={f.key} className={f.colSpan ? `col-span-${f.colSpan}` : ''}>
              <label className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider block mb-1">{f.label}</label>
              <InlineEdit
                value={project[f.key]}
                onChange={v => store.updateProjectInfo(project.id, { [f.key]: v })}
                placeholder={f.placeholder}
                className="text-sm text-foreground w-full placeholder:text-[hsl(var(--text-muted))]"
              />
            </div>
          ))}
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
        </div>
      </div>

      {/* Blocks */}
      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        {project.blocks.map(block => {
          const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);
          const visibleCols = block.visibleColumns.length > 0
            ? block.visibleColumns
            : ['material', 'supplier', 'article', 'color', 'thickness', 'unit', 'qty', 'price'] as CalcColumnKey[];
          const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');

          return (
            <div key={block.id} className="bg-[hsl(220,14%,11%)] rounded border border-border">
              {/* Block header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  {editingBlockId === block.id ? (
                    <input
                      autoFocus
                      value={editingBlockName}
                      onChange={e => setEditingBlockName(e.target.value)}
                      onBlur={() => { store.updateBlock(project.id, block.id, { name: editingBlockName || block.name }); setEditingBlockId(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { store.updateBlock(project.id, block.id, { name: editingBlockName || block.name }); setEditingBlockId(null); } }}
                      className="bg-transparent border-b border-gold outline-none text-sm font-semibold"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingBlockId(block.id); setEditingBlockName(block.name); }}
                      className="text-sm font-semibold hover:text-gold transition-colors flex items-center gap-1.5"
                    >
                      {block.name}
                      <Icon name="Pencil" size={11} className="opacity-40" />
                    </button>
                  )}

                  {/* Type pills */}
                  {block.allowedTypeIds.length > 0 && (
                    <div className="flex gap-1 ml-2 flex-wrap">
                      {block.allowedTypeIds.map(tid => {
                        const t = store.getTypeById(tid);
                        return t ? (
                          <span key={tid} className="text-xs px-1.5 py-0.5 rounded text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>
                            {t.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[hsl(var(--text-muted))] text-xs font-mono">{fmt(blockTotal)} {store.settings.currency}</span>
                  <button
                    onClick={() => setBlockSettingsId(block.id)}
                    className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5"
                    title="Настройки блока"
                  >
                    <Icon name="SlidersHorizontal" size={13} />
                  </button>
                  <button
                    onClick={() => store.deleteBlock(project.id, block.id)}
                    className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                  >
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>

              {/* Column header */}
              <div
                className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2 border-b border-border"
                style={{ display: 'grid', gridTemplateColumns: gridCols }}
              >
                {visibleCols.map(col => (
                  <span key={col} className={col === 'qty' || col === 'price' ? 'text-right' : ''}>
                    {COLUMN_LABELS[col]}
                  </span>
                ))}
                <span />
              </div>

              {/* Rows */}
              {block.rows.map(row => (
                <CalcRowComponent
                  key={row.id}
                  row={row}
                  projectId={project.id}
                  blockId={block.id}
                  visibleColumns={visibleCols}
                  currency={store.settings.currency}
                  allowedTypeIds={block.allowedTypeIds}
                  onDelete={() => store.deleteRow(project.id, block.id, row.id)}
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
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-4">
          <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Итоговая сводка</div>
          <div className="space-y-2">
            {project.blocks.map(b => {
              const bt = b.rows.reduce((s, r) => s + r.qty * r.price, 0);
              return bt > 0 ? (
                <div key={b.id} className="flex justify-between text-sm text-[hsl(var(--text-dim))]">
                  <span>{b.name}</span>
                  <span className="font-mono">{fmt(bt)} {store.settings.currency}</span>
                </div>
              ) : null;
            })}
            <div className="flex justify-between text-sm text-[hsl(var(--text-dim))] border-t border-border pt-2">
              <span>Услуги</span>
              <span className="font-mono">{fmt(totalServices)} {store.settings.currency}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
              <span>Итого</span>
              <span className="font-mono text-gold">{fmt(total)} {store.settings.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {blockSettingsId && (
        <BlockSettings
          blockId={blockSettingsId}
          projectId={project.id}
          onClose={() => setBlockSettingsId(null)}
        />
      )}
    </div>
  );
}
