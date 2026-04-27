import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt } from './BaseShared';
import PricelistUpdateModal from './materials/PricelistUpdateModal';
import BulkPriceModal from './materials/BulkPriceModal';
import MaterialEditModal from './materials/MaterialEditModal';
import ExcelPriceModal from './materials/ExcelPriceModal';
import SkatPriceModal from './materials/SkatPriceModal';
import SkatImportModal from './materials/SkatImportModal';
import BoyardImportModal from './materials/BoyardImportModal';
import BoyardPriceModal from './materials/BoyardPriceModal';

interface Props {
  matTypeFilter: string;
  onFilterChange: (v: string) => void;
}

export default function MaterialsTab({ matTypeFilter, onFilterChange }: Props) {
  const store = useStore();
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [showPricelistUpdate, setShowPricelistUpdate] = useState(false);
  const [showExcelPrice, setShowExcelPrice] = useState(false);
  const [showSkatPrice, setShowSkatPrice] = useState(false);
  const [showSkatImport, setShowSkatImport] = useState(false);
  const [showBoyardImport, setShowBoyardImport] = useState(false);
  const [showBoyardPrice, setShowBoyardPrice] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [percentVal, setPercentVal] = useState('');
  const [percentApplied, setPercentApplied] = useState(false);

  const allTypes = store.settings.materialTypes;
  const allCategories = store.settings.materialCategories || [];

  const typeFiltered = useMemo(() =>
    matTypeFilter === 'all'
      ? store.materials
      : store.materials.filter(m => m.typeId === matTypeFilter),
    [store.materials, matTypeFilter]
  );

  const catFiltered = useMemo(() =>
    catFilter === 'all'
      ? typeFiltered
      : catFilter === 'none'
        ? typeFiltered.filter(m => !m.categoryId)
        : typeFiltered.filter(m => m.categoryId === catFilter),
    [typeFiltered, catFilter]
  );

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catFiltered;
    return catFiltered.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.article || '').toLowerCase().includes(q) ||
      (m.color || '').toLowerCase().includes(q)
    );
  }, [catFiltered, search]);

  const typeMatSet = useMemo(() => {
    const catIds = new Set(typeFiltered.map(m => m.categoryId).filter(Boolean));
    return { catIds, hasNoCat: typeFiltered.some(m => !m.categoryId) };
  }, [typeFiltered]);

  const visibleCategories = useMemo(() =>
    allCategories.filter(c => typeMatSet.catIds.has(c.id)),
    [allCategories, typeMatSet]
  );
  const hasNoCat = typeMatSet.hasNoCat;

  // Предварительные Map для O(1) lookups вместо find() в каждой строке
  const mfrMap = useMemo(() =>
    new Map(store.manufacturers.map(m => [m.id, m])),
    [store.manufacturers]
  );
  const vendorMap = useMemo(() =>
    new Map(store.vendors.map(v => [v.id, v])),
    [store.vendors]
  );
  const typeMap = useMemo(() =>
    new Map(store.settings.materialTypes.map(t => [t.id, t])),
    [store.settings.materialTypes]
  );
  const catMap = useMemo(() =>
    new Map(allCategories.map(c => [c.id, c])),
    [allCategories]
  );

  // Виртуальный рендер — показываем порциями по 100
  const PAGE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => { setVisibleCount(PAGE); }, [filteredMaterials]);
  const visibleMaterials = filteredMaterials.slice(0, visibleCount);

  return (
    <>
      <div>
        {/* Строка 1: фильтр по типу + кнопки действий */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex gap-1 flex-wrap items-center min-w-0">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded text-xs transition-colors shrink-0 ${matTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
            >
              Все ({store.materials.length})
            </button>
            {allTypes.filter(t => store.materials.some(m => m.typeId === t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => onFilterChange(t.id)}
                className={`px-3 py-1.5 rounded text-xs transition-colors font-medium shrink-0 ${matTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                style={matTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
              >
                {t.name} ({store.materials.filter(m => m.typeId === t.id).length})
              </button>
            ))}
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Dropdown: импорт и обновление цен */}
            <div className="relative">
              <button
                onClick={() => setShowImportMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              >
                <Icon name="RefreshCw" size={14} /> Прайсы
                <Icon name="ChevronDown" size={12} className={`transition-transform ${showImportMenu ? 'rotate-180' : ''}`} />
              </button>
              {showImportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl w-52 py-1">
                    <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-border mb-1">СКАТ</div>
                    <button onClick={() => { setShowSkatImport(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="PackagePlus" size={13} className="text-[hsl(var(--text-muted))]" /> Импорт СКАТ
                    </button>
                    <button onClick={() => { setShowSkatPrice(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Цены СКАТ
                    </button>
                    <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-t border-border my-1">BOYARD</div>
                    <button onClick={() => { setShowBoyardImport(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="PackagePlus" size={13} className="text-[hsl(var(--text-muted))]" /> Импорт BOYARD
                    </button>
                    <button onClick={() => { setShowBoyardPrice(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Цены BOYARD
                    </button>
                    <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-t border-border my-1">Другие</div>
                    <button onClick={() => { setShowPricelistUpdate(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Из прайса (Slotex)
                    </button>
                    <button onClick={() => { setShowExcelPrice(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="FileSpreadsheet" size={13} className="text-[hsl(var(--text-muted))]" /> Из Excel
                    </button>
                    <button onClick={() => { setShowBulkPrice(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="Tags" size={13} className="text-[hsl(var(--text-muted))]" /> Цены списком
                    </button>
                    <div className="border-t border-border my-1" />
                    <button onClick={() => { setShowPercentModal(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="Percent" size={13} className="text-amber-400" /> Изменить на %
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setEditingMaterial({ unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
            >
              <Icon name="Plus" size={14} /> Добавить
            </button>
          </div>
        </div>

        {/* Строка 2: поиск + фильтр по категории */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Поиск */}
          <div className="relative flex items-center">
            <Icon name="Search" size={13} className="absolute left-2.5 text-[hsl(var(--text-muted))] pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, артикулу, цвету..."
              className="bg-[hsl(220,12%,14%)] border border-border rounded pl-8 pr-8 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors w-72"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
                <Icon name="X" size={12} />
              </button>
            )}
          </div>

          {/* Категория */}
          {(visibleCategories.length > 0 || hasNoCat) && (
            <>
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="bg-[hsl(220,12%,14%)] border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-gold transition-colors cursor-pointer"
              >
                <option value="all">Все категории</option>
                {visibleCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {hasNoCat && <option value="none">Без категории</option>}
              </select>
              {catFilter !== 'all' && (
                <button onClick={() => setCatFilter('all')} className="text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="X" size={12} /> Сбросить
                </button>
              )}
            </>
          )}

          <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">
            {filteredMaterials.length} позиций
          </span>
        </div>



        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
            <span>Наименование</span><span>Производитель</span><span>Поставщик</span><span>Тип</span>
            <span>Категория</span><span>Толщ.</span><span>Цвет</span><span>Артикул</span><span className="text-right">Цена</span><span></span>
          </div>
          {filteredMaterials.length === 0 && (
            <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов</div>
          )}
          {visibleMaterials.map(m => {
            const mfr = mfrMap.get(m.manufacturerId);
            const vendor = vendorMap.get(m.vendorId || '');
            const t = typeMap.get(m.typeId);
            const cat = catMap.get(m.categoryId || '');
            return (
              <div key={m.id} className="grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,12%,12%)] group transition-colors text-sm"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
                <div className="flex items-center gap-2 truncate">
                  {t && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />}
                  <span className="truncate text-foreground">{m.name}</span>
                </div>
                <span className="text-xs text-[hsl(var(--text-dim))]">{mfr?.name || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{vendor?.name || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{t?.name || '—'}</span>
                {cat
                  ? <span className="text-xs font-medium text-gold">{cat.name}</span>
                  : <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
                }
                <span className="text-xs text-[hsl(var(--text-dim))]">{m.thickness ? `${m.thickness}мм` : '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))] truncate">{m.color || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{m.article || '—'}</span>
                <span className="text-right font-mono text-sm">{fmt(m.basePrice)} <span className="text-[hsl(var(--text-muted))] text-xs">/{m.unit}</span></span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingMaterial(m)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="Pencil" size={12} /></button>
                  <button onClick={() => store.deleteMaterial(m.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive"><Icon name="Trash2" size={12} /></button>
                </div>
              </div>
            );
          })}
          {visibleCount < filteredMaterials.length && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-[hsl(var(--text-muted))]">
              <span>Показано {visibleCount} из {filteredMaterials.length}</span>
              <button
                onClick={() => setVisibleCount(c => c + PAGE)}
                className="px-3 py-1.5 bg-[hsl(220,12%,16%)] hover:bg-[hsl(220,12%,20%)] rounded transition-colors text-foreground"
              >
                Показать ещё {Math.min(PAGE, filteredMaterials.length - visibleCount)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: SKAT import */}
      {showSkatImport && (
        <SkatImportModal onClose={() => setShowSkatImport(false)} />
      )}

      {/* Modal: SKAT price update */}
      {showSkatPrice && (
        <SkatPriceModal onClose={() => setShowSkatPrice(false)} />
      )}

      {/* Modal: BOYARD import */}
      {showBoyardImport && (
        <BoyardImportModal onClose={() => setShowBoyardImport(false)} />
      )}

      {/* Modal: BOYARD price update */}
      {showBoyardPrice && (
        <BoyardPriceModal onClose={() => setShowBoyardPrice(false)} />
      )}

      {/* Modal: Excel price update */}
      {showExcelPrice && (
        <ExcelPriceModal onClose={() => setShowExcelPrice(false)} />
      )}

      {/* Modal: Pricelist update */}
      {showPricelistUpdate && (
        <PricelistUpdateModal onClose={() => setShowPricelistUpdate(false)} />
      )}

      {/* Modal: Bulk price */}
      {showBulkPrice && (
        <BulkPriceModal
          materials={filteredMaterials}
          onClose={() => setShowBulkPrice(false)}
        />
      )}

      {/* Modal: Material */}
      {editingMaterial !== null && (
        <MaterialEditModal
          editingMaterial={editingMaterial}
          onChange={setEditingMaterial}
          onClose={() => setEditingMaterial(null)}
        />
      )}

      {/* Modal: Массовое обновление цен на % */}
      {showPercentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">Изменить цены на %</span>
              <button onClick={() => { setShowPercentModal(false); setPercentApplied(false); }} className="text-[hsl(var(--text-muted))] hover:text-foreground">
                <Icon name="X" size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-[hsl(var(--text-muted))]">
                Применяется к <span className="text-foreground font-medium">{filteredMaterials.length}</span> материалам
                {matTypeFilter !== 'all' && <> типа «{allTypes.find(t => t.id === matTypeFilter)?.name}»</>}
                {catFilter !== 'all' && <> в выбранной категории</>}.
              </p>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
                  Процент изменения
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={percentVal}
                    onChange={e => setPercentVal(e.target.value)}
                    placeholder="например +5 или -10"
                    className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                  <span className="text-[hsl(var(--text-muted))]">%</span>
                </div>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Положительное — повышение, отрицательное — снижение
                </p>
              </div>
              {percentApplied && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400">
                  <Icon name="Check" size={12} /> Цены обновлены
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const pct = parseFloat(percentVal);
                    if (isNaN(pct) || pct === 0) return;
                    filteredMaterials.forEach(m => {
                      const newPrice = Math.round(m.basePrice * (1 + pct / 100));
                      store.updateMaterial(m.id, { basePrice: Math.max(0, newPrice) });
                    });
                    setPercentApplied(true);
                    setPercentVal('');
                  }}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >
                  Применить
                </button>
                <button
                  onClick={() => { setShowPercentModal(false); setPercentApplied(false); }}
                  className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}