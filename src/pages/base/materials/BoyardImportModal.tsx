import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];
const BOYARD_VENDOR_ID = 'v2'; // Специалист

// Артикул для матчинга и обновления цен
export function boyardArticle(article: string): string {
  return `boyard__${article.toLowerCase().replace(/[^а-яa-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
}

interface BoyardItem {
  article: string;
  name: string;
  category: string;
  type_id: string;
  price_retail: number;
  unit: string;
}

interface PreviewGroup {
  category: string;
  count: number;
  typeId: string;
}

export default function BoyardImportModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0);
  const [items, setItems] = useState<BoyardItem[]>([]);
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0 });

  const existingArticles = new Set(store.materials.map(m => m.article).filter(Boolean));
  const toCreate = items.filter(i => !existingArticles.has(boyardArticle(i.article))).length;
  const toUpdate = items.length - toCreate;

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'boyard' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');
      setItems(data.items);
      setRate(data.rate);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    setImporting(true);

    const existingMfr = store.manufacturers.find(m => m.name.toLowerCase() === 'boyard');

    // Уникальные категории → группы материалов
    const categoryMap = new Map<string, string>(); // category → typeId
    items.forEach(i => categoryMap.set(i.category, i.type_id));

    const categories = Array.from(categoryMap.entries()).map(([cat, typeId]) => ({
      key: cat,
      name: cat,
      typeIds: [typeId],
      note: `BOYARD: ${cat}`,
    }));

    // Каждый товар — один материал с одним вариантом (розница руб)
    const materials = items.map(item => {
      const article = boyardArticle(item.article);
      return {
        name: item.name,
        typeId: item.type_id,
        vendorId: BOYARD_VENDOR_ID,
        article,
        categoryKey: item.category,
        unit: item.unit as 'шт',
        variants: [{
          variantId: `${article}__retail`,
          size: item.article, // оригинальный артикул в поле size для отображения
          params: 'розница',
          basePrice: item.price_retail,
        }],
      };
    });

    const res = store.importSkatBatch(
      { name: 'BOYARD', note: 'Производитель фурнитуры', materialTypeIds: ['mt10', 'mt11', 'mt12'], existingId: existingMfr?.id },
      categories,
      materials
    );

    setResult(res);
    setImporting(false);
    setStep('done');
  };

  // Превью по категориям
  const groups: PreviewGroup[] = [];
  for (const item of items) {
    let g = groups.find(x => x.category === item.category);
    if (!g) { g = { category: item.category, count: 0, typeId: item.type_id }; groups.push(g); }
    g.count++;
  }

  // Типы для отображения
  const typeNames: Record<string, string> = {
    mt10: 'Фурнитура', mt11: 'Профиль', mt12: 'Кромка', mt13: 'Другое',
  };

  return (
    <Modal title="Импорт фурнитуры BOYARD" onClose={onClose}>
      <div className="space-y-4">

        {step === 'idle' && (
          <>
            <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Что будет загружено:</p>
              <div className="text-xs text-[hsl(var(--text-muted))] space-y-1">
                <p>• Производитель <span className="text-gold font-medium">BOYARD</span>, поставщик <span className="text-gold font-medium">Специалист</span></p>
                <p>• Все позиции: крючки, петли, ручки, направляющие и др.</p>
                <p>• Цена: <span className="text-gold font-medium">розница в рублях</span> на дату прайса</p>
                <p>• Тип материала определяется автоматически по категории</p>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Обновление прайса меняет все цены за один клик через кнопку «Цены BOYARD».
            </p>
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleFetch} disabled={loading}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Загрузка прайса...</>
                  : <><Icon name="Download" size={14} /> Загрузить прайс</>}
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'позиций', value: items.length, color: 'text-foreground' },
                { label: 'создаётся', value: toCreate, color: 'text-green-400' },
                { label: 'обновляется', value: toUpdate, color: 'text-gold' },
              ].map(s => (
                <div key={s.label} className="bg-[hsl(220,12%,14%)] rounded border border-border p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {rate > 0 && (
              <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2 flex items-center gap-2">
                <Icon name="TrendingUp" size={12} className="text-gold shrink-0" />
                Курс на дату прайса: <strong className="text-foreground">{rate.toFixed(4)} ₽/$</strong>
                &nbsp;· Цены розничные в рублях
              </div>
            )}

            <div className="max-h-56 overflow-auto scrollbar-thin space-y-1">
              {groups.map((g, i) => (
                <div key={i} className="bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">{g.category || 'Без категории'}</span>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0">· {typeNames[g.typeId] || g.typeId}</span>
                    </div>
                    <span className="text-xs text-gold font-medium shrink-0 ml-2">{g.count} шт.</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleImport} disabled={importing}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {importing
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Импортирую...</>
                  : <><Icon name="Database" size={14} /> Импортировать {items.length} позиций</>}
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'создано', value: result.created, color: 'text-green-400' },
                { label: 'обновлено', value: result.updated, color: 'text-gold' },
                { label: 'без изменений', value: result.skipped, color: 'text-[hsl(var(--text-muted))]' },
              ].map(s => (
                <div key={s.label} className="bg-[hsl(220,12%,14%)] rounded border border-border p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-3 py-2 flex items-center gap-2">
              <Icon name="Check" size={13} /> Фурнитура BOYARD импортирована в базу материалов
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90">
              Готово
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
}
