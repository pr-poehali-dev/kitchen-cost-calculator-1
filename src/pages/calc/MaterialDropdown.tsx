import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import { fmt } from './constants';

interface Props {
  materials: Material[];
  pos: { top: number; left: number };
  store: ReturnType<typeof useStore>;
  onPick: (id: string) => void;
}

// Выпадающий список материалов с фильтром и группировкой СКАТ по толщине МДФ
export default function MaterialDropdown({ materials, pos, store, onPick }: Props) {
  const [thickFilter, setThickFilter] = useState<number | null>(null);

  const skatMats = materials.filter(m => m.article?.startsWith('skat__'));
  const otherMats = materials.filter(m => !m.article?.startsWith('skat__'));

  // Все уникальные толщины СКАТ по возрастанию
  const allThicknesses = Array.from(
    new Set(skatMats.map(m => m.variants?.[0]?.thickness ?? 0))
  ).sort((a, b) => a - b);

  // Группируем СКАТ с учётом фильтра
  const visibleSkat = thickFilter !== null
    ? skatMats.filter(m => (m.variants?.[0]?.thickness ?? 0) === thickFilter)
    : skatMats;

  const skatByThickness = new Map<number, Material[]>();
  for (const m of visibleSkat) {
    const th = m.variants?.[0]?.thickness ?? 0;
    if (!skatByThickness.has(th)) skatByThickness.set(th, []);
    skatByThickness.get(th)!.push(m);
  }
  const thicknessGroups = Array.from(skatByThickness.entries()).sort((a, b) => a[0] - b[0]);

  const hasSkat = skatMats.length > 0;

  return (
    <div
      className="fixed z-[9999] bg-[hsl(220,16%,10%)] border border-border rounded shadow-2xl overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: 500 }}
    >
      {/* Фильтр по толщине — только если есть СКАТ */}
      {hasSkat && allThicknesses.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(220,14%,12%)] border-b border-border">
          <span className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider shrink-0 mr-0.5">МДФ</span>
          <button
            onMouseDown={e => { e.preventDefault(); setThickFilter(null); }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              thickFilter === null
                ? 'bg-gold text-[hsl(220,16%,8%)]'
                : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,18%)]'
            }`}
          >
            Все
          </button>
          {allThicknesses.map(th => (
            <button
              key={th}
              onMouseDown={e => { e.preventDefault(); setThickFilter(thickFilter === th ? null : th); }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                thickFilter === th
                  ? 'bg-gold text-[hsl(220,16%,8%)]'
                  : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,18%)]'
              }`}
            >
              {th}мм
            </button>
          ))}
          {otherMats.length > 0 && (
            <span className="ml-auto text-[10px] text-[hsl(var(--text-muted))]">
              {thickFilter ? visibleSkat.length : skatMats.length} + {otherMats.length} др.
            </span>
          )}
        </div>
      )}

      {/* Список — скроллится */}
      <div className="max-h-80 overflow-auto scrollbar-thin">
        {/* СКАТ группы */}
        {thicknessGroups.map(([thickness, mats]) => (
          <div key={thickness}>
            {/* Заголовок группы — показываем только если нет фильтра (т.е. несколько групп) */}
            {thickFilter === null && allThicknesses.length > 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(220,14%,13%)] border-b border-[hsl(220,12%,17%)] border-t border-t-[hsl(220,12%,16%)]">
                <span className="text-[10px] font-bold text-gold tracking-wider">СКАТ</span>
                <span className="text-[10px] bg-[hsl(220,12%,20%)] text-[hsl(var(--text-dim))] px-2 py-0.5 rounded font-medium">
                  МДФ {thickness}мм
                </span>
                <span className="text-[10px] text-[hsl(var(--text-muted))]">{mats.length} поз.</span>
              </div>
            )}
            {mats.map(m => {
              const t = store.getTypeById(m.typeId);
              const skatSize = m.variants?.[0]?.size || m.name;
              return (
                <button
                  key={m.id}
                  onMouseDown={() => onPick(m.id)}
                  className="w-full text-left px-3 py-2 hover:bg-[hsl(220,12%,16%)] flex items-center gap-2 transition-colors border-b border-[hsl(220,12%,14%)] last:border-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#888' }} />
                  <span className="flex-1 text-sm text-foreground truncate">{skatSize}</span>
                  {thickFilter !== null && (
                    <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">{thickness}мм</span>
                  )}
                  <span className="text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded shrink-0">
                    {m.variants!.length} кат.
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {/* Разделитель */}
        {visibleSkat.length > 0 && otherMats.length > 0 && (
          <div className="border-t-2 border-[hsl(220,12%,18%)]" />
        )}

        {/* Остальные материалы */}
        {otherMats.slice(0, 20).map(m => {
          const t = store.getTypeById(m.typeId);
          const mfr = store.getManufacturerById(m.manufacturerId);
          return (
            <button
              key={m.id}
              onMouseDown={() => onPick(m.id)}
              className="w-full text-left px-3 py-2 hover:bg-[hsl(220,12%,16%)] flex items-center gap-2 transition-colors border-b border-[hsl(220,12%,14%)] last:border-0"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#888' }} />
              <span className="flex-1 text-sm text-foreground truncate">{m.name}</span>
              {m.variants && m.variants.length > 0 && (
                <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded shrink-0">{m.variants.length} разм.</span>
              )}
              {mfr && <span className="text-[hsl(var(--text-dim))] text-xs shrink-0">{mfr.name}</span>}
              {(!m.variants || m.variants.length === 0) && (
                <span className="text-gold text-xs font-mono shrink-0">
                  {fmt(store.calcPriceWithMarkup(m.basePrice, 'materials'))} ₽
                </span>
              )}
            </button>
          );
        })}

        {/* Ничего не найдено */}
        {visibleSkat.length === 0 && otherMats.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-[hsl(var(--text-muted))]">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
}