import { useState } from 'react';
import type { MaterialVariant } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from './BaseShared';

function uid() { return Math.random().toString(36).slice(2, 10); }

interface Props {
  variants: MaterialVariant[];
  unit: string;
  onChange: (variants: MaterialVariant[]) => void;
}

export default function VariantsEditor({ variants, unit, onChange }: Props) {
  const [expanded, setExpanded] = useState(variants.length > 0);

  const add = () => {
    const next = [...variants, { id: uid(), size: '', thickness: undefined, params: '', article: '', basePrice: 0 }];
    onChange(next);
    setExpanded(true);
  };

  const update = (id: string, data: Partial<MaterialVariant>) => {
    onChange(variants.map(v => v.id === id ? { ...v, ...data } : v));
  };

  const remove = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,16%)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name="Layers" size={13} className="text-[hsl(var(--text-muted))]" />
          <span className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]">
            Варианты размеров и цен
          </span>
          {variants.length > 0 && (
            <span className="text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded font-medium">
              {variants.length}
            </span>
          )}
        </div>
        <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-[hsl(var(--text-muted))]" />
      </button>

      {expanded && (
        <div>
          {variants.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-[hsl(var(--text-muted))]">
              Нет вариантов — добавь первый
            </div>
          ) : (
            <div>
              {/* Заголовки колонок */}
              <div
                className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border bg-[hsl(220,12%,12%)]"
                style={{ gridTemplateColumns: '1fr 55px 0.8fr 0.8fr 80px 24px' }}
              >
                <span>Размер</span>
                <span className="text-center">Толщ.</span>
                <span>Параметры</span>
                <span>Артикул</span>
                <span className="text-right">Цена, {unit}</span>
                <span />
              </div>

              {variants.map(v => (
                <div
                  key={v.id}
                  className="grid items-center gap-1.5 px-3 py-1.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,13%)] group"
                  style={{ gridTemplateColumns: '1fr 55px 0.8fr 0.8fr 80px 24px' }}
                >
                  <input
                    value={v.size || ''}
                    onChange={e => update(v.id, { size: e.target.value })}
                    placeholder="4200×1200"
                    className="bg-transparent border-b border-transparent focus:border-gold outline-none text-sm w-full transition-colors"
                  />
                  <input
                    type="number"
                    value={v.thickness ?? ''}
                    onChange={e => update(v.id, { thickness: parseFloat(e.target.value) || undefined })}
                    placeholder="40"
                    className="bg-transparent border-b border-transparent focus:border-gold outline-none text-sm text-center w-full transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    value={v.params || ''}
                    onChange={e => update(v.id, { params: e.target.value })}
                    placeholder="подгиб…"
                    className="bg-transparent border-b border-transparent focus:border-gold outline-none text-sm w-full transition-colors text-[hsl(var(--text-dim))]"
                  />
                  <input
                    value={v.article || ''}
                    onChange={e => update(v.id, { article: e.target.value })}
                    placeholder="SKU-001"
                    className="bg-transparent border-b border-transparent focus:border-gold outline-none text-sm w-full transition-colors text-[hsl(var(--text-dim))]"
                  />
                  <input
                    type="number"
                    value={v.basePrice || ''}
                    onChange={e => update(v.id, { basePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="bg-transparent border-b border-transparent focus:border-gold outline-none text-sm text-right font-mono w-full transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => remove(v.id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-destructive transition-all"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 py-2 border-t border-border bg-[hsl(220,12%,12%)]">
            <button
              type="button"
              onClick={add}
              className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
            >
              <Icon name="Plus" size={11} /> Добавить вариант
            </button>
          </div>
        </div>
      )}

      {!expanded && variants.length > 0 && (
        <div className="px-3 py-2 bg-[hsl(220,12%,12%)] flex flex-wrap gap-1.5">
          {variants.slice(0, 5).map(v => (
            <span key={v.id} className="text-xs bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-0.5 text-[hsl(var(--text-dim))]">
              {[v.size, v.thickness ? `${v.thickness}мм` : '', v.article].filter(Boolean).join(' · ')}
              {v.basePrice > 0 && <span className="text-gold ml-1">{fmt(v.basePrice)}</span>}
            </span>
          ))}
          {variants.length > 5 && (
            <span className="text-xs text-[hsl(var(--text-muted))]">+{variants.length - 5} ещё</span>
          )}
        </div>
      )}
    </div>
  );
}