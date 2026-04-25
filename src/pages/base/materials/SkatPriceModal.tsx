import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';
import { skatArticle } from './SkatImportModal';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

const CATEGORIES = ['1 кат', '2 кат', '3 кат', '4 кат', '5 кат'];

interface SkatItem {
  name: string;
  thickness_section: string;
  subsection: string;
  facade_type: string;
  unit: string;
  thickness: number | null;
  price: number;
  category: string;
}

interface Match {
  materialId: string;
  materialName: string;
  section: string;
  subsection: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

function findMatches(items: SkatItem[], materials: ReturnType<typeof useStore>['materials']): Match[] {
  // Строим карту article → price из прайса
  const priceMap = new Map<string, SkatItem>();
  for (const item of items) {
    priceMap.set(skatArticle(item.thickness_section, item.subsection, item.facade_type), item);
  }

  const matches: Match[] = [];
  for (const mat of materials) {
    if (!mat.article) continue;
    const item = priceMap.get(mat.article);
    if (!item) continue;
    if (item.price === mat.basePrice) continue; // цена не изменилась
    matches.push({
      materialId: mat.id,
      materialName: mat.name,
      section: item.thickness_section,
      subsection: item.subsection,
      oldPrice: mat.basePrice,
      newPrice: item.price,
      selected: true,
    });
  }
  return matches;
}

export default function SkatPriceModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [category, setCategory] = useState('1 кат');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [items, setItems] = useState<SkatItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'all'>('matches');

  const handleFetch = async (cat: string) => {
    setCategory(cat);
    setLoading(true);
    setError('');
    setMatches(null);
    setSaved(false);
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'skat', category: cat }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');
      const priceItems: SkatItem[] = data.items;
      setItems(priceItems);
      setMatches(findMatches(priceItems, store.materials));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (idx: number) =>
    setMatches(prev => prev?.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m) ?? null);

  const handleSave = () => {
    if (!matches) return;
    matches.filter(m => m.selected).forEach(m => {
      store.updateMaterial(m.materialId, { basePrice: m.newPrice });
    });
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  // Группируем все позиции прайса по секции
  const grouped = items.reduce<Record<string, SkatItem[]>>((acc, item) => {
    const key = item.thickness_section || 'Прочее';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Modal title="Обновить цены СКАТ" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-[hsl(var(--text-muted))]">
          Выбери ценовую категорию — система загрузит актуальный прайс и покажет изменившиеся позиции.
        </p>

        {/* Выбор категории */}
        <div>
          <p className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Категория цен</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleFetch(cat)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                  category === cat && (matches !== null || loading)
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))] hover:border-gold/50 hover:text-foreground'
                }`}
              >
                {loading && category === cat
                  ? <span className="flex items-center gap-1.5"><Icon name="Loader2" size={12} className="animate-spin" />{cat}</span>
                  : cat
                }
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-start gap-2">
            <Icon name="AlertCircle" size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены обновлены!
          </div>
        )}

        {/* Вкладки: совпадения / весь прайс */}
        {(matches !== null || items.length > 0) && !saved && (
          <>
            <div className="flex border-b border-border gap-4">
              <button
                onClick={() => setActiveTab('matches')}
                className={`pb-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'matches' ? 'border-gold text-gold' : 'border-transparent text-[hsl(var(--text-muted))] hover:text-foreground'
                }`}
              >
                Совпадения {matches !== null && `(${matches.length})`}
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'all' ? 'border-gold text-gold' : 'border-transparent text-[hsl(var(--text-muted))] hover:text-foreground'
                }`}
              >
                Весь прайс {items.length > 0 && `(${items.length})`}
              </button>
            </div>

            {/* Таб: совпадения */}
            {activeTab === 'matches' && matches !== null && (
              <>
                {matches.length === 0 ? (
                  <div className="text-center py-6 text-[hsl(var(--text-muted))] text-sm space-y-1">
                    <Icon name="SearchX" size={24} className="mx-auto opacity-40 mb-2" />
                    <p>Совпадений не найдено</p>
                    <p className="text-xs">Сначала импортируй материалы через кнопку «Импорт СКАТ» — они создадутся с нужными артикулами</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--text-muted))]">
                        Найдено изменений: <span className="text-gold font-medium">{matches.length}</span>
                      </span>
                      <div className="flex gap-3">
                        <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: true })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">все</button>
                        <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: false })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">снять</button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                      <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                        style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}>
                        <span /><span>Материал</span><span>Секция</span>
                        <span className="text-right">Было</span>
                        <span className="text-right">Стало</span>
                      </div>
                      {matches.map((m, idx) => (
                        <div key={idx}
                          className="grid items-center gap-2 px-3 py-2 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                          style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}
                          onClick={() => toggle(idx)}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                            {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                          </div>
                          <span className="text-xs truncate">{m.materialName}</span>
                          <span className="text-xs text-[hsl(var(--text-muted))] truncate">{m.section}</span>
                          <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(m.oldPrice)}</span>
                          <span className={`text-xs font-mono text-right font-semibold ${m.newPrice > m.oldPrice ? 'text-red-400' : 'text-green-400'}`}>
                            {fmt(m.newPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Таб: весь прайс */}
            {activeTab === 'all' && (
              <div className="max-h-72 overflow-auto scrollbar-thin space-y-3">
                {Object.entries(grouped).map(([section, sectionItems]) => (
                  <div key={section} className="bg-[hsl(220,12%,14%)] rounded border border-border overflow-hidden">
                    <div className="px-3 py-2 bg-[hsl(220,12%,12%)] border-b border-border">
                      <span className="text-xs font-semibold text-gold">{section}</span>
                    </div>
                    {sectionItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(220,12%,16%)] last:border-0 text-xs">
                        <div className="min-w-0 flex-1 mr-2">
                          {item.subsection && (
                            <span className="text-[hsl(var(--text-muted))] mr-1">{item.subsection} /</span>
                          )}
                          <span className="text-foreground">{item.facade_type}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[hsl(var(--text-muted))]">{item.unit}</span>
                          <span className="font-mono font-semibold text-gold">{fmt(item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Кнопки */}
            {activeTab === 'matches' && matches !== null && matches.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={selectedCount === 0}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                >
                  Обновить {selectedCount > 0 ? `(${selectedCount})` : ''} позиций
                </button>
                <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                  Отмена
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}