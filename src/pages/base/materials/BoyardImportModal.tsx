import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { getGlobalState } from '@/store/stateCore';
import { useCatalog, bulkUpsertMaterials, loadCatalog } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];
const BOYARD_VENDOR_ID = 'v2'; // Специалист

// Стабильный ключ группы: производитель + название (для матчинга материала в БД)
export function boyardGroupKey(name: string): string {
  return `boyard__group__${name.toLowerCase().replace(/[^а-яa-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
}

// Ключ варианта по артикулу (для обновления цен)
export function boyardVariantId(article: string): string {
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
  count: number;   // кол-во уникальных наименований (материалов)
  variants: number; // кол-во всех позиций (вариантов)
  typeId: string;
}

export default function BoyardImportModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const catalog = useCatalog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0);
  const [items, setItems] = useState<BoyardItem[]>([]);
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState({ created: 0, updated: 0, skipped: 0 });

  // Кол-во старых материалов BOYARD — все производители с именем boyard, article без "boyard__group__"
  const boyardMfrIds = new Set(
    catalog.manufacturers.filter(m => m.name.toLowerCase() === 'boyard').map(m => m.id)
  );
  const legacyCount = catalog.materials.filter(
    m => boyardMfrIds.has(m.manufacturerId) && !m.article?.startsWith('boyard__group__')
  ).length;

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

  const handleImport = async () => {
    setImporting(true);

    const allBoyardMfrs = catalog.manufacturers.filter(m => m.name.toLowerCase() === 'boyard');
    const existingMfr = allBoyardMfrs.find(mfr =>
      catalog.materials.some(mat => mat.manufacturerId === mfr.id && mat.article?.startsWith('boyard__group__'))
    ) ?? allBoyardMfrs[0];

    // Уникальные категории
    const categoryMap = new Map<string, string>(); // category → typeId
    items.forEach(i => categoryMap.set(i.category, i.type_id));

    const categories = Array.from(categoryMap.entries()).map(([cat, typeId]) => ({
      key: cat,
      name: cat,
      typeIds: [typeId],
      note: `BOYARD: ${cat}`,
    }));

    // Группируем позиции по названию — одно название = один материал
    const grouped = new Map<string, BoyardItem[]>();
    items
      .filter(item => item.article && item.article.trim() && item.name && item.name.trim())
      .forEach(item => {
        const key = item.name.trim();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      });

    // Каждая группа → один материал с несколькими вариантами по артикулу
    const materials = Array.from(grouped.entries()).map(([name, group]) => {
      const first = group[0];
      const gKey = boyardGroupKey(name);
      return {
        name,
        typeId: first.type_id,
        vendorId: BOYARD_VENDOR_ID,
        article: gKey,      // groupKey используется как article для матчинга
        groupKey: gKey,
        categoryKey: first.category,
        unit: first.unit as 'шт',
        variants: group.map(item => ({
          variantId: boyardVariantId(item.article),
          article: item.article,       // оригинальный артикул из прайса
          size: item.article,          // отображается как "размер" в карточке
          params: 'розница',
          basePrice: item.price_retail,
        })),
      };
    });

    const beforeIds = new Set(getGlobalState().materials.map(m => m.id));

    // Сначала удаляем старые материалы (article = "boyard__xxx", не "boyard__group__xxx")
    store.deleteLegacyBoyardMaterials();

    const res = store.importSkatBatch(
      { name: 'BOYARD', note: 'Производитель фурнитуры', materialTypeIds: ['mt10', 'mt11', 'mt12'], existingId: existingMfr?.id },
      categories,
      materials
    );

    const afterMaterials = getGlobalState().materials;
    const newMaterials = afterMaterials.filter(m => !beforeIds.has(m.id));
    await bulkUpsertMaterials(newMaterials);
    await loadCatalog();

    setResult(res);
    setImporting(false);
    setStep('done');
  };

  // Превью по категориям
  const groups: PreviewGroup[] = [];
  for (const item of items) {
    let g = groups.find(x => x.category === item.category);
    if (!g) { g = { category: item.category, count: 0, variants: 0, typeId: item.type_id }; groups.push(g); }
    g.variants++;
  }
  // Считаем уникальные наименования по категории
  for (const g of groups) {
    const names = new Set(items.filter(i => i.category === g.category).map(i => i.name));
    g.count = names.size;
  }

  // Общая статистика
  const totalNames = new Set(items.map(i => i.name)).size;
  const existingKeys = new Set(catalog.materials.map(m => m.article).filter(Boolean));
  const toCreate = Array.from(new Set(items.map(i => i.name))).filter(name => !existingKeys.has(boyardGroupKey(name))).length;
  const toUpdate = totalNames - toCreate;

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
                <p>• Позиции группируются по названию: одно название — один материал</p>
                <p>• Разные артикулы одного товара (размеры) — варианты внутри материала</p>
                <p>• Цена: <span className="text-gold font-medium">розница в рублях</span> на дату прайса</p>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Обновление прайса меняет все цены за один клик через кнопку «Цены BOYARD».
            </p>
            {legacyCount > 0 && (
              <div className="flex items-center justify-between gap-3 bg-amber-400/10 border border-amber-400/30 rounded px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <Icon name="AlertTriangle" size={13} className="shrink-0" />
                  Найдено {legacyCount} устаревших материалов BOYARD (старый формат)
                </div>
                <button
                  onClick={() => store.deleteLegacyBoyardMaterials()}
                  className="text-xs text-amber-400 hover:text-amber-300 underline shrink-0 transition-colors"
                >
                  Удалить
                </button>
              </div>
            )}
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
                { label: 'позиций в прайсе', value: items.length, color: 'text-foreground' },
                { label: 'материалов создаётся', value: toCreate, color: 'text-green-400' },
                { label: 'материалов обновляется', value: toUpdate, color: 'text-gold' },
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
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-[hsl(var(--text-muted))]">{g.count} назв.</span>
                      <span className="text-xs text-gold font-medium">{g.variants} арт.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleImport} disabled={importing}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {importing
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Импорт...</>
                  : <><Icon name="Download" size={14} /> Импортировать {totalNames} материалов</>}
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="grid grid-cols-3 gap-2">
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
            <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,14%)] rounded border border-border px-3 py-2">
              Материалы сгруппированы по названию. В карточке каждого материала доступен выбор артикула с ценой.
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90">
              Готово
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}