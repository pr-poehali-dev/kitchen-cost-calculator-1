import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

interface PriceItem { product: string; size: string; thickness: number | null; params: string; unit: string; price: number; }
interface Match {
  materialId: string; materialName: string;
  variantId: string; variantLabel: string;
  oldPrice: number; newPrice: number; selected: boolean;
}

const SERIES_LIST = [
  { key: 'e1', label: 'Elga E1', desc: 'Базовая серия' },
  { key: 'e2', label: 'Elga E2', desc: 'Средняя серия' },
  { key: 'e3', label: 'Elga E3', desc: 'Премиум серия' },
  { key: 'k3', label: 'kapso K3', desc: 'Серия kapso' },
];

export default function PricelistUpdateModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [saved, setSaved] = useState(false);

  const normSize = (s: string) =>
    s.replace(/\s/g, '').replace(/[×хx×]/gi, '×').replace(/\.(\d{3})/g, '$1');

  const findMatches = (items: PriceItem[], seriesKey: string): Match[] => {
    const prefix = seriesKey + '_';
    const result: Match[] = [];

    for (const mat of store.materials) {
      if (!mat.variants?.length) continue;
      const seriesVariants = mat.variants.filter(v => v.id.startsWith(prefix));
      if (!seriesVariants.length) continue;

      for (const v of seriesVariants) {
        const vSize = normSize(v.size || '');
        const vThick = v.thickness ?? null;
        const vParams = (v.params || '').replace(/\s/g, '').toLowerCase();

        const match = items.find(item => {
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
            materialId: mat.id, materialName: mat.name,
            variantId: v.id, variantLabel: label,
            oldPrice: v.basePrice, newPrice: match.price, selected: true,
          });
        }
      }
    }
    return result;
  };

  const handleFetch = async (seriesKey: string) => {
    setActiveSeries(seriesKey);
    setLoading(true);
    setError('');
    setMatches(null);
    setSaved(false);
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: seriesKey }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка парсинга');
      const found = findMatches(data.items as PriceItem[], seriesKey);
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
    matches.filter(m => m.selected).forEach(m => {
      const mat = store.materials.find(x => x.id === m.materialId);
      if (!mat?.variants) return;
      store.updateMaterial(m.materialId, {
        variants: mat.variants.map(v => v.id === m.variantId ? { ...v, basePrice: m.newPrice } : v),
      });
    });
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  return (
    <Modal title="Обновить цены из прайса Slotex" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-xs text-[hsl(var(--text-muted))]">
          Выбери серию — система загрузит актуальный прайс и покажет изменившиеся цены
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SERIES_LIST.map(s => (
            <button
              key={s.key}
              onClick={() => handleFetch(s.key)}
              disabled={loading}
              className={`flex flex-col items-start px-4 py-3 rounded-lg border transition-all text-left ${
                activeSeries === s.key
                  ? 'border-gold bg-[hsl(38,40%,14%)] text-gold'
                  : 'border-border bg-[hsl(220,12%,14%)] hover:border-gold/50 hover:text-foreground text-[hsl(var(--text-dim))]'
              } disabled:opacity-50`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="font-semibold text-sm">{s.label}</span>
                {activeSeries === s.key && loading && <Icon name="Loader" size={12} className="animate-spin ml-auto" />}
              </div>
              <span className="text-xs opacity-60 mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{error}</div>
        )}

        {saved && (
          <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
            <Icon name="Check" size={13} /> Цены обновлены!
          </div>
        )}

        {matches !== null && !saved && (
          <>
            {matches.length === 0 ? (
              <div className="text-sm text-[hsl(var(--text-muted))] text-center py-4">
                Изменений нет — цены уже актуальны
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
                    style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}>
                    <span /><span>Материал</span><span>Вариант</span>
                    <span className="text-right">Было</span><span className="text-right">Стало</span>
                  </div>
                  {matches.map((m, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 1fr 65px 65px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
                        {m.selected && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
                      </div>
                      <span className="text-xs truncate">{m.materialName}</span>
                      <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.variantLabel}</span>
                      <span className="text-xs font-mono text-right text-[hsl(var(--text-dim))]">{fmt(m.oldPrice)}</span>
                      <span className="text-xs font-mono text-right text-gold font-semibold">{fmt(m.newPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={selectedCount === 0}
                    className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40">
                    Обновить {selectedCount > 0 ? `(${selectedCount})` : ''} позиций
                  </button>
                  <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                    Отмена
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
