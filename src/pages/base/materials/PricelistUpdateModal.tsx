import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

interface PriceItem {
  series: string;
  product: string;
  size: string;
  thickness: number | null;
  params: string;
  unit: string;
  price: number;
}

interface Match {
  materialId: string;
  materialName: string;
  variantId: string;
  variantLabel: string;
  series: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

export default function PricelistUpdateModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [saved, setSaved] = useState(false);

  const normSize = (s: string) =>
    s.replace(/\s/g, '').replace(/[×хx×]/gi, '×').replace(/\.(\d{3})/g, '$1');

  const findMatches = (items: PriceItem[]): Match[] => {
    const result: Match[] = [];

    // Группируем items по серии для быстрого поиска
    const bySeries: Record<string, PriceItem[]> = {};
    for (const item of items) {
      if (!bySeries[item.series]) bySeries[item.series] = [];
      bySeries[item.series].push(item);
    }

    for (const mat of store.materials) {
      if (!mat.variants?.length) continue;

      for (const v of mat.variants) {
        // Определяем серию варианта по префиксу id (e1_, e2_, e3_, k1_, k2_, k3_)
        const seriesMatch = v.id.match(/^(e1|e2|e3|k1|k2|k3)_/);
        if (!seriesMatch) continue;
        const series = seriesMatch[1];

        const seriesItems = bySeries[series];
        if (!seriesItems?.length) continue;

        const vSize = normSize(v.size || '');
        const vThick = v.thickness ?? null;
        const vParams = (v.params || '').replace(/\s/g, '').toLowerCase();

        const match = seriesItems.find(item => {
          const iSize = normSize(item.size);
          if (iSize !== vSize) return false;
          if (vThick !== null && item.thickness !== null && Math.abs(vThick - item.thickness) > 0.5) return false;
          if (vParams && item.params) {
            const iParams = item.params.replace(/\s/g, '').toLowerCase();
            const vParamParts = vParams.split('/').filter(Boolean);
            const iParamParts = iParams.split(/[,/]/).filter(Boolean);
            const overlap = vParamParts.some(p => iParamParts.some(ip => ip.includes(p) || p.includes(ip)));
            if (!overlap) return false;
          }
          return item.price > 0;
        });

        if (match && match.price !== v.basePrice) {
          const label = [v.size, v.thickness ? `${v.thickness}мм` : '', v.params].filter(Boolean).join(' ');
          result.push({
            materialId: mat.id,
            materialName: mat.name,
            variantId: v.id,
            variantLabel: label,
            series,
            oldPrice: v.basePrice,
            newPrice: match.price,
            selected: true,
          });
        }
      }
    }
    return result;
  };

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setMatches(null);
    setSaved(false);
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'slotex_all' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка парсинга');
      const found = findMatches(data.items as PriceItem[]);
      setMatches(found);
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
    const selected = matches.filter(m => m.selected);

    // Группируем по materialId — один updateMaterial на материал со всеми изменёнными вариантами
    const byMaterial = new Map<string, Map<string, number>>();
    for (const m of selected) {
      if (!byMaterial.has(m.materialId)) byMaterial.set(m.materialId, new Map());
      byMaterial.get(m.materialId)!.set(m.variantId, m.newPrice);
    }

    for (const [materialId, variantPrices] of byMaterial) {
      const mat = store.materials.find(x => x.id === materialId);
      if (!mat?.variants) continue;
      store.updateMaterial(materialId, {
        variants: mat.variants.map(v =>
          variantPrices.has(v.id) ? { ...v, basePrice: variantPrices.get(v.id)! } : v
        ),
      });
    }

    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  // Группировка изменений по серии для отображения
  const seriesLabels: Record<string, string> = {
    k1: 'kapso K1', k2: 'kapso K2', k3: 'kapso K3',
    e1: 'Elga E1',  e2: 'Elga E2',  e3: 'Elga E3',
  };

  return (
    <Modal title="Обновить цены из прайса Slotex" onClose={onClose}>
      <div className="space-y-4">

        {/* Кнопка загрузки */}
        {matches === null && !saved && (
          <>
            <div className="text-xs text-[hsl(var(--text-muted))]">
              Загрузит актуальный прайс по всем сериям и покажет изменившиеся цены
            </div>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {Object.values(seriesLabels).map(label => (
                <span key={label} className="px-2 py-0.5 bg-[hsl(220,12%,16%)] border border-border rounded text-xs text-[hsl(var(--text-dim))]">
                  {label}
                </span>
              ))}
            </div>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading
                ? <><Icon name="Loader2" size={14} className="animate-spin" /> Загружаю прайс...</>
                : <><Icon name="RefreshCw" size={14} /> Загрузить актуальный прайс</>
              }
            </button>
          </>
        )}

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="AlertCircle" size={13} /> {error}
          </div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены обновлены!
          </div>
        )}

        {matches !== null && !saved && (
          <>
            {matches.length === 0 ? (
              <div className="text-sm text-[hsl(var(--text-muted))] text-center py-6 flex flex-col items-center gap-2">
                <Icon name="CheckCircle" size={22} className="text-green-400" />
                Изменений нет — все цены актуальны
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

                <div className="max-h-64 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-1.5 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 0.6fr 1fr 1fr 60px 60px' }}>
                    <span /><span>Серия</span><span>Материал</span><span>Вариант</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                  </div>
                  {matches.map((m, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 0.6fr 1fr 1fr 60px 60px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] font-medium">{seriesLabels[m.series] ?? m.series}</span>
                      <span className="text-xs truncate">{m.materialName}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.variantLabel}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(m.oldPrice)}</span>
                      <span className={`text-xs font-mono text-right font-medium ${m.newPrice > m.oldPrice ? 'text-red-400' : 'text-green-400'}`}>{fmt(m.newPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Выбрано: {selectedCount} из {matches.length}</span>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                      Отмена
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <Icon name="Check" size={14} /> Обновить {selectedCount} цен
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}