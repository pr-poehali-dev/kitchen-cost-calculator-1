import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Material } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Field, Modal } from './BaseShared';
import VariantsEditor from './VariantsEditor';
import func2url from '../../../backend/func2url.json';

const PARSE_URL = (func2url as Record<string, string>)['parse-pricelist'];

// Элемент из прайса пришедший с бэкенда
interface PriceItem { product: string; size: string; thickness: number | null; unit: string; price: number; }

// Совпадение между позицией прайса и вариантом материала в базе
interface Match {
  materialId: string;
  materialName: string;
  variantId: string;
  variantLabel: string;
  oldPrice: number;
  newPrice: number;
  selected: boolean;
}

function PricelistUpdateModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [url, setUrl] = useState('https://docs.google.com/spreadsheets/d/1iUXAMLxwavErr11pwQROnkZX22RAxhiVb1THG_xNwQM/edit#gid=1989291696');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [saved, setSaved] = useState(false);

  const normalize = (s: string) =>
    s.toLowerCase()
     .replace(/\s+/g, '')
     .replace(/[×хx]/g, '×')
     .replace(/\.(\d{3})/g, '$1');

  const findMatches = (items: PriceItem[]): Match[] => {
    const result: Match[] = [];
    for (const mat of store.materials) {
      if (!mat.variants?.length) continue;
      for (const v of mat.variants) {
        const vSize = normalize(v.size || '');
        const vThick = v.thickness;
        // Ищем совпадение по размеру и толщине
        const match = items.find(item => {
          const iSize = normalize(item.size);
          const thickMatch = vThick == null || item.thickness == null || Math.abs(vThick - item.thickness) < 0.1;
          return iSize === vSize && thickMatch && item.price > 0;
        });
        if (match && match.price !== v.basePrice) {
          const label = [v.size, v.thickness ? `${v.thickness}мм` : '', v.params].filter(Boolean).join(' ');
          result.push({
            materialId: mat.id,
            materialName: mat.name,
            variantId: v.id,
            variantLabel: label,
            oldPrice: v.basePrice,
            newPrice: match.price,
            selected: true,
          });
        }
      }
      // Для материалов без вариантов — совпадение по названию
      if (!mat.variants?.length) {
        const matName = normalize(mat.name);
        const match = items.find(item => normalize(item.product).includes(matName) || matName.includes(normalize(item.product)));
        if (match && match.price !== mat.basePrice && match.price > 0) {
          result.push({
            materialId: mat.id,
            materialName: mat.name,
            variantId: '',
            variantLabel: 'базовая цена',
            oldPrice: mat.basePrice,
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
    try {
      const res = await fetch(PARSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
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

  const toggle = (idx: number) => {
    setMatches(prev => prev ? prev.map((m, i) => i === idx ? { ...m, selected: !m.selected } : m) : null);
  };

  const handleSave = () => {
    if (!matches) return;
    matches.filter(m => m.selected).forEach(m => {
      if (m.variantId) {
        const mat = store.materials.find(x => x.id === m.materialId);
        if (!mat?.variants) return;
        const newVariants = mat.variants.map(v => v.id === m.variantId ? { ...v, basePrice: m.newPrice } : v);
        store.updateMaterial(m.materialId, { variants: newVariants });
      } else {
        store.updateMaterial(m.materialId, { basePrice: m.newPrice });
      }
    });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  const selectedCount = matches?.filter(m => m.selected).length ?? 0;

  return (
    <Modal title="Обновить цены из прайса" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-xs text-[hsl(var(--text-muted))]">
          Вставь ссылку на Google Sheets прайс. Система сравнит размеры и обновит цены совпавших вариантов.
        </div>

        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/..."
            className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors"
          />
          <button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {loading ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Download" size={14} />}
            {loading ? 'Загрузка...' : 'Загрузить'}
          </button>
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
                Совпадений не найдено — возможно цены уже актуальны
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--text-muted))]">Найдено изменений: <span className="text-gold font-medium">{matches.length}</span></span>
                  <div className="flex gap-2">
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: true })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">выбрать все</button>
                    <span className="text-[hsl(var(--text-muted))]">·</span>
                    <button onClick={() => setMatches(m => m?.map(x => ({ ...x, selected: false })) ?? null)} className="text-xs text-[hsl(var(--text-muted))] hover:text-gold">снять все</button>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto scrollbar-thin bg-[hsl(220,12%,14%)] rounded border border-border">
                  <div className="grid text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] px-3 py-2 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
                    style={{ gridTemplateColumns: '20px 1fr 1fr 70px 70px' }}>
                    <span />
                    <span>Материал</span>
                    <span>Вариант</span>
                    <span className="text-right">Было</span>
                    <span className="text-right">Стало</span>
                  </div>
                  {matches.map((m, idx) => (
                    <div key={idx}
                      className="grid items-center gap-2 px-3 py-2 border-b border-[hsl(220,12%,17%)] last:border-0 cursor-pointer hover:bg-[hsl(220,12%,16%)]"
                      style={{ gridTemplateColumns: '20px 1fr 1fr 70px 70px' }}
                      onClick={() => toggle(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${m.selected ? 'bg-gold border-gold' : 'border-border'}`}>
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
                  <button
                    onClick={handleSave}
                    disabled={selectedCount === 0}
                    className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                  >
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

function BulkPriceModal({ materials, onClose }: { materials: Material[]; onClose: () => void }) {
  const store = useStore();
  const [prices, setPrices] = useState<Record<string, string>>(
    () => Object.fromEntries(materials.map(m => [m.id, m.basePrice > 0 ? String(m.basePrice) : '']))
  );

  const changed = materials.filter(m => {
    const val = parseFloat(prices[m.id] || '0');
    return val !== m.basePrice && !isNaN(val);
  });

  const handleSave = () => {
    changed.forEach(m => {
      const val = parseFloat(prices[m.id]);
      if (!isNaN(val)) store.updateMaterial(m.id, { basePrice: val });
    });
    onClose();
  };

  return (
    <Modal title={`Массовое редактирование цен (${materials.length} позиций)`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-[hsl(var(--text-muted))] mb-1">
          Введи закупочную цену для каждой позиции. Пустые — не изменятся.
        </div>

        <div className="bg-[hsl(220,12%,14%)] rounded border border-border overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
          <div className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-3 py-2 border-b border-border sticky top-0 bg-[hsl(220,12%,14%)]"
            style={{ gridTemplateColumns: '1fr 60px 120px' }}>
            <span>Материал</span><span className="text-center">Толщ.</span><span className="text-right">Цена, ₽/м²</span>
          </div>
          {materials.map(m => (
            <div key={m.id}
              className="grid items-center px-3 py-1.5 border-b border-[hsl(220,12%,17%)] last:border-0"
              style={{ gridTemplateColumns: '1fr 60px 120px' }}
            >
              <div className="min-w-0">
                <div className="text-sm truncate">{m.color || m.name}</div>
                {m.article && <div className="text-xs text-[hsl(var(--text-muted))]">{m.article}</div>}
              </div>
              <div className="text-xs text-[hsl(var(--text-dim))] text-center">{m.thickness ? `${m.thickness}мм` : '—'}</div>
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  value={prices[m.id]}
                  onChange={e => setPrices(p => ({ ...p, [m.id]: e.target.value }))}
                  placeholder={m.basePrice > 0 ? String(m.basePrice) : '0'}
                  className={`w-24 text-right bg-[hsl(220,12%,18%)] border rounded px-2 py-1 text-sm font-mono outline-none focus:border-gold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    prices[m.id] && parseFloat(prices[m.id]) !== m.basePrice ? 'border-gold/50 text-gold' : 'border-border'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {changed.length > 0 && (
          <div className="text-xs text-[hsl(var(--text-muted))]">
            Будет изменено: <span className="text-gold font-medium">{changed.length}</span> позиций
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={changed.length === 0}
            className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-40">
            Сохранить изменения
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}

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
        <Modal title={editingMaterial.id ? 'Изменить материал' : 'Новый материал'} onClose={() => setEditingMaterial(null)}>
          <div className="space-y-3">
            <Field label="Наименование" value={editingMaterial.name || ''} onChange={v => setEditingMaterial(p => ({ ...p!, name: v }))} required />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Производитель</label>
                <select value={editingMaterial.manufacturerId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, manufacturerId: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {store.manufacturers.map(m => <option key={m.id} value={m.id} className="bg-[hsl(220,14%,11%)]">{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Поставщик</label>
                <select value={editingMaterial.vendorId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, vendorId: e.target.value || undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— не указан —</option>
                  {store.vendors.map(v => <option key={v.id} value={v.id} className="bg-[hsl(220,14%,11%)]">{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип материала <span className="text-gold">*</span></label>
                <select value={editingMaterial.typeId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, typeId: e.target.value, categoryId: undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— выбрать —</option>
                  {allTypes.map(t => <option key={t.id} value={t.id} className="bg-[hsl(220,14%,11%)]">{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Категория</label>
                <select value={editingMaterial.categoryId || ''} onChange={e => setEditingMaterial(p => ({ ...p!, categoryId: e.target.value || undefined }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  <option value="">— не указана —</option>
                  {store.getCategoriesForType(editingMaterial.typeId).map(c => (
                    <option key={c.id} value={c.id} className="bg-[hsl(220,14%,11%)]">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select value={editingMaterial.unit || 'м²'} onChange={e => setEditingMaterial(p => ({ ...p!, unit: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
                  {store.settings.units.map(u => <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Толщина, мм" value={String(editingMaterial.thickness || '')} onChange={v => setEditingMaterial(p => ({ ...p!, thickness: parseFloat(v) || undefined }))} type="number" />
              <Field label="Цвет" value={editingMaterial.color || ''} onChange={v => setEditingMaterial(p => ({ ...p!, color: v }))} />
              <Field label="Артикул" value={editingMaterial.article || ''} onChange={v => setEditingMaterial(p => ({ ...p!, article: v }))} />
            </div>
            <Field label="Базовая цена (если нет вариантов)" value={String(editingMaterial.basePrice || '')} onChange={v => setEditingMaterial(p => ({ ...p!, basePrice: parseFloat(v) || 0 }))} type="number" required />
            <VariantsEditor
              variants={editingMaterial.variants || []}
              unit={editingMaterial.unit || 'шт'}
              onChange={variants => setEditingMaterial(p => ({ ...p!, variants }))}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!editingMaterial.name || !editingMaterial.typeId) return;
                  if (editingMaterial.id) store.updateMaterial(editingMaterial.id, editingMaterial);
                  else store.addMaterial(editingMaterial as Omit<Material, 'id'>);
                  setEditingMaterial(null);
                }}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
              >Сохранить</button>
              <button onClick={() => setEditingMaterial(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}