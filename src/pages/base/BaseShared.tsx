import { useState } from 'react';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { useStore } from '@/store/useStore';

export const fmt = (n: number) => n.toLocaleString('ru-RU');

export function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
        {label}{required && <span className="text-gold ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-2 sm:mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)] z-10">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-4 sm:px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function getPriceAgeDays(priceUpdatedAt?: string): number | null {
  if (!priceUpdatedAt) return null;
  const d = new Date(priceUpdatedAt);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export function MaterialRow({ material, onEdit, onDelete }: {
  material: Material; onEdit: () => void; onDelete: () => void; currency?: string;
}) {
  const store = useStore();
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceVal, setPriceVal] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPriceVal(String(material.basePrice));
    setEditingPrice(true);
  };

  const commitPrice = () => {
    const v = parseFloat(priceVal);
    if (!isNaN(v) && v >= 0 && v !== material.basePrice) {
      store.updateMaterial(material.id, { basePrice: v });
    }
    setEditingPrice(false);
  };

  const ageDays = getPriceAgeDays(material.priceUpdatedAt);
  const isStale = ageDays !== null && ageDays >= 30;
  const isVeryStale = ageDays !== null && ageDays >= 90;

  return (
    <>
      <div
        className={`grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] transition-colors text-sm group ${
          material.archived ? 'opacity-40 bg-[hsl(220,12%,10%)]' : 'hover:bg-[hsl(220,12%,12%)]'
        }`}
        style={{ gridTemplateColumns: '2fr 0.7fr 1fr 0.7fr 1fr 60px' }}
      >
        <div className="flex items-center gap-1.5 truncate">
          {material.archived && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[hsl(220,12%,18%)] text-[hsl(var(--text-muted))] rounded border border-border">
              архив
            </span>
          )}
          <span className="truncate text-foreground">{material.name}</span>
        </div>
        <span className="text-xs text-[hsl(var(--text-dim))]">{material.thickness ? `${material.thickness}мм` : '—'}</span>
        <span className="text-xs text-[hsl(var(--text-dim))] truncate">{material.color || '—'}</span>
        <span className="text-xs text-[hsl(var(--text-dim))] truncate" title={material.article || ''}>{material.article || '—'}</span>

        {/* Цена — инлайн-редактирование */}
        <div className="flex items-center justify-end gap-1">
          {editingPrice ? (
            <input
              autoFocus
              type="number"
              value={priceVal}
              onChange={e => setPriceVal(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={e => { if (e.key === 'Enter') commitPrice(); if (e.key === 'Escape') setEditingPrice(false); }}
              className="w-20 bg-[hsl(220,12%,18%)] border border-gold rounded px-2 py-0.5 text-right text-sm font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <button
              onClick={startEdit}
              className="font-mono hover:text-gold transition-colors group/price flex items-center gap-1"
              title="Нажмите для редактирования цены"
            >
              {isVeryStale ? (
                <span className="text-red-400 flex items-center gap-1" title={`Цена не обновлялась ${ageDays} дн.`}>
                  <Icon name="AlertTriangle" size={10} />
                  {fmt(material.basePrice)}
                </span>
              ) : isStale ? (
                <span className="text-amber-400 flex items-center gap-1" title={`Цена не обновлялась ${ageDays} дн.`}>
                  <Icon name="Clock" size={10} />
                  {fmt(material.basePrice)}
                </span>
              ) : (
                <span>{fmt(material.basePrice)}</span>
              )}
              <span className="text-[hsl(var(--text-muted))] text-xs">/{material.unit}</span>
              <Icon name="Pencil" size={10} className="opacity-0 group-hover/price:opacity-60 transition-opacity" />
            </button>
          )}
          {/* История цен */}
          {(material.priceHistory || []).length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setShowHistory(v => !v); }}
              className="text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
              title="История цен"
            >
              <Icon name="History" size={11} />
            </button>
          )}
        </div>

        {/* Действия */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button
            onClick={() => store.updateMaterial(material.id, { archived: !material.archived })}
            title={material.archived ? 'Восстановить' : 'Архивировать'}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${material.archived ? 'text-gold hover:text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-amber-400'}`}
          >
            <Icon name={material.archived ? 'ArchiveRestore' : 'Archive'} size={11} />
          </button>
          <button
            onClick={() => store.duplicateMaterial(material.id)}
            title="Дублировать"
            className="w-6 h-6 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-foreground transition-colors rounded"
          >
            <Icon name="Copy" size={11} />
          </button>
          <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-foreground transition-colors rounded">
            <Icon name="Settings2" size={12} />
          </button>
          <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-destructive transition-colors rounded">
            <Icon name="Trash2" size={12} />
          </button>
        </div>
      </div>

      {/* Раскрывающаяся история цен */}
      {showHistory && (material.priceHistory || []).length > 0 && (
        <div className="px-4 py-2 bg-[hsl(220,12%,10%)] border-b border-[hsl(220,12%,14%)]">
          <div className="flex items-center gap-2 mb-1.5 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider">
            <Icon name="History" size={11} /> История цен
          </div>
          <div className="space-y-0.5">
            {(material.priceHistory || []).slice(0, 8).map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-[hsl(var(--text-muted))]">{h.date}</span>
                <span className="font-mono text-[hsl(var(--text-dim))]">{fmt(h.price)} → {i === 0 ? fmt(material.basePrice) : fmt((material.priceHistory || [])[i - 1]?.price || material.basePrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}