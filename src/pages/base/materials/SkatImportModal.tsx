import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];
const SKAT_TYPE_ID = 'mt2'; // МДФ
const SKAT_VENDOR_ID = 'v2'; // Специалист
const CATEGORIES = ['1 кат', '2 кат', '3 кат', '4 кат', '5 кат'];

export function skatArticle(section: string, subsection: string, facadeType: string): string {
  const clean = (s: string) => (s || '').toLowerCase().replace(/[^а-яa-z0-9]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `skat__${clean(section)}__${clean(subsection)}__${clean(facadeType)}`;
}

export function skatVariantId(article: string, cat: string): string {
  return `${article}__${cat.replace(' ', '')}`;
}

interface SkatAllItem {
  thickness_section: string;
  subsection: string;
  facade_type: string;
  unit: string;
  thickness: number | null;
  prices: Record<string, number>;
}

interface PreviewGroup {
  section: string;
  count: number;
  subsections: string[];
}

function shortCatName(subsection: string): string {
  if (subsection.includes('Без фрезер')) return 'Classic / Optima';
  if (subsection.includes('3D волна') || subsection.includes('Classic Plus')) return '3D волна';
  if (subsection.includes('Premium(1)') || subsection.includes('Винтаж')) return 'Premium 1';
  if (subsection.includes('Premium(2)') || subsection.includes('орнамент')) return 'Premium 2';
  if (subsection.includes('Premium(3)') || subsection.includes('Premium(4)')) return 'Premium 3+';
  if (subsection.includes('Люкс') || subsection.includes('Lux')) return 'Люкс';
  if (subsection.includes('Эксклюзив')) return 'Эксклюзив';
  return subsection.length > 22 ? subsection.slice(0, 20) + '…' : subsection;
}

export default function SkatImportModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<SkatAllItem[]>([]);
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0 });

  const existingArticles = new Set(store.materials.map(m => m.article).filter(Boolean));
  const toCreate = items.filter(i => !existingArticles.has(skatArticle(i.thickness_section, i.subsection, i.facade_type))).length;
  const toUpdate = items.length - toCreate;

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'skat_all' }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Ошибка загрузки');
      setItems(data.items);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    setImporting(true);

    const existingMfr = store.manufacturers.find(m => m.name.toLowerCase() === 'скат');

    // Категории по подсекциям
    const subsections = Array.from(new Set(items.map(i => i.subsection).filter(Boolean)));
    const categories = subsections.map(sub => ({
      key: sub,
      name: shortCatName(sub),
      typeIds: [SKAT_TYPE_ID],
      note: `СКАТ: ${sub}`,
    }));

    // Материалы с 5 вариантами
    const materials = items.map(item => {
      const article = skatArticle(item.thickness_section, item.subsection, item.facade_type);
      const variants = CATEGORIES
        .filter(cat => item.prices[cat] > 0)
        .map(cat => ({
          variantId: skatVariantId(article, cat),
          params: cat,
          basePrice: item.prices[cat],
        }));
      return {
        name: item.facade_type,
        typeId: SKAT_TYPE_ID,
        vendorId: SKAT_VENDOR_ID,
        thickness: item.thickness || undefined,
        article,
        categoryKey: item.subsection || undefined,
        unit: 'м²' as const,
        variants,
      };
    });

    const res = store.importSkatBatch(
      { name: 'СКАТ', note: 'Производитель МДФ фасадов', materialTypeIds: [SKAT_TYPE_ID], existingId: existingMfr?.id },
      categories,
      materials
    );

    // Патч уже существующих материалов СКАТ (если импорт был раньше)
    store.patchSkatMaterials(SKAT_TYPE_ID, SKAT_VENDOR_ID);

    setResult(res);
    setImporting(false);
    setStep('done');
  };

  // Превью по секциям
  const groups: PreviewGroup[] = [];
  for (const item of items) {
    let g = groups.find(x => x.section === item.thickness_section);
    if (!g) { g = { section: item.thickness_section, count: 0, subsections: [] }; groups.push(g); }
    g.count++;
    if (item.subsection && !g.subsections.includes(item.subsection)) g.subsections.push(item.subsection);
  }

  return (
    <Modal title="Импорт материалов СКАТ" onClose={onClose}>
      <div className="space-y-4">

        {step === 'idle' && (
          <>
            <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Что будет создано:</p>
              <div className="text-xs text-[hsl(var(--text-muted))] space-y-1">
                <p>• Производитель <span className="text-gold font-medium">СКАТ</span></p>
                <p>• Категории по сериям фрезеровки</p>
                <p>• <span className="text-gold font-medium">141 материал</span> — каждый с 5 вариантами цен (1–5 кат)</p>
                <p>• Итого <span className="text-gold font-medium">705 цен</span> в базе</p>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              При расчёте выбираешь фасад → появляется picker с категориями цен → указываешь нужную.
              Обновление прайса меняет все 705 цен за один клик.
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'позиций', value: items.length, color: 'text-foreground' },
                { label: 'будет создано', value: toCreate, color: 'text-green-400' },
                { label: 'обновится', value: toUpdate, color: 'text-gold' },
              ].map(s => (
                <div key={s.label} className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-[hsl(var(--text-muted))] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2 flex items-center gap-2">
              <Icon name="Info" size={12} className="text-gold shrink-0" />
              Каждый материал получит <strong className="text-foreground">5 вариантов</strong> — по одному на каждую ценовую категорию
            </div>

            <div className="max-h-56 overflow-auto scrollbar-thin space-y-1.5">
              {groups.map((g, i) => (
                <div key={i} className="bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-gold">{g.section}</span>
                    <span className="text-[10px] text-[hsl(var(--text-muted))]">{g.count} поз.</span>
                  </div>
                  <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
                    {g.subsections.map((sub, j) => (
                      <span key={j} className="text-[10px] bg-[hsl(220,12%,18%)] text-[hsl(var(--text-dim))] px-2 py-0.5 rounded">
                        {shortCatName(sub)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleImport} disabled={importing}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {importing
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Создаю {items.length} материалов...</>
                  : <><Icon name="PackagePlus" size={14} /> Создать {items.length} материалов (705 цен)</>}
              </button>
              <button onClick={() => setStep('idle')} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Назад</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-green-400/10 rounded-full flex items-center justify-center mx-auto">
              <Icon name="CheckCircle" size={28} className="text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Импорт завершён</p>
              <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                {result.created > 0 && <span>Создано <span className="text-gold font-medium">{result.created}</span> материалов. </span>}
                {result.updated > 0 && <span>Обновлено <span className="text-gold font-medium">{result.updated}</span>. </span>}
                {result.skipped > 0 && <span>Без изменений: {result.skipped}.</span>}
              </p>
            </div>
            <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-xs text-[hsl(var(--text-muted))] text-left space-y-1">
              <p className="text-foreground font-medium mb-1">Как использовать:</p>
              <p>1. В расчёте выбери фасад СКАТ из списка материалов</p>
              <p>2. Откроется выбор варианта — выбери нужную категорию (1–5 кат)</p>
              <p>3. Для обновления цен: <span className="text-gold">«Цены СКАТ»</span> обновит все 705 цен</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90">
              Готово
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}