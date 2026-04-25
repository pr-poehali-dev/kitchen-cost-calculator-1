import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import { fmt, Modal } from '../BaseShared';

export default function BulkPriceModal({ materials, onClose }: { materials: Material[]; onClose: () => void }) {
  const store = useStore();
  const [prices, setPrices] = useState<Record<string, string>>(
    () => Object.fromEntries(materials.map(m => [m.id, m.basePrice > 0 ? String(m.basePrice) : '']))
  );

  const changed = materials.filter(m => {
    const val = parseFloat(prices[m.id] || '0');
    return val !== m.basePrice && !isNaN(val);
  });

  const handleSave = () => {
    changed.forEach(m => {
      const val = parseFloat(prices[m.id]);
      if (!isNaN(val)) store.updateMaterial(m.id, { basePrice: val });
    });
    onClose();
  };

  return (
    <Modal title={`Массовое редактирование цен (${materials.length} позиций)`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-[hsl(var(--text-muted))] mb-1">
          Введи закупочную цену для каждой позиции. Пустые — не изменятся.
        </div>

        <div className="bg-[hsl(220,12%,14%)] rounded border border-border overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-3 py-2 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
            style={{ gridTemplateColumns: '1fr 60px 120px' }}>
            <span>Материал</span><span className="text-center">Толщ.</span><span className="text-right">Цена, ₽/м²</span>
          </div>
          {materials.map(m => (
            <div key={m.id}
              className="grid items-center px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0"
              style={{ gridTemplateColumns: '1fr 60px 120px' }}
            >
              <div className="min-w-0">
                <div className="text-sm truncate">{m.color || m.name}</div>
                {m.article && <div className="text-xs text-[hsl(var(--text-muted))]">{m.article}</div>}
              </div>
              <div className="text-xs text-[hsl(var(--text-dim))] text-center">{m.thickness ? `${m.thickness}мм` : '—'}</div>
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  value={prices[m.id]}
                  onChange={e => setPrices(p => ({ ...p, [m.id]: e.target.value }))}
                  placeholder={m.basePrice > 0 ? String(m.basePrice) : '0'}
                  className={`w-24 text-right bg-[hsl(220,12%,18%)] border rounded px-2 py-1 text-sm font-mono outline-none focus:border-gold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    prices[m.id] && parseFloat(prices[m.id]) !== m.basePrice ? 'border-gold/50 text-gold' : 'border-border'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {changed.length > 0 && (
          <div className="text-xs text-[hsl(var(--text-muted))]">
            Будет изменено: <span className="text-gold font-medium">{changed.length}</span> позиций
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={changed.length === 0}
            className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-40">
            Сохранить изменения
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}
