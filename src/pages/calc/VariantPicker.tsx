import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Material, MaterialVariant } from '@/store/types';
import Icon from '@/components/ui/icon';
import SearchInput from '@/components/ui/search-input';
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
  const [query, setQuery] = useState('');

  // Определяем режим СКАТ: все варианты имеют params = "X кат"
  const isSkat = variants.length > 0 && /^\d\s*кат$/.test((variants[0].params || '').trim());
  // Режим BOYARD: все варианты — розница, отличаются только артикулом
  const isBoyard = !isSkat && variants.length > 0 && variants.every(v => v.params === 'розница');

  // Показываем поиск если вариантов больше 7
  const showSearch = variants.length > 7;

  // Фильтрация по запросу
  const q = query.trim().toLowerCase();
  const filtered = q
    ? variants.filter(v =>
        (v.article || '').toLowerCase().includes(q) ||
        (v.size || '').toLowerCase().includes(q) ||
        (v.params || '').toLowerCase().includes(q) ||
        (v.thickness ? String(v.thickness) : '').includes(q)
      )
    : variants;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="font-semibold text-sm">{material.name}</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              {isSkat ? 'Выберите категорию цены' : isBoyard ? 'Выберите артикул' : 'Выберите размер'}
              <span className="ml-1.5 text-[hsl(var(--text-muted))]">· {variants.length} {isBoyard ? 'арт.' : 'вар.'}</span>
            </div>
          </div>
          <button onClick={onCancel} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Поиск — только если вариантов много */}
        {showSearch && (
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={isBoyard ? 'Поиск по артикулу...' : 'Поиск по размеру, параметрам...'}
              autoFocus
            />
          </div>
        )}

        {/* Список вариантов */}
        <div className="overflow-auto scrollbar-thin flex-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-[hsl(var(--text-muted))]">
              Ничего не найдено
            </div>
          ) : isBoyard ? (
            // Режим BOYARD: Артикул | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 90px' }}>
                <span>Артикул</span><span className="text-right">Закуп. / Розн.</span>
              </div>
              {filtered.map(v => {
                const retail = store.calcPriceWithMarkup(v.basePrice, 'materials');
                return (
                  <button
                    key={v.id}
                    onClick={() => onPick(v)}
                    className="w-full grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,15%)] last:border-0 hover:bg-[hsl(220,12%,16%)] transition-colors text-left group"
                    style={{ gridTemplateColumns: '1fr 90px' }}
                  >
                    <span className="text-sm font-medium group-hover:text-gold transition-colors font-mono">{v.article || v.size || '—'}</span>
                    <div className="text-right">
                      <div className="text-xs text-[hsl(var(--text-dim))] font-mono">{fmt(v.basePrice)}</div>
                      <div className="text-xs text-gold font-mono font-semibold">→ {fmt(retail)}</div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : isSkat ? (
            // Режим СКАТ: Описание | МДФ | Категория | Цена
            <>
              <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2 border-b border-border"
                style={{ gridTemplateColumns: '1fr 55px 70px 90px' }}>
                <span>Фасад · Серия</span>
                <span className="text-center">МДФ</span>
                <span className="text-center">Кат.</span>
                <span className="text-right">Закуп. / Розн.</span>
              </div>
              {filtered.map(v => {
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
              {filtered.map(v => {
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

        {/* Счётчик результатов — показываем только при активном поиске */}
        {query && (
          <div className="px-4 py-2 border-t border-border shrink-0 text-xs text-[hsl(var(--text-muted))]">
            {filtered.length} из {variants.length}
          </div>
        )}
      </div>
    </div>
  );
}
