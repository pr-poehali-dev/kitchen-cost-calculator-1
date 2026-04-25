import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';
import { skatArticle, skatVariantId } from './SkatImportModal';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];
const CATEGORIES = ['1 кат', '2 кат', '3 кат', '4 кат', '5 кат'];

interface SkatAllItem {
  thickness_section: string;
  subsection: string;
  facade_type: string;
  unit: string;
  thickness: number | null;
  prices: Record<string, number>;
}

interface ChangedMaterial {
  materialId: string;
  materialName: string;
  article: string;
  section: string;
  changedCats: Array<{ cat: string; oldPrice: number; newPrice: number }>;
  selected: boolean;
}

export default function SkatPriceModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changed, setChanged] = useState<ChangedMaterial[] | null>(null);
  const [allItems, setAllItems] = useState<SkatAllItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'changes' | 'all'>('changes');

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setChanged(null);
    setSaved(false);
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'skat_all' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');

      const items: SkatAllItem[] = data.items;
      setAllItems(items);

      // Строим карту article → item
      const priceMap = new Map<string, SkatAllItem>();
      for (const item of items) {
        priceMap.set(skatArticle(item.thickness_section, item.subsection, item.facade_type), item);
      }

      // Ищем изменения по всем 5 вариантам
      const result: ChangedMaterial[] = [];
      for (const mat of store.materials) {
        if (!mat.article || !mat.variants?.length) continue;
        const item = priceMap.get(mat.article);
        if (!item) continue;

        const changedCats: ChangedMaterial['changedCats'] = [];
        for (const cat of CATEGORIES) {
          const newPrice = item.prices[cat];
          if (!newPrice) continue;
          const variant = mat.variants.find(v => v.id === skatVariantId(mat.article!, cat));
          if (!variant) continue;
          if (variant.basePrice !== newPrice) {
            changedCats.push({ cat, oldPrice: variant.basePrice, newPrice });
          }
        }

        if (changedCats.length > 0) {
          result.push({
            materialId: mat.id,
            materialName: mat.name,
            article: mat.article,
            section: item.thickness_section,
            changedCats,
            selected: true,
          });
        }
      }
      setChanged(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (idx: number) =>
    setChanged(prev => prev?.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m) ?? null);

  const handleSave = () => {
    if (!changed) return;
    const selected = changed.filter(m => m.selected);
    const updates = selected.map(m => ({
      article: m.article,
      variants: m.changedCats.map(c => ({
        variantId: skatVariantId(m.article, c.cat),
        basePrice: c.newPrice,
      })),
    }));
    store.updateSkatPrices(updates);
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = changed?.filter(m => m.selected).length ?? 0;
  const totalChanges = changed?.reduce((s, m) => s + m.changedCats.length, 0) ?? 0;

  // Группируем весь прайс по секции
  const grouped = allItems.reduce<Record<string, SkatAllItem[]>>((acc, item) => {
    const key = item.thickness_section || 'Прочее';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Modal title="Обновить цены СКАТ" onClose={onClose}>
      <div className="space-y-4">

        {/* Кнопка загрузки */}
        {!changed && !loading && allItems.length === 0 && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Загрузит актуальный прайс и сравнит все <strong className="text-foreground">705 цен</strong> (141 материал × 5 категорий) с текущими.
            </p>
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleFetch}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2">
                <Icon name="RefreshCw" size={14} /> Загрузить актуальный прайс
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-[hsl(var(--text-muted))]">
            <Icon name="Loader2" size={16} className="animate-spin text-gold" />
            <span className="text-sm">Загружаю и сравниваю 705 цен...</span>
          </div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены обновлены!
          </div>
        )}

        {/* Результаты */}
        {changed !== null && !saved && (
          <>
            {/* Статистика */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className="text-lg font-bold text-foreground">{allItems.length}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">позиций</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className={`text-lg font-bold ${changed.length > 0 ? 'text-gold' : 'text-green-400'}`}>{changed.length}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">позиций изменились</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className="text-lg font-bold text-gold">{totalChanges}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">цен изменилось</div>
              </div>
            </div>

            {/* Вкладки */}
            <div className="flex border-b border-border gap-4">
              {[
                { id: 'changes', label: `Изменения (${changed.length})` },
                { id: 'all', label: `Весь прайс (${allItems.length})` },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as 'changes' | 'all')}
                  className={`pb-2 text-xs font-medium border-b-2 -mb-px transition-colors ${activeTab === t.id ? 'border-gold text-gold' : 'border-transparent text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Вкладка изменений */}
            {activeTab === 'changes' && (
              <>
                {changed.length === 0 ? (
                  <div className="text-center py-8 text-[hsl(var(--text-muted))] space-y-2">
                    <Icon name="CheckCircle" size={28} className="mx-auto text-green-400 opacity-60 mb-2" />
                    <p className="text-sm font-medium text-green-400">Все цены актуальны</p>
                    <p className="text-xs">705 цен совпадают с текущим прайсом</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--text-muted))]">
                        Выбрано: <span className="text-gold font-medium">{selectedCount}</span> позиций
                        (<span className="text-gold">{changed.filter(m=>m.selected).reduce((s,m)=>s+m.changedCats.length,0)}</span> цен)
                      </span>
                      <div className="flex gap-3">
                        <button onClick={() => setChanged(c => c?.map(x => ({...x, selected: true})) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">все</button>
                        <button onClick={() => setChanged(c => c?.map(x => ({...x, selected: false})) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">снять</button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                      {changed.map((m, idx) => (
                        <div key={idx} className={`border-b border-[hsl(220,12%,17%)] last:border-0 transition-colors ${m.selected ? '' : 'opacity-50'}`}>
                          {/* Заголовок позиции */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                            onClick={() => toggle(idx)}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                              {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium truncate block">{m.materialName}</span>
                              <span className="text-[10px] text-[hsl(var(--text-muted))]">{m.section}</span>
                            </div>
                            <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">{m.changedCats.length} кат.</span>
                          </div>
                          {/* Строки по категориям */}
                          <div className="px-8 pb-1.5 grid gap-0.5">
                            {m.changedCats.map((c, ci) => (
                              <div key={ci} className="flex items-center justify-between text-[10px] text-[hsl(var(--text-dim))]">
                                <span className="font-medium text-[hsl(var(--text-muted))]">{c.cat}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono">{fmt(c.oldPrice)}</span>
                                  <Icon name="ArrowRight" size={8} className="opacity-50" />
                                  <span className={`font-mono font-semibold ${c.newPrice > c.oldPrice ? 'text-red-400' : 'text-green-400'}`}>{fmt(c.newPrice)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Вкладка весь прайс */}
            {activeTab === 'all' && (
              <div className="max-h-64 overflow-auto scrollbar-thin space-y-1.5">
                {Object.entries(grouped).map(([section, items]) => (
                  <div key={section} className="bg-[hsl(220,12%,14%)] rounded border border-border overflow-hidden">
                    <div className="px-3 py-2 bg-[hsl(220,12%,11%)] border-b border-border flex items-center justify-between">
                      <span className="text-xs font-semibold text-gold">{section}</span>
                      <span className="text-[10px] text-[hsl(var(--text-muted))]">{items.length} поз.</span>
                    </div>
                    {items.map((item, i) => (
                      <div key={i} className="px-3 py-1.5 border-b border-[hsl(220,12%,16%)] last:border-0">
                        <div className="text-xs text-foreground mb-1">{item.facade_type}</div>
                        <div className="flex gap-3 flex-wrap">
                          {CATEGORIES.filter(c => item.prices[c]).map(cat => (
                            <span key={cat} className="text-[10px] text-[hsl(var(--text-muted))]">
                              <span className="text-[hsl(var(--text-dim))]">{cat}:</span> {fmt(item.prices[cat])}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Кнопки */}
            {activeTab === 'changes' && changed.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={selectedCount === 0}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                  Обновить {selectedCount > 0 ? `${selectedCount} позиций` : ''}
                </button>
                <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
