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
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 animate-fade-in max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(220,14%,11%)] z-10">
          <span className="font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function MaterialRow({ material, onEdit, onDelete }: {
  material: Material; onEdit: () => void; onDelete: () => void; currency?: string;
}) {
  const store = useStore();
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceVal, setPriceVal] = useState('');

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

  return (
    <div className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
      style={{ gridTemplateColumns: '2fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
      <span className="truncate text-foreground">{material.name}</span>
      <span className="text-xs text-[hsl(var(--text-dim))]">{material.thickness ? `${material.thickness}мм` : '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{material.color || '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))] truncate max-w-0 min-w-0" title={material.article || ''}>{material.article || '—'}</span>

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
            {fmt(material.basePrice)}
            <span className="text-[hsl(var(--text-muted))] text-xs">/{material.unit}</span>
            <Icon name="Pencil" size={10} className="opacity-0 group-hover/price:opacity-60 transition-opacity" />
          </button>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Settings2" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}
