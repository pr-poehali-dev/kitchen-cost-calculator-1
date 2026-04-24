import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { MaterialType, MaterialCategory } from '@/store/types';
import Icon from '@/components/ui/icon';

const COLOR_PRESETS = [
  '#c8a96e', '#a0c878', '#78b4c8', '#c8a050', '#b4b4b4',
  '#a0d4e8', '#d0d8e8', '#c8785a', '#b478c8', '#c8c850',
  '#909090', '#e8b478', '#787878', '#e87878', '#78e8a0',
];

function Section({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-[hsl(220,14%,11%)] rounded border ${danger ? 'border-destructive/30' : 'border-border'} p-5`}>
      <div className={`text-xs uppercase tracking-wider mb-4 font-medium ${danger ? 'text-destructive' : 'text-[hsl(var(--text-muted))]'}`}>{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const store = useStore();
  const [newUnit, setNewUnit] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingType, setEditingType] = useState<Partial<MaterialType> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<MaterialCategory> | null>(null);
  const [catTypeFilter, setCatTypeFilter] = useState<string>('all');

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    store.addUnit(newUnit.trim());
    setNewUnit('');
  };

  const categories = store.settings.materialCategories || [];
  const filteredCategories = catTypeFilter === 'all'
    ? categories
    : categories.filter(c => c.typeId === catTypeFilter || !c.typeId);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Настройки</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Справочники, единицы измерения, типы и категории материалов</p>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-5 max-w-3xl">

        {/* Currency */}
        <Section title="Валюта">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Символ валюты</label>
              <input
                value={store.settings.currency}
                onChange={e => store.updateSettings({ currency: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
                placeholder="₽" maxLength={3}
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-[hsl(220,12%,14%)] rounded px-3 py-2 text-sm text-[hsl(var(--text-dim))]">
                Пример: <span className="font-mono text-foreground">152 500 {store.settings.currency}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Units */}
        <Section title="Единицы измерения">
          <div className="flex flex-wrap gap-2 mb-3">
            {store.settings.units.map(u => (
              <div key={u} className="flex items-center gap-1 bg-[hsl(220,12%,16%)] border border-border rounded pl-3 pr-1.5 py-1">
                <span className="text-sm text-foreground">{u}</span>
                <button onClick={() => store.deleteUnit(u)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors ml-1">
                  <Icon name="X" size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUnit()}
              placeholder="Новая единица (напр. пог.м)"
              className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            />
            <button onClick={handleAddUnit} className="flex items-center gap-1.5 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
              <Icon name="Plus" size={14} /> Добавить
            </button>
          </div>
        </Section>

        {/* Material Types */}
        <Section title="Типы материалов">
          <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">
            Используются для группировки материалов в Базе и фильтрации в блоках Расчёта
          </div>
          <div className="space-y-1.5 mb-4">
            {store.settings.materialTypes.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />
                <span className="flex-1 text-sm text-foreground">{t.name}</span>
                <span className="text-xs text-[hsl(var(--text-muted))] font-mono">
                  {store.materials.filter(m => m.typeId === t.id).length} матер.
                </span>
                <span className="text-xs text-[hsl(var(--text-muted))]">
                  {categories.filter(c => c.typeId === t.id).length > 0 && `${categories.filter(c => c.typeId === t.id).length} катег.`}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingType(t)} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors">
                    <Icon name="Pencil" size={12} />
                  </button>
                  <button onClick={() => store.deleteMaterialType(t.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors">
                    <Icon name="Trash2" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setEditingType({ name: '', color: COLOR_PRESETS[0] })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all"
          >
            <Icon name="Plus" size={14} /> Добавить тип
          </button>
        </Section>

        {/* Material Categories */}
        <Section title="Категории материалов">
          <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">
            Подкатегории внутри типов — например Е1, Е2, Kapso у Столешниц или Стандарт/Премиум
          </div>

          {/* Filter by type */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setCatTypeFilter('all')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
            >
              Все ({categories.length})
            </button>
            {store.settings.materialTypes.filter(t => categories.some(c => c.typeId === t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => setCatTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${catTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                style={catTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
              >
                {t.name} ({categories.filter(c => c.typeId === t.id).length})
              </button>
            ))}
            {categories.some(c => !c.typeId) && (
              <button
                onClick={() => setCatTypeFilter('general')}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'general' ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
              >
                Общие ({categories.filter(c => !c.typeId).length})
              </button>
            )}
          </div>

          <div className="space-y-1.5 mb-4">
            {(catTypeFilter === 'general'
              ? categories.filter(c => !c.typeId)
              : filteredCategories
            ).map(cat => {
              const type = store.settings.materialTypes.find(t => t.id === cat.typeId);
              return (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
                  {type
                    ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: type.color || '#888' }} />
                    : <span className="w-3 h-3 rounded-full shrink-0 bg-[hsl(220,12%,30%)]" />
                  }
                  <span className="flex-1 text-sm text-foreground font-medium">{cat.name}</span>
                  {type && <span className="text-xs px-2 py-0.5 rounded-full text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: type.color || '#888' }}>{type.name}</span>}
                  {!type && <span className="text-xs text-[hsl(var(--text-muted))]">Общая</span>}
                  {cat.note && <span className="text-xs text-[hsl(var(--text-muted))] truncate max-w-32">{cat.note}</span>}
                  <span className="text-xs text-[hsl(var(--text-muted))] font-mono">
                    {store.materials.filter(m => m.categoryId === cat.id).length} матер.
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingCategory(cat)} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors">
                      <Icon name="Pencil" size={12} />
                    </button>
                    <button onClick={() => store.deleteMaterialCategory(cat.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors">
                      <Icon name="Trash2" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="text-xs text-[hsl(var(--text-muted))] py-2">Нет категорий</div>
            )}
          </div>
          <button
            onClick={() => setEditingCategory({ name: '', typeId: catTypeFilter !== 'all' && catTypeFilter !== 'general' ? catTypeFilter : undefined })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all"
          >
            <Icon name="Plus" size={14} /> Добавить категорию
          </button>
        </Section>

        {/* Stats */}
        <Section title="Статистика">
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Проектов', value: store.projects.length, icon: 'FolderOpen' },
              { label: 'Производителей', value: store.manufacturers.length, icon: 'Building2' },
              { label: 'Поставщиков', value: store.vendors.length, icon: 'Truck' },
              { label: 'Материалов', value: store.materials.length, icon: 'Package' },
              { label: 'Услуг', value: store.services.length, icon: 'Wrench' },
            ].map(stat => (
              <div key={stat.label} className="bg-[hsl(220,12%,14%)] rounded p-3 text-center">
                <Icon name={stat.icon} size={18} className="text-gold mx-auto mb-1" />
                <div className="text-xl font-mono font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-[hsl(var(--text-muted))]">{stat.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* About */}
        <Section title="О приложении">
          <div className="space-y-2 text-sm text-[hsl(var(--text-dim))]">
            <div className="flex justify-between"><span>Версия</span><span className="font-mono">1.2.0</span></div>
            <div className="flex justify-between"><span>Данные хранятся</span><span>Локально в браузере</span></div>
            <div className="flex justify-between"><span>Разработано</span><span>2026</span></div>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Опасная зона" danger>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Сбросить все данные</div>
              <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Удалит все проекты, материалы, услуги и расходы</div>
            </div>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="px-4 py-2 border border-destructive text-destructive rounded text-sm hover:bg-destructive hover:text-white transition-colors">
                Сбросить
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-destructive text-white rounded text-sm hover:opacity-90">Подтвердить</button>
                <button onClick={() => setConfirmReset(false)} className="px-4 py-2 border border-border text-[hsl(var(--text-dim))] rounded text-sm hover:text-foreground">Отмена</button>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Modal: Edit/Add material type */}
      {editingType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">{editingType.id ? 'Изменить тип' : 'Новый тип материала'}</span>
              <button onClick={() => setEditingType(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
                <input value={editingType.name || ''} onChange={e => setEditingType(p => ({ ...p!, name: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Например: Стекло" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 block">Цвет метки</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PRESETS.map(c => (
                    <button key={c} onClick={() => setEditingType(p => ({ ...p!, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${editingType.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[hsl(220,14%,11%)] scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={editingType.color || '#888888'} onChange={e => setEditingType(p => ({ ...p!, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                  <input value={editingType.color || ''} onChange={e => setEditingType(p => ({ ...p!, color: e.target.value }))}
                    className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground outline-none focus:border-gold" placeholder="#c8a96e" />
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: editingType.color || '#888' }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!editingType.name) return;
                    if (editingType.id) store.updateMaterialType(editingType.id, editingType);
                    else store.addMaterialType({ name: editingType.name, color: editingType.color });
                    setEditingType(null);
                  }}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >Сохранить</button>
                <button onClick={() => setEditingType(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit/Add material category */}
      {editingCategory !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm">{editingCategory.id ? 'Изменить категорию' : 'Новая категория'}</span>
              <button onClick={() => setEditingCategory(null)} className="text-[hsl(var(--text-muted))] hover:text-foreground"><Icon name="X" size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название <span className="text-gold">*</span></label>
                <input value={editingCategory.name || ''} onChange={e => setEditingCategory(p => ({ ...p!, name: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Например: Е1, Kapso, Стандарт" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Тип материала</label>
                <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Если не выбрать — категория будет общей для всех типов</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setEditingCategory(p => ({ ...p!, typeId: undefined }))}
                    className={`px-3 py-1.5 rounded text-xs transition-colors ${!editingCategory.typeId ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                  >Общая</button>
                  {store.settings.materialTypes.map(t => (
                    <button key={t.id}
                      onClick={() => setEditingCategory(p => ({ ...p!, typeId: t.id }))}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${editingCategory.typeId === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                      style={editingCategory.typeId === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
                    >{t.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
                <input value={editingCategory.note || ''} onChange={e => setEditingCategory(p => ({ ...p!, note: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Краткое описание" />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!editingCategory.name) return;
                    if (editingCategory.id) store.updateMaterialCategory(editingCategory.id, editingCategory);
                    else store.addMaterialCategory({ name: editingCategory.name, typeId: editingCategory.typeId, note: editingCategory.note });
                    setEditingCategory(null);
                  }}
                  className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
                >Сохранить</button>
                <button onClick={() => setEditingCategory(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
