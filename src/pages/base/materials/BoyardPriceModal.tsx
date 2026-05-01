import { useState } from 'react';
import { useCatalog, updatePricesBatch, loadCatalog } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';


const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

interface BoyardItem {
  article: string;
  name: string;
  category: string;
  type_id: string;
  price_retail: number;
  unit: string;
}

// Одно изменение цены — на уровне варианта
interface ChangedVariant {
  materialId: string;
  materialName: string;
  variantId: string;
  article: string;        // оригинальный артикул
  category: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

export default function BoyardPriceModal({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0);
  const [changed, setChanged] = useState<ChangedVariant[] | null>(null);
  const [allItems, setAllItems] = useState<BoyardItem[]>([]);
  const [saved, setSaved] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setChanged(null);
    setSaved(false);
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'boyard' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');

      const items: BoyardItem[] = data.items;
      setAllItems(items);
      setRate(data.rate || 0);

      // Карта артикул → цена из прайса
      const priceMap = new Map<string, BoyardItem>();
      for (const item of items) {
        priceMap.set(item.article, item);
      }

      const boyardMfr = catalog.manufacturers.find(m => m.name.toLowerCase() === 'boyard');
      const result: ChangedVariant[] = [];

      for (const mat of catalog.materials) {
        if (mat.manufacturerId !== boyardMfr?.id) continue;
        if (!mat.variants?.length) continue;

        for (const variant of mat.variants) {
          // Артикул варианта — либо в variant.article, либо в variant.size (legacy)
          const articleKey = variant.article || variant.size || '';
          if (!articleKey) continue;

          const item = priceMap.get(articleKey);
          if (!item) continue;

          const currentPrice = variant.basePrice;
          const newPrice = item.price_retail;

          if (Math.round(currentPrice) !== Math.round(newPrice)) {
            result.push({
              materialId: mat.id,
              materialName: mat.name,
              variantId: variant.id,
              article: articleKey,
              category: item.category,
              oldPrice: currentPrice,
              newPrice,
              selected: true,
            });
          }
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

  const toggleAll = (val: boolean) =>
    setChanged(prev => prev?.map(m => ({ ...m, selected: val })) ?? null);

  const handleSave = async () => {
    if (!changed) return;
    const selected = changed.filter(m => m.selected);

    const byMaterial = new Map<string, { article: string; materialId: string; variants: Array<{ variantId: string; basePrice: number }> }>();
    for (const ch of selected) {
      const mat = catalog.materials.find(m => m.id === ch.materialId);
      if (!mat) continue;
      if (!byMaterial.has(ch.materialId)) {
        byMaterial.set(ch.materialId, { article: mat.article || '', materialId: ch.materialId, variants: [] });
      }
      byMaterial.get(ch.materialId)!.variants.push({
        variantId: ch.variantId,
        basePrice: ch.newPrice,
      });
    }

    await updatePricesBatch(Array.from(byMaterial.values()));
    await loadCatalog();
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = changed?.filter(m => m.selected).length ?? 0;
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  // Группируем по категориям для вкладки "Весь прайс"
  const grouped = allItems.reduce<Record<string, BoyardItem[]>>((acc, item) => {
    const key = item.category || 'Прочее';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const [activeTab, setActiveTab] = useState<'changes' | 'all'>('changes');

  return (
    <Modal title="Обновить цены BOYARD" onClose={onClose}>
      <div className="space-y-4">

        {!changed && !loading && allItems.length === 0 && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Загрузит актуальный прайс BOYARD и сравнит розничные цены в рублях с текущими в базе.
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
            <span className="text-sm">Загружаю и сравниваю цены...</span>
          </div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены BOYARD обновлены!
          </div>
        )}

        {changed !== null && !saved && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className="text-lg font-bold text-foreground">{allItems.length}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">позиций в прайсе</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className={`text-lg font-bold ${changed.length > 0 ? 'text-gold' : 'text-green-400'}`}>{changed.length}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">цен изменилось</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-2.5 text-center">
                <div className="text-lg font-bold text-sky-400">{rate > 0 ? rate.toFixed(2) : '—'}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))]">курс ₽/$</div>
              </div>
            </div>

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

            {activeTab === 'changes' && (
              <>
                {changed.length === 0 ? (
                  <div className="text-center py-6 text-sm text-green-400 flex flex-col items-center gap-2">
                    <Icon name="CheckCircle" size={24} />
                    Все цены актуальны — изменений нет
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
                      <span>Выбрано: {selectedCount} из {changed.length}</span>
                      <div className="flex gap-3">
                        <button onClick={() => toggleAll(true)} className="hover:text-gold transition-colors">Все</button>
                        <button onClick={() => toggleAll(false)} className="hover:text-gold transition-colors">Снять</button>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-auto scrollbar-thin space-y-1">
                      {changed.map((m, i) => (
                        <div
                          key={i}
                          onClick={() => toggle(i)}
                          className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                            m.selected
                              ? 'bg-[hsl(220,12%,16%)] border-gold/30'
                              : 'bg-[hsl(220,12%,13%)] border-transparent opacity-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            m.selected ? 'bg-gold border-gold' : 'border-border'
                          }`}>
                            {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-foreground truncate">{m.materialName}</div>
                            <div className="text-[10px] text-[hsl(var(--text-muted))]">{m.article} · {m.category}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-[hsl(var(--text-muted))] line-through">{fmt(m.oldPrice)} ₽</div>
                            <div className={`text-xs font-medium ${m.newPrice > m.oldPrice ? 'text-red-400' : 'text-green-400'}`}>
                              {fmt(m.newPrice)} ₽
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={selectedCount === 0}
                        className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                      >
                        Обновить {selectedCount} цен
                      </button>
                      <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'all' && (
              <div className="max-h-64 overflow-auto scrollbar-thin space-y-2">
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([cat, catItems]) => {
                  const names = new Set(catItems.map(i => i.name));
                  return (
                    <div key={cat} className="bg-[hsl(220,12%,14%)] rounded border border-border">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(220,12%,18%)]">
                        <span className="text-xs font-medium text-foreground">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[hsl(var(--text-muted))]">{names.size} назв.</span>
                          <span className="text-[10px] text-gold">{catItems.length} арт.</span>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 space-y-0.5">
                        {catItems.slice(0, 5).map((item, j) => (
                          <div key={j} className="flex items-center justify-between">
                            <span className="text-[11px] text-[hsl(var(--text-dim))] truncate flex-1 mr-2">{item.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-[hsl(var(--text-muted))] font-mono">{item.article}</span>
                              <span className="text-[11px] font-mono text-foreground">{fmt(item.price_retail)} ₽</span>
                            </div>
                          </div>
                        ))}
                        {catItems.length > 5 && (
                          <div className="text-[10px] text-[hsl(var(--text-muted))] pt-0.5">
                            + ещё {catItems.length - 5} артикулов
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}