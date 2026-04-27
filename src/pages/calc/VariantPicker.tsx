import { useStore } from '@/store/useStore';
import type { Material, MaterialVariant } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from './constants';

interface Props {
  material: Material;
  onPick: (variant: MaterialVariant) => void;
  onCancel: () => void;
}

// Модалка выбора варианта (размера/толщины) для материалов с variants
export default function VariantPicker({ material, onPick, onCancel }: Props) {
  const store = useStore();
  const variants = material.variants || [];

  // Определяем режим СКАТ: все варианты имеют params = "X кат"
  const isSkat = variants.length > 0 && /^\d\s*кат$/.test((variants[0].params || '').trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-semibold text-sm">{material.name}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              {isSkat ? 'Выберите категорию цены' : 'Выберите размер'}
            </div>
          </div>
          <button onClick={onCancel} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="max-h-80 overflow-auto scrollbar-thin">
          {isSkat ? (
            // Режим СКАТ: Описание | МДФ | Категория | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 55px 70px 90px' }}>
                <span>Фасад · Серия</span>
                <span className="text-center">МДФ</span>
                <span className="text-center">Кат.</span>
                <span className="text-right">Закуп. / Розн.</span>
              </div>
              {variants.map(v => {
                const retail = store.calcPriceWithMarkup(v.basePrice, 'materials');
                return (
                  <button
                    key={v.id}
                    onClick={() => onPick(v)}
                    className="w-full grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,16%)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 55px 70px 90px' }}
                  >
                    <span className="text-xs font-medium group-hover:text-gold transition-colors truncate">{v.size || material.name}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] text-center">{v.thickness ? `${v.thickness}мм` : '—'}</span>
                    <span className="text-xs text-gold font-semibold text-center">{v.params}</span>
                    <div className="text-right">
                      <div className="text-xs text-[hsl(var(--text-dim))] font-mono">{fmt(v.basePrice)}</div>
                      <div className="text-xs text-gold font-mono font-semibold">→ {fmt(retail)}</div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            // Стандартный режим: Размер | Толщ. | Параметры | Артикул | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 50px 0.8fr 0.7fr 90px' }}>
                <span>Размер</span><span className="text-center">Толщ.</span><span>Параметры</span><span>Артикул</span><span className="text-right">Закуп. / Розн.</span>
              </div>
              {variants.map(v => {
                const retail = store.calcPriceWithMarkup(v.basePrice, 'materials');
                return (
                  <button
                    key={v.id}
                    onClick={() => onPick(v)}
                    className="w-full grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,16%)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 50px 0.8fr 0.7fr 90px' }}
                  >
                    <span className="text-sm font-medium group-hover:text-gold transition-colors">{v.size || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] text-center">{v.thickness ? `${v.thickness}мм` : '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-muted))] truncate">{v.params || '—'}</span>
                    <span className="text-xs text-[hsl(var(--text-dim))] truncate">{v.article || '—'}</span>
                    <div className="text-right">
                      <div className="text-xs text-[hsl(var(--text-dim))] font-mono">{fmt(v.basePrice)}</div>
                      <div className="text-xs text-gold font-mono font-semibold">→ {fmt(retail)}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
