import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { SavedBlock, CalcColumnKey } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS_SHORT, COLUMN_ALIGN, COLUMN_WIDTHS, COLUMN_LABELS, fmt } from './calc/constants';
import CalcRowComponent from './calc/CalcRowComponent';
import CalcBlockSettings from './calc/CalcBlockSettings';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

// Виртуальный projectId — чтобы переиспользовать CalcRowComponent через store.
// Храним SavedBlock в AppState.savedBlocks, а CalcRowComponent работает через projectId + blockId.
// Решение: передаём специальный projectId '__saved__', CalcRowComponent сам дёрнет store.updateRow.
// Но CalcRowComponent ожидает projectId+blockId -> updateRow(projectId, blockId, rowId, data).
// Нам нужно переопределить поведение — используем обёртку SavedBlockEditor.

interface SavedBlockEditorProps {
  block: SavedBlock;
  currency: string;
  onOpenSettings: () => void;
  onDelete: () => void;
}

function SavedBlockEditor({ block, currency, onOpenSettings, onDelete }: SavedBlockEditorProps) {
  const store = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(block.name);

  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0 ? block.visibleColumns : ALL_COLS;
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');
  const blockTotal = block.rows.reduce((s, r) => s + r.qty * r.price, 0);

  const finishEditName = () => {
    store.updateSavedBlock(block.id, { name: nameVal || block.name });
    setEditingName(false);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220,16%,14%)] border-b-2 border-[hsl(var(--gold))]/30">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={finishEditName}
              onKeyDown={e => { if (e.key === 'Enter') finishEditName(); }}
              className="bg-transparent border-b border-gold outline-none text-sm font-semibold"
            />
          ) : (
            <button
              onClick={() => { setNameVal(block.name); setEditingName(true); }}
              className="text-sm font-semibold hover:text-gold transition-colors flex items-center gap-1.5 uppercase tracking-wide"
            >
              {block.name}
              <Icon name="Pencil" size={10} className="opacity-30" />
            </button>
          )}

          {block.allowedTypeIds.length > 0 && (
            <div className="flex gap-1 ml-1 flex-wrap">
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
          <span className="text-gold text-sm font-mono font-semibold">{fmt(blockTotal)} {currency}</span>
          <button onClick={onOpenSettings} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5" title="Настройки">
            <Icon name="SlidersHorizontal" size={13} />
          </button>
          <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-1.5 bg-[hsl(220,14%,10%)] border-b border-border select-none"
        style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
      >
        {visibleCols.map(col => (
          <span
            key={col}
            className={`truncate overflow-hidden ${
              COLUMN_ALIGN[col] === 'right'  ? 'text-right'  :
              COLUMN_ALIGN[col] === 'center' ? 'text-center' : ''
            }`}
            title={COLUMN_LABELS_SHORT[col]}
          >
            {COLUMN_LABELS_SHORT[col]}
          </span>
        ))}
        <span />
      </div>

      {/* Rows */}
      <div className="bg-[hsl(220,13%,12%)]">
        {block.rows.map(row => (
          <SavedBlockRow
            key={row.id}
            block={block}
            rowId={row.id}
            visibleCols={visibleCols}
            gridCols={gridCols}
            currency={currency}
          />
        ))}
        <div className="px-4 py-2 border-t border-[hsl(220,12%,14%)]">
          <button
            onClick={() => store.addSavedBlockRow(block.id)}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          >
            <Icon name="Plus" size={12} /> Добавить строку
          </button>
        </div>
      </div>
    </div>
  );
}

// Переиспользуем CalcRowComponent через временный проект-прокси.
// Проще — рендерим CalcRowComponent с фиктивным projectId и переопределяем store-функции
// через обёртку. Но CalcRowComponent вызывает store напрямую.
// Чище: инлайн-строка для savedBlock, копирующая логику CalcRowComponent.
interface SavedBlockRowProps {
  block: SavedBlock;
  rowId: string;
  visibleCols: CalcColumnKey[];
  gridCols: string;
  currency: string;
}

