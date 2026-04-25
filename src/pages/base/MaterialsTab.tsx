import { useState } from 'react';
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

  const allTypes = store.settings.materialTypes;
  const allCategories = store.settings.materialCategories || [];

  const typeFiltered = matTypeFilter === 'all'
    ? store.materials
    : store.materials.filter(m => m.typeId === matTypeFilter);

  const filteredMaterials = catFilter === 'all'
    ? typeFiltered
    : catFilter === 'none'
      ? typeFiltered.filter(m => !m.categoryId)
      : typeFiltered.filter(m => m.categoryId === catFilter);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${matTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
            >
              Все ({store.materials.length})
            </button>
            {allTypes.filter(t => store.materials.some(m => m.typeId === t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => onFilterChange(t.id)}
                className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${matTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                style={matTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
              >
                {t.name} ({store.materials.filter(m => m.typeId === t.id).length})
              </button>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowSkatImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              title="Импортировать все материалы СКАТ в базу"
            >
              <Icon name="PackagePlus" size={14} /> Импорт СКАТ
            </button>
            <button
              onClick={() => setShowSkatPrice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              title="Обновить цены из прайса СКАТ"
            >
              <Icon name="RefreshCw" size={14} /> Цены СКАТ
            </button>
            <button
              onClick={() => setShowExcelPrice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              title="Обновить цены из Excel файла"
            >
              <Icon name="FileSpreadsheet" size={14} /> Из Excel
            </button>
            <button
              onClick={() => setShowPricelistUpdate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              title="Обновить цены из Google Sheets прайса"
            >
              <Icon name="RefreshCw" size={14} /> Из прайса
            </button>
            <button
              onClick={() => setShowBulkPrice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
              title="Задать цены сразу нескольким позициям"
            >
              <Icon name="Tags" size={14} /> Цены списком
            </button>
            <button
              onClick={() => setEditingMaterial({ unit: 'м²', typeId: allTypes[0]?.id, basePrice: 0 })}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
            >
              <Icon name="Plus" size={14} /> Добавить материал
            </button>
          </div>
        </div>

        {/* Category filter row */}
        {allCategories.filter(c => typeFiltered.some(m => m.categoryId === c.id)).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            <span className="text-xs text-[hsl(var(--text-muted))] self-center mr-1">Категория:</span>
            <button onClick={() => setCatFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${catFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
              Все
            </button>
            {allCategories.filter(c => typeFiltered.some(m => m.categoryId === c.id)).map(c => {
              const ct = c.typeId ? store.getTypeById(c.typeId) : null;
              return (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catFilter === c.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                  style={catFilter === c.id ? { backgroundColor: ct?.color || '#c8a96e' } : {}}>
                  {c.name}
                </button>
              );
            })}
            {typeFiltered.some(m => !m.categoryId) && (
              <button onClick={() => setCatFilter('none')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${catFilter === 'none' ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
                Без категории
              </button>
            )}
          </div>
        )}

        <div className="bg-[hsl(220,14%,11%)] rounded border border-border">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr 0.7fr 1fr 0.7fr 1fr 28px' }}>
            <span>Наименование</span><span>Производитель</span><span>Поставщик</span><span>Тип</span>
            <span>Категория</span><span>Толщ.</span><span>Цвет</span><span>Артикул</span><span className="text-right">Цена</span><span></span>
          </div>
          {filteredMaterials.length === 0 && (
            <div className="px-4 py-8 text-center text-[hsl(var(--text-muted))] text-sm">Нет материалов</div>
          )}
          {filteredMaterials.map(m => {
            const mfr = store.getManufacturerById(m.manufacturerId);
            const vendor = store.getVendorById(m.vendorId);
            const t = store.getTypeById(m.typeId);
            const cat = store.getCategoryById(m.categoryId);
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
    </>
  );
}