import { useState } from 'react';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';

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
  const [imgError, setImgError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className="grid items-center px-4 py-2 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
      style={{ gridTemplateColumns: '32px 2fr 0.7fr 1fr 0.7fr 1fr 28px' }}
    >
      {/* Фото */}
      <div className="relative">
        {material.imageUrl && !imgError ? (
          <div
            className="relative"
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
          >
            <img
              src={material.imageUrl}
              alt={material.color || material.name}
              onError={() => setImgError(true)}
              className="w-6 h-6 rounded object-cover border border-border cursor-pointer"
            />
            {showPreview && (
              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-2 shadow-2xl">
                  <img
                    src={material.imageUrl}
                    alt={material.color || material.name}
                    className="w-32 h-32 rounded object-cover"
                  />
                  {material.color && (
                    <div className="text-xs text-center text-[hsl(var(--text-muted))] mt-1">{material.color}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-6 h-6 rounded bg-[hsl(220,12%,16%)] border border-border flex items-center justify-center">
            <Icon name="Image" size={10} className="text-[hsl(var(--text-muted))] opacity-40" />
          </div>
        )}
      </div>

      <span className="truncate text-foreground">{material.name}</span>
      <span className="text-xs text-[hsl(var(--text-dim))]">{material.thickness ? `${material.thickness}мм` : '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{material.color || '—'}</span>
      <span className="text-xs text-[hsl(var(--text-dim))]">{material.article || '—'}</span>
      <span className="text-right font-mono">{fmt(material.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{material.unit}</span></span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
        <button onClick={onDelete} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
      </div>
    </div>
  );
}