function SavedBlockRow({ block, rowId, visibleCols, gridCols, currency }: SavedBlockRowProps) {
  const store = useStore();
  const row = block.rows.find(r => r.id === rowId);
  if (!row) return null;

  const allMaterials = store.materials;
  const filtered = block.allowedTypeIds.length > 0
    ? allMaterials.filter(m => block.allowedTypeIds.includes(m.typeId))
    : allMaterials;

  const upd = (data: Parameters<typeof store.updateSavedBlockRow>[2]) =>
    store.updateSavedBlockRow(block.id, rowId, data);

  const selectMaterial = (matId: string) => {
    const mat = allMaterials.find(m => m.id === matId);
    if (!mat) return;
    upd({
      materialId: mat.id,
      name: mat.name,
      manufacturerId: mat.manufacturerId,
      vendorId: mat.vendorId,
      typeId: mat.typeId,
      color: mat.color,
      article: mat.article,
      thickness: mat.thickness,
      unit: mat.unit,
      basePrice: mat.basePrice,
      price: store.calcPriceWithMarkup(mat.basePrice, 'materials'),
    });
  };

  return (
    <div
      className="px-4 py-1.5 border-b border-[hsl(220,12%,14%)] last:border-0 hover:bg-[hsl(220,12%,14%)] transition-colors group"
      style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', gap: '4px' }}
    >
      {visibleCols.map(col => {
        switch (col) {
          case 'material':
            return (
              <div key={col} className="relative min-w-0">
                {row.materialId ? (
                  <div className="flex items-center gap-1 min-w-0">
                    {row.typeId && (() => { const t = store.getTypeById(row.typeId); return t ? <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} /> : null; })()}
                    <span className="text-sm truncate">{row.name || '—'}</span>
                    <button onClick={() => upd({ materialId: undefined, name: '' })} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-destructive shrink-0">
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={e => selectMaterial(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none text-[hsl(var(--text-muted))] cursor-pointer"
                  >
                    <option value="">— выбрать —</option>
                    {filtered.map(m => (
                      <option key={m.id} value={m.id}>{m.name}{m.thickness ? ` ${m.thickness}мм` : ''}{m.color ? ` ${m.color}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          case 'manufacturer':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{store.getManufacturerById(row.manufacturerId)?.name || '—'}</div>;
          case 'vendor':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{store.getVendorById(row.vendorId)?.name || '—'}</div>;
          case 'article':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{row.article || '—'}</div>;
          case 'color':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] truncate">{row.color || '—'}</div>;
          case 'thickness':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.thickness ? `${row.thickness}` : '—'}</div>;
          case 'unit':
            return <div key={col} className="text-xs text-[hsl(var(--text-dim))] text-center">{row.unit || '—'}</div>;
          case 'qty':
            return (
              <div key={col} className="flex items-center justify-between gap-1">
                <button
                  tabIndex={-1}
                  onClick={() => upd({ qty: Math.max(0, (row.qty || 0) - 1) })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >−</button>
                <input
                  type="number"
                  value={row.qty || ''}
                  onChange={e => upd({ qty: parseFloat(e.target.value) || 0 })}
                  className="bg-transparent text-sm font-mono text-center outline-none border-b border-transparent focus:border-[hsl(var(--gold))] w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  tabIndex={-1}
                  onClick={() => upd({ qty: (row.qty || 0) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0 text-xs leading-none"
                >+</button>
              </div>
            );
          case 'baseprice':
            return (
              <input
                key={col}
                type="number"
                value={row.basePrice ?? ''}
                onChange={e => upd({ basePrice: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right w-full outline-none border-b border-transparent focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            );
          case 'price':
            return (
              <input
                key={col}
                type="number"
                value={row.price || ''}
                onChange={e => upd({ price: parseFloat(e.target.value) || 0 })}
                className="bg-transparent text-sm font-mono text-right w-full outline-none border-b border-transparent focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            );
          case 'total':
            return <div key={col} className="text-sm font-mono text-right text-gold">{fmt(row.qty * row.price)}</div>;
          default:
            return <div key={col} />;
        }
      })}
      <button
        onClick={() => store.deleteSavedBlockRow(block.id, rowId)}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-destructive transition-all"
      >
        <Icon name="Trash2" size={13} />
      </button>
    </div>
  );
}

// Адаптер CalcBlockSettings для SavedBlock
interface SavedBlockSettingsProps {
  block: SavedBlock;
  onClose: () => void;
}

function SavedBlockSettingsPanel({ block, onClose }: SavedBlockSettingsProps) {
  const store = useStore();
  const [visible, setVisible] = useState<CalcColumnKey[]>(
    block.visibleColumns.length > 0 ? [...block.visibleColumns] : ALL_COLS
  );

  const hidden = ALL_COLS.filter(c => !visible.includes(c));
  const allTypes = store.settings.materialTypes;

  const saveVisible = (next: CalcColumnKey[]) => {
    setVisible(next);
    store.updateSavedBlock(block.id, { visibleColumns: next });
  };

  const addCol = (col: CalcColumnKey) => {
    if (visible.includes(col)) return;
    saveVisible([...visible, col]);
  };

  const removeCol = (col: CalcColumnKey) => {
    if (visible.length <= 2) return;
    saveVisible(visible.filter(c => c !== col));
  };

  const toggleType = (typeId: string) => {
    const cur = block.allowedTypeIds;
    const next = cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId];
    store.updateSavedBlock(block.id, { allowedTypeIds: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="font-semibold text-sm">Настройки блока «{block.name}»</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin px-5 py-4 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Видимые столбцы</div>
            <div className="flex flex-col gap-1.5">
              {visible.map(col => (
                <div key={col} className="flex items-center justify-between px-3 py-2 bg-[hsl(38,40%,18%)] border border-[hsl(38,40%,28%)] rounded text-sm text-gold">
                  <span>{COLUMN_LABELS[col]}</span>
                  <button onClick={() => removeCol(col)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"><Icon name="X" size={12} /></button>
                </div>
              ))}
            </div>
            {hidden.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Нажми чтобы добавить:</div>
                <div className="flex flex-wrap gap-1.5">
                  {hidden.map(col => (
                    <button key={col} onClick={() => addCol(col)} className="flex items-center gap-1 px-2.5 py-1 bg-[hsl(220,12%,16%)] border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold transition-colors">
                      <Icon name="Plus" size={10} />{COLUMN_LABELS[col]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Типы материалов</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Если не выбрано — все типы</div>
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${block.allowedTypeIds.includes(t.id) ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,20%)]'}`}
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

export default function BlocksPage() {
  const store = useStore();
  const savedBlocks = store.savedBlocks || [];
  const [selectedId, setSelectedId] = useState<string | null>(savedBlocks[0]?.id ?? null);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const selected = savedBlocks.find(b => b.id === selectedId) ?? null;
  const currency = store.settings.currency;
  const activeProjectId = store.activeProjectId;

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = store.createSavedBlock(newName.trim());
    setSelectedId(id);
    setNewName('');
    setShowNewForm(false);
  };

  const handleInsertToProject = (block: SavedBlock) => {
    if (!activeProjectId) return;
    store.insertSavedBlockToProject(activeProjectId, block.id);
  };

  return (
    <div className="flex h-full">
      {/* Левая панель — список блоков */}
      <div className="w-56 shrink-0 border-r border-border bg-[hsl(220,16%,7%)] flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">Блоки</span>
          <button
            onClick={() => setShowNewForm(v => !v)}
            className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            title="Новый блок"
          >
            <Icon name="Plus" size={15} />
          </button>
        </div>

        {showNewForm && (
          <div className="px-3 py-2 border-b border-border flex gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false); }}
              placeholder="Название блока"
              className="flex-1 bg-[hsl(220,12%,14%)] border border-border rounded px-2 py-1 text-xs outline-none focus:border-gold"
            />
            <button onClick={handleCreate} className="px-2 py-1 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-semibold">
              OK
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto scrollbar-thin py-1">
          {savedBlocks.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[hsl(var(--text-muted))] opacity-60">
              Нет блоков.<br />Нажми + чтобы создать
            </div>
          ) : (
            savedBlocks.map(block => (
              <button
                key={block.id}
                onClick={() => setSelectedId(block.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center gap-2 ${
                  selectedId === block.id
                    ? 'text-gold bg-[hsl(220,12%,14%)] border-r-2 border-gold'
                    : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,12%)]'
                }`}
              >
                <Icon name="Layers" size={13} className="shrink-0 opacity-60" />
                <span className="truncate font-medium">{block.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Правая панель — редактор */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Icon name="Layers" size={40} className="text-[hsl(var(--text-muted))] opacity-20" />
            <div className="text-sm text-[hsl(var(--text-muted))]">Выбери блок слева или создай новый</div>
          </div>
        ) : (
          <>
            {/* Шапка редактора */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-[hsl(220,14%,9%)] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{selected.name}</span>
                {selected.note && <span className="text-xs text-[hsl(var(--text-muted))]">{selected.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                {activeProjectId ? (
                  <button
                    onClick={() => handleInsertToProject(selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                    title="Добавить в текущий проект расчёта"
                  >
                    <Icon name="FolderInput" size={13} />
                    В проект
                  </button>
                ) : (
                  <span className="text-xs text-[hsl(var(--text-muted))]">Нет активного проекта</span>
                )}
                <button
                  onClick={() => store.deleteSavedBlock(selected.id)}
                  className="p-1.5 text-[hsl(var(--text-muted))] hover:text-destructive transition-colors"
                  title="Удалить блок"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-auto scrollbar-thin p-6">
              <SavedBlockEditor
                block={selected}
                currency={currency}
                onOpenSettings={() => setSettingsBlockId(selected.id)}
                onDelete={() => {
                  store.deleteSavedBlock(selected.id);
                  setSelectedId(savedBlocks.find(b => b.id !== selected.id)?.id ?? null);
                }}
              />
            </div>
          </>
        )}
      </div>

      {settingsBlockId && (() => {
        const b = savedBlocks.find(x => x.id === settingsBlockId);
        return b ? <SavedBlockSettingsPanel block={b} onClose={() => setSettingsBlockId(null)} /> : null;
      })()}
    </div>
  );
}
