import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import PricelistUpdateModal from './materials/PricelistUpdateModal';
import BulkPriceModal from './materials/BulkPriceModal';
import MaterialEditModal from './materials/MaterialEditModal';
import ExcelPriceModal from './materials/ExcelPriceModal';
import SkatPriceModal from './materials/SkatPriceModal';
import SkatImportModal from './materials/SkatImportModal';
import BoyardImportModal from './materials/BoyardImportModal';
import BoyardPriceModal from './materials/BoyardPriceModal';
import ExcelMappingImportModal from './materials/ExcelMappingImportModal';
import TmfImportModal from './materials/TmfImportModal';
import TmfPriceModal from './materials/TmfPriceModal';
import MatTypeBar from './materials/MatTypeBar';
import MatFilterBar from './materials/MatFilterBar';
import MatTable from './materials/MatTable';

interface Props {
  matTypeFilter: string;
  onFilterChange: (v: string) => void;
}

const PAGE = 100;

export default function MaterialsTab({ matTypeFilter, onFilterChange }: Props) {
  const store = useStore();

  // Состояние модалок
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [showPricelistUpdate, setShowPricelistUpdate] = useState(false);
  const [showExcelPrice, setShowExcelPrice] = useState(false);
  const [showSkatPrice, setShowSkatPrice] = useState(false);
  const [showSkatImport, setShowSkatImport] = useState(false);
  const [showBoyardImport, setShowBoyardImport] = useState(false);
  const [showBoyardPrice, setShowBoyardPrice] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showTmfImport, setShowTmfImport] = useState(false);
  const [showTmfPrice, setShowTmfPrice] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [percentVal, setPercentVal] = useState('');
  const [percentApplied, setPercentApplied] = useState(false);

  // Состояние фильтров
  const [catFilter, setCatFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Массовое выделение
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Пагинация
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const allTypes = store.settings.materialTypes;
  const allCategories = useMemo(
    () => store.settings.materialCategories || [],
    [store.settings.materialCategories]
  );

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

  // Сбрасываем выделение и пагинацию при смене фильтра
  useEffect(() => {
    setSelected(new Set());
    setVisibleCount(PAGE);
  }, [filteredMaterials]);

  const staleCount = useMemo(() => {
    const now = Date.now();
    return store.materials.filter(m => {
      if (!m.priceUpdatedAt || m.archived) return false;
      return Math.floor((now - new Date(m.priceUpdatedAt).getTime()) / 86400000) >= 30;
    }).length;
  }, [store.materials]);

  const archivedCount = useMemo(
    () => store.materials.filter(m => m.archived).length,
    [store.materials]
  );

  const typeMatSet = useMemo(() => {
    const catIds = new Set(typeFiltered.map(m => m.categoryId).filter(Boolean));
    return { catIds, hasNoCat: typeFiltered.some(m => !m.categoryId) };
  }, [typeFiltered]);

  const visibleCategories = useMemo(
    () => allCategories.filter(c => typeMatSet.catIds.has(c.id)),
    [allCategories, typeMatSet]
  );

  const mfrMap = useMemo(
    () => new Map(store.manufacturers.map(m => [m.id, m])),
    [store.manufacturers]
  );
  const vendorMap = useMemo(
    () => new Map(store.vendors.map(v => [v.id, v])),
    [store.vendors]
  );
  const typeMap = useMemo(
    () => new Map(store.settings.materialTypes.map(t => [t.id, t])),
    [store.settings.materialTypes]
  );
  const catMap = useMemo(
    () => new Map(allCategories.map(c => [c.id, c])),
    [allCategories]
  );

  const visibleMaterials = filteredMaterials.slice(0, visibleCount);

  // Логика выделения
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
        <MatTypeBar
          matTypeFilter={matTypeFilter}
          onFilterChange={onFilterChange}
          showImportMenu={showImportMenu}
          onToggleImportMenu={() => setShowImportMenu(v => !v)}
          onCloseImportMenu={() => setShowImportMenu(false)}
          onAddMaterial={() => setEditingMaterial({ unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
          priceMenu={{
            onSkatImport: () => setShowSkatImport(true),
            onSkatPrice: () => setShowSkatPrice(true),
            onBoyardImport: () => setShowBoyardImport(true),
            onBoyardPrice: () => setShowBoyardPrice(true),
            onPricelistUpdate: () => setShowPricelistUpdate(true),
            onExcelPrice: () => setShowExcelPrice(true),
            onBulkPrice: () => setShowBulkPrice(true),
            onExcelImport: () => setShowExcelImport(true),
            onTmfImport: () => setShowTmfImport(true),
            onTmfPrice: () => setShowTmfPrice(true),
            onPercentModal: () => setShowPercentModal(true),
          }}
        />

        <MatFilterBar
          search={search}
          onSearchChange={setSearch}
          catFilter={catFilter}
          onCatFilterChange={setCatFilter}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          staleCount={staleCount}
          archivedCount={archivedCount}
          visibleCategories={visibleCategories}
          hasNoCat={typeMatSet.hasNoCat}
          filteredCount={filteredMaterials.length}
          selectedSize={selected.size}
          totalFilteredCount={allFilteredIds.length}
          onSelectAll={() => setSelected(new Set(allFilteredIds))}
          onBulkArchive={handleBulkArchive}
          onBulkDeleteRequest={() => setConfirmDelete(true)}
          onClearSelection={() => setSelected(new Set())}
        />

        <MatTable
          visibleMaterials={visibleMaterials}
          filteredCount={filteredMaterials.length}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount(c => c + PAGE)}
          mfrMap={mfrMap}
          vendorMap={vendorMap}
          typeMap={typeMap}
          catMap={catMap}
          selected={selected}
          isAllVisibleSelected={isAllVisibleSelected}
          isIndeterminate={isIndeterminate}
          onToggleOne={toggleOne}
          onToggleAllVisible={toggleAllVisible}
          onEdit={m => setEditingMaterial(m)}
          onDelete={id => store.deleteMaterial(id)}
          PAGE={PAGE}
        />
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
          editingMaterial={editingMaterial}
          onChange={setEditingMaterial}
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
      {showTmfImport && <TmfImportModal onClose={() => setShowTmfImport(false)} />}
      {showTmfPrice && <TmfPriceModal onClose={() => setShowTmfPrice(false)} />}

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
                    store.updateMaterial(m.id, { basePrice: Math.round(m.basePrice * (1 + pct / 100)) });
                  });
                  setPercentApplied(true);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >
                Применить
              </button>
              <button
                onClick={() => { setShowPercentModal(false); setPercentVal(''); setPercentApplied(false); }}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}