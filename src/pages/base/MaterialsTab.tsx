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
import ExcelMappingImportModal from './materials/ExcelMappingImportModal';

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
  const [showArchived, setShowArchived] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);

  // Массовое выделение
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const list = catFiltered.filter(m => showArchived ? m.archived : !m.archived);
    if (!q) return list;
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.article || '').toLowerCase().includes(q) ||
      (m.color || '').toLowerCase().includes(q)
    );
  }, [catFiltered, search, showArchived]);

  // Сбрасываем выделение при смене фильтра
  useEffect(() => { setSelected(new Set()); }, [filteredMaterials]);

  const staleCount = useMemo(() => {
    const now = Date.now();
    return store.materials.filter(m => {
      if (!m.priceUpdatedAt || m.archived) return false;
      const days = Math.floor((now - new Date(m.priceUpdatedAt).getTime()) / 86400000);
      return days >= 30;
    }).length;
  }, [store.materials]);

  const archivedCount = useMemo(() => store.materials.filter(m => m.archived).length, [store.materials]);

  const typeMatSet = useMemo(() => {
    const catIds = new Set(typeFiltered.map(m => m.categoryId).filter(Boolean));
    return { catIds, hasNoCat: typeFiltered.some(m => !m.categoryId) };
  }, [typeFiltered]);

  const visibleCategories = useMemo(() =>
    allCategories.filter(c => typeMatSet.catIds.has(c.id)),
    [allCategories, typeMatSet]
  );
  const hasNoCat = typeMatSet.hasNoCat;

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

  const PAGE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => { setVisibleCount(PAGE); }, [filteredMaterials]);
  const visibleMaterials = filteredMaterials.slice(0, visibleCount);

  // Вспомогательные функции выделения
  const allVisibleIds = visibleMaterials.map(m => m.id);
  const allFilteredIds = filteredMaterials.map(m => m.id);
  const isAllVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const isIndeterminate = !isAllVisibleSelected && allVisibleIds.some(id => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allVisibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...allVisibleIds]));
    }
  };

  const selectAll = () => setSelected(new Set(allFilteredIds));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = () => {
    selected.forEach(id => store.deleteMaterial(id));
    setSelected(new Set());
    setConfirmDelete(false);
  };

  const handleBulkArchive = () => {
    selected.forEach(id => store.updateMaterial(id, { archived: true }));
    setSelected(new Set());
  };

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
                    <button onClick={() => { setShowExcelImport(true); setShowImportMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                      <Icon name="Table" size={13} className="text-emerald-400" /> Импорт из Excel (маппинг)
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

        {staleCount > 0 && !showArchived && (
          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-400">
            <Icon name="Clock" size={13} className="shrink-0" />
            <span className="flex-1">
              <span className="font-medium">{staleCount} материалов</span> не обновлялись более 30 дней — возможно, цены устарели
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowArchived(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${!showArchived ? 'bg-gold/20 text-gold' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
          >
            <Icon name="Package" size={12} /> Активные ({store.materials.filter(m => !m.archived).length})
          </button>
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${showArchived ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            >
              <Icon name="Archive" size={12} /> Архив ({archivedCount})
            </button>
          )}
          {showArchived && archivedCount > 0 && (
            <button
              onClick={() => {
                if (!confirm(`Восстановить все ${archivedCount} архивных материалов?`)) return;
                store.materials.filter(m => m.archived).forEach(m => store.updateMaterial(m.id, { archived: false }));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors ml-auto"
            >
              <Icon name="ArchiveRestore" size={12} /> Восстановить все
            </button>
          )}
        </div>

        {/* Поиск + фильтр */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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

        {/* Панель массовых действий */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-[hsl(220,12%,16%)] border border-gold/30 rounded-lg">
            <span className="text-xs text-gold font-medium">
              Выбрано: {selected.size}
            </span>
            {selected.size < filteredMaterials.length && (
              <button
                onClick={selectAll}
                className="text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
              >
                Выбрать все {filteredMaterials.length}
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {!showArchived && (
                <button
                  onClick={handleBulkArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(220,12%,20%)] border border-border rounded hover:border-[hsl(220,12%,30%)] text-[hsl(var(--text-dim))] hover:text-foreground transition-all"
                >
                  <Icon name="Archive" size={12} /> В архив
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 border border-destructive/30 rounded hover:bg-destructive/20 text-destructive transition-all"
              >
                <Icon name="Trash2" size={12} /> Удалить {selected.size}
              </button>
              <button
                onClick={clearSelection}
                className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Таблица */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: '20px 2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
            {/* Чекбокс "выбрать все видимые" */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                onChange={toggleAllVisible}
                className="w-3.5 h-3.5 rounded accent-gold cursor-pointer"
              />
            </div>
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
            const isSelected = selected.has(m.id);
            return (
              <div
                key={m.id}
                onClick={() => toggleOne(m.id)}
                className={`grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] group transition-colors text-sm cursor-pointer ${
                  isSelected
                    ? 'bg-gold/5 border-b-gold/10'
                    : 'hover:bg-[hsl(220,12%,12%)]'
                }`}
                style={{ gridTemplateColumns: '20px 2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px' }}
              >
                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(m.id)}
                    className="w-3.5 h-3.5 rounded accent-gold cursor-pointer"
                  />
                </div>
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
                <div
                  className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
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
                Показать ещё
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Диалог подтверждения удаления */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <Icon name="Trash2" size={18} className="text-destructive" />
              </div>
              <div>
                <div className="font-semibold text-sm">Удалить материалы?</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                  Будет удалено {selected.size} позиций без возможности восстановления
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex-1 py-2 bg-destructive text-white rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Удалить {selected.size}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалки */}
      {editingMaterial !== null && (
        <MaterialEditModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
        />
      )}
      {showBulkPrice && <BulkPriceModal onClose={() => setShowBulkPrice(false)} />}
      {showPricelistUpdate && <PricelistUpdateModal onClose={() => setShowPricelistUpdate(false)} />}
      {showExcelPrice && <ExcelPriceModal onClose={() => setShowExcelPrice(false)} />}
      {showSkatPrice && <SkatPriceModal onClose={() => setShowSkatPrice(false)} />}
      {showSkatImport && <SkatImportModal onClose={() => setShowSkatImport(false)} />}
      {showBoyardImport && <BoyardImportModal onClose={() => setShowBoyardImport(false)} />}
      {showBoyardPrice && <BoyardPriceModal onClose={() => setShowBoyardPrice(false)} />}
      {showExcelImport && <ExcelMappingImportModal onClose={() => setShowExcelImport(false)} />}

      {/* Модалка изменения цен на % */}
      {showPercentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl p-5 w-full max-w-xs mx-4 animate-fade-in">
            <div className="font-semibold text-sm mb-1">Изменить цены на %</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-3">
              Применится к <span className="text-foreground">{filteredMaterials.length} материалам</span> текущего фильтра
            </div>
            <input
              type="number"
              value={percentVal}
              onChange={e => { setPercentVal(e.target.value); setPercentApplied(false); }}
              placeholder="Например: 10 или -5"
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold mb-3"
              autoFocus
            />
            {percentApplied && (
              <div className="text-xs text-emerald-400 mb-2">Применено к {filteredMaterials.length} позициям</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const pct = parseFloat(percentVal);
                  if (isNaN(pct) || pct === 0) return;
                  filteredMaterials.forEach(m => {
                    const newPrice = Math.round(m.basePrice * (1 + pct / 100));
                    store.updateMaterial(m.id, { basePrice: newPrice });
                  });
                  setPercentApplied(true);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >
                Применить
              </button>
              <button onClick={() => { setShowPercentModal(false); setPercentVal(''); setPercentApplied(false); }}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}