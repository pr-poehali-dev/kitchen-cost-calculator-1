import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { SavedBlock, CalcColumnKey, BlockAssembly } from '@/store/types';
import Icon from '@/components/ui/icon';
import { COLUMN_LABELS_SHORT, COLUMN_ALIGN, COLUMN_WIDTHS, fmt } from '../calc/constants';
import SavedBlockRow from './SavedBlockRow';

const ALL_COLS: CalcColumnKey[] = ['material', 'manufacturer', 'vendor', 'article', 'color', 'thickness', 'unit', 'qty', 'baseprice', 'price', 'total'];

interface Props {
  block: SavedBlock;
  currency: string;
  onOpenSettings: () => void;
  onDelete: () => void;
}

function AssemblyEditor({ block, assembly, currency, visibleCols, gridCols, onDeleteAssembly }: {
  block: SavedBlock;
  assembly: BlockAssembly;
  currency: string;
  visibleCols: CalcColumnKey[];
  gridCols: string;
  onDeleteAssembly: () => void;
}) {
  const store = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(assembly.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const assemblyTotal = assembly.rows.reduce((s, r) => s + r.qty * r.price, 0);

  const finishEditName = () => {
    store.updateAssembly(block.id, assembly.id, { name: editName || assembly.name });
    setEditName(editName || assembly.name);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3">
      {/* Заголовок сборки */}
      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(220,14%,13%)] border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="Package" size={12} className="text-[hsl(var(--text-muted))] shrink-0" />
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={finishEditName}
              onKeyDown={e => { if (e.key === 'Enter') { finishEditName(); } }}
              className="bg-transparent border-b border-gold outline-none text-sm font-medium text-foreground"
            />
          ) : (
            <span className="text-sm font-medium text-foreground truncate">{assembly.name}</span>
          )}
          <span className="text-xs text-gold font-mono shrink-0">{fmt(assemblyTotal)} {currency}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isEditing ? (
            <button
              onClick={() => { setEditName(assembly.name); setIsEditing(true); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[hsl(var(--text-muted))] hover:text-foreground border border-border rounded transition-colors"
            >
              <Icon name="Pencil" size={11} /> Редактировать
            </button>
          ) : (
            <button
              onClick={() => { finishEditName(); setIsEditing(false); }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gold text-[hsl(220,16%,8%)] rounded font-medium"
            >
              <Icon name="Check" size={11} /> Сохранить
            </button>
          )}
          {isEditing && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-[hsl(var(--text-muted))]">Удалить?</span>
                <button onClick={onDeleteAssembly} className="px-2 py-1 text-xs bg-destructive text-white rounded">Да</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs border border-border rounded text-[hsl(var(--text-dim))]">Нет</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors p-1">
                <Icon name="Trash2" size={12} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Строки сборки */}
      <div className="bg-[hsl(220,13%,12%)]">
        {/* Заголовки колонок */}
        <div
          className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-1.5 border-b border-border select-none"
          style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
        >
          {visibleCols.map(col => (
            <span key={col} className={`truncate ${COLUMN_ALIGN[col] === 'right' ? 'text-right' : COLUMN_ALIGN[col] === 'center' ? 'text-center' : ''}`}>
              {COLUMN_LABELS_SHORT[col]}
            </span>
          ))}
          <span />
        </div>

        {assembly.rows.map(row => (
          <SavedBlockRow
            key={row.id}
            block={block}
            rowId={row.id}
            visibleCols={visibleCols}
            gridCols={gridCols}
            currency={currency}
            assemblyId={assembly.id}
          />
        ))}
        <div className="px-4 py-2 border-t border-[hsl(220,12%,14%)]">
          <button
            onClick={() => store.addAssemblyRow(block.id, assembly.id)}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          >
            <Icon name="Plus" size={12} /> Добавить строку
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SavedBlockEditor({ block, currency, onOpenSettings, onDelete }: Props) {
  const store = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(block.name);
  const [newAssemblyName, setNewAssemblyName] = useState('');
  const [showNewAssemblyForm, setShowNewAssemblyForm] = useState(false);

  const visibleCols: CalcColumnKey[] = block.visibleColumns.length > 0 ? block.visibleColumns : ALL_COLS;
  const gridCols = [...visibleCols.map(c => COLUMN_WIDTHS[c]), '28px'].join(' ');
  const assemblies = block.assemblies || [];

  const finishEditName = () => {
    store.updateSavedBlock(block.id, { name: nameVal || block.name });
    setEditingName(false);
  };

  const handleAddAssembly = () => {
    if (!newAssemblyName.trim()) return;
    store.addAssembly(block.id, newAssemblyName.trim());
    setNewAssemblyName('');
    setShowNewAssemblyForm(false);
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

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onOpenSettings} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors p-0.5" title="Настройки">
            <Icon name="SlidersHorizontal" size={13} />
          </button>
          <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
            <Icon name="Trash2" size={13} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-0 bg-[hsl(220,13%,11%)]">
        {/* Сборки */}
        {assemblies.length > 0 && assemblies.map(assembly => (
          <AssemblyEditor
            key={assembly.id}
            block={block}
            assembly={assembly}
            currency={currency}
            visibleCols={visibleCols}
            gridCols={gridCols}
            onDeleteAssembly={() => store.deleteAssembly(block.id, assembly.id)}
          />
        ))}

        {/* Базовые строки (если нет сборок) */}
        {assemblies.length === 0 && (
          <div className="border border-border rounded-lg overflow-hidden mb-3">
            <div
              className="text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-1.5 bg-[hsl(220,14%,10%)] border-b border-border select-none"
              style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
            >
              {visibleCols.map(col => (
                <span key={col} className={`truncate ${COLUMN_ALIGN[col] === 'right' ? 'text-right' : COLUMN_ALIGN[col] === 'center' ? 'text-center' : ''}`}>
                  {COLUMN_LABELS_SHORT[col]}
                </span>
              ))}
              <span />
            </div>
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
        )}

        {/* Кнопка добавления сборки */}
        {showNewAssemblyForm ? (
          <div className="flex gap-2 pt-1">
            <input
              autoFocus
              value={newAssemblyName}
              onChange={e => setNewAssemblyName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddAssembly(); if (e.key === 'Escape') setShowNewAssemblyForm(false); }}
              placeholder="Название сборки (напр. Эконом, Премиум)"
              className="flex-1 bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-gold"
            />
            <button onClick={handleAddAssembly} className="px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium">OK</button>
            <button onClick={() => setShowNewAssemblyForm(false)} className="px-3 py-1.5 border border-border rounded text-sm text-[hsl(var(--text-dim))]">Отмена</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewAssemblyForm(true)}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors pt-1"
          >
            <Icon name="Plus" size={12} /> Добавить сборку
          </button>
        )}
      </div>
    </div>
  );
}
