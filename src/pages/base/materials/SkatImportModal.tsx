import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';
import { Modal } from '../BaseShared';
import func2url from '../../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

// Артикул-ключ для матчинга при обновлении цен
export function skatArticle(section: string, subsection: string, facadeType: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^а-яa-z0-9]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `skat__${clean(section)}__${clean(subsection)}__${clean(facadeType)}`;
}

interface SkatItem {
  name: string;
  thickness_section: string;
  subsection: string;
  facade_type: string;
  unit: string;
  thickness: number | null;
  price: number;
}

interface PreviewGroup {
  section: string;
  subsection: string;
  items: SkatItem[];
}

const SKAT_TYPE_ID = 'mt9'; // Фасад

export default function SkatImportModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [category, setCategory] = useState('1 кат');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<SkatItem[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ created: 0, skipped: 0 });

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: 'skat', category }),
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

    // 1. Найти или создать производителя СКАТ
    let manufacturer = store.manufacturers.find(m => m.name.toLowerCase() === 'скат');
    if (!manufacturer) {
      store.addManufacturer({
        name: 'СКАТ',
        note: 'Производитель МДФ фасадов',
        materialTypeIds: [SKAT_TYPE_ID],
      });
      // Получаем только что созданного (последний добавленный)
      manufacturer = [...store.manufacturers].reverse().find(m => m.name.toLowerCase() === 'скат')
        || store.manufacturers[store.manufacturers.length - 1];
    }

    // 2. Собрать уникальные подсекции → категории
    const subsectionSet = new Set(items.map(i => i.subsection).filter(Boolean));
    const subsections = Array.from(subsectionSet);

    // Создаём категории которых нет
    const existingCats = store.settings.materialCategories || [];
    const catMap: Record<string, string> = {}; // subsection → categoryId

    for (const sub of subsections) {
      const catNote = `СКАТ: ${sub}`;
      let cat = existingCats.find(c => c.note === catNote);
      if (!cat) {
        store.addMaterialCategory({
          name: shortCatName(sub),
          typeIds: [SKAT_TYPE_ID],
          note: catNote,
        });
        // Последняя добавленная
        const allCats = store.settings.materialCategories || [];
        cat = [...allCats].reverse().find(c => c.note === catNote)
          || allCats[allCats.length - 1];
      }
      if (cat) catMap[sub] = cat.id;
    }

    // 3. Создать материалы
    const mfrId = manufacturer!.id;
    const existingMaterials = store.materials;
    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const article = skatArticle(item.thickness_section, item.subsection, item.facade_type);

      // Проверяем — уже есть такой материал?
      const exists = existingMaterials.some(m => m.article === article);
      if (exists) { skipped++; continue; }

      const catId = item.subsection ? catMap[item.subsection] : undefined;

      store.addMaterial({
        manufacturerId: mfrId,
        name: `${item.facade_type}${item.thickness ? ` ${item.thickness}мм` : ''}`,
        typeId: SKAT_TYPE_ID,
        categoryId: catId,
        thickness: item.thickness || undefined,
        article,
        unit: 'м²',
        basePrice: item.price,
      });
      created++;
    }

    setImportResult({ created, skipped });
    setImporting(false);
    setStep('done');
  };

  // Группируем для превью
  const groups: PreviewGroup[] = [];
  for (const item of items) {
    const key = `${item.thickness_section}||${item.subsection}`;
    let g = groups.find(x => `${x.section}||${x.subsection}` === key);
    if (!g) { g = { section: item.thickness_section, subsection: item.subsection, items: [] }; groups.push(g); }
    g.items.push(item);
  }

  // Уже импортированные
  const existingArticles = new Set(store.materials.map(m => m.article).filter(Boolean));
  const alreadyImported = items.filter(i => existingArticles.has(skatArticle(i.thickness_section, i.subsection, i.facade_type))).length;
  const toCreate = items.length - alreadyImported;

  return (
    <Modal title="Импорт материалов СКАТ" onClose={onClose}>
      <div className="space-y-4">

        {/* Шаг 1: выбор категории */}
        {step === 'select' && (
          <>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              Система создаст производителя <span className="text-foreground font-medium">СКАТ</span>, категории по сериям фрезеровки и все позиции фасадов из прайса. Цены будут привязаны к выбранной категории.
            </p>

            <div>
              <p className="text-xs text-[hsl(var(--text-muted))] mb-2 uppercase tracking-wider">Начальная категория цен</p>
              <div className="flex gap-2 flex-wrap">
                {['1 кат', '2 кат', '3 кат', '4 кат', '5 кат'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      category === cat
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border bg-[hsl(220,12%,14%)] text-[hsl(var(--text-dim))] hover:border-gold/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-2">
                Потом можно обновить на любую другую через «СКАТ» → обновить цены
              </p>
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleFetch}
                disabled={loading}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Загрузка прайса...</>
                  : <><Icon name="Download" size={14} /> Загрузить прайс</>
                }
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Отмена
              </button>
            </div>
          </>
        )}

        {/* Шаг 2: превью */}
        {step === 'preview' && (
          <>
            {/* Итоги */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-center">
                <div className="text-xl font-bold text-gold">{items.length}</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">позиций в прайсе</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-center">
                <div className="text-xl font-bold text-green-400">{toCreate}</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">будет создано</div>
              </div>
              <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-center">
                <div className="text-xl font-bold text-[hsl(var(--text-muted))]">{alreadyImported}</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">уже есть</div>
              </div>
            </div>

            {/* Структура */}
            <div>
              <p className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2">Структура импорта</p>
              <div className="max-h-64 overflow-auto scrollbar-thin space-y-1.5">
                {groups.map((g, gi) => (
                  <div key={gi} className="bg-[hsl(220,12%,14%)] rounded border border-border overflow-hidden">
                    <div className="px-3 py-2 bg-[hsl(220,12%,11%)] flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-gold">{g.section}</span>
                        {g.subsection && (
                          <span className="text-xs text-[hsl(var(--text-muted))] ml-2 truncate">/ {g.subsection}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[hsl(var(--text-muted))] shrink-0 ml-2">{g.items.length} поз.</span>
                    </div>
                    <div className="px-3 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {g.items.map((item, ii) => {
                        const art = skatArticle(item.thickness_section, item.subsection, item.facade_type);
                        const exists = existingArticles.has(art);
                        return (
                          <span key={ii} className={`text-xs ${exists ? 'text-[hsl(var(--text-muted))] line-through' : 'text-[hsl(var(--text-dim))]'}`}>
                            {item.facade_type}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={importing || toCreate === 0}
                className="flex-1 py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing
                  ? <><Icon name="Loader2" size={14} className="animate-spin" /> Создаю материалы...</>
                  : toCreate === 0
                    ? 'Все уже импортированы'
                    : <><Icon name="PackagePlus" size={14} /> Создать {toCreate} материалов</>
                }
              </button>
              <button onClick={() => setStep('select')} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Назад
              </button>
            </div>
          </>
        )}

        {/* Шаг 3: готово */}
        {step === 'done' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-green-400/10 rounded-full flex items-center justify-center mx-auto">
              <Icon name="CheckCircle" size={28} className="text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Импорт завершён</p>
              <p className="text-sm text-[hsl(var(--text-muted))] mt-1">
                Создано <span className="text-gold font-medium">{importResult.created}</span> материалов
                {importResult.skipped > 0 && <>, пропущено {importResult.skipped} (уже были)</>}
              </p>
            </div>
            <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border p-3 text-xs text-[hsl(var(--text-muted))] text-left space-y-1">
              <p className="text-foreground font-medium mb-1.5">Что создано:</p>
              <p>✓ Производитель <span className="text-gold">СКАТ</span> в разделе «Производители»</p>
              <p>✓ Категории по сериям фрезеровки</p>
              <p>✓ {importResult.created} позиций фасадов с ценами категории <span className="text-gold">{category}</span></p>
              <p className="mt-2 text-[hsl(var(--text-muted))]">
                Для обновления цен используй кнопку <span className="text-foreground">«СКАТ»</span> в панели инструментов
              </p>
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

function shortCatName(subsection: string): string {
  // Сокращаем длинные названия серий
  if (subsection.includes('Без фрезер')) return 'Classic / Optima';
  if (subsection.includes('3D волна') || subsection.includes('Classic Plus')) return '3D волна';
  if (subsection.includes('Premium(1)') || subsection.includes('Винтаж')) return 'Premium 1';
  if (subsection.includes('Premium(2)') || subsection.includes('орнамент')) return 'Premium 2';
  if (subsection.includes('Premium(3)') || subsection.includes('Premium(4)')) return 'Premium 3+';
  if (subsection.includes('Люкс') || subsection.includes('Lux')) return 'Люкс';
  if (subsection.includes('Эксклюзив')) return 'Эксклюзив';
  // Обрезаем до 20 символов
  return subsection.length > 22 ? subsection.slice(0, 20) + '…' : subsection;
}
