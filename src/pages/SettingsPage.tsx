import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { MaterialType, MaterialCategory, CompanyInfo } from '@/store/types';
import Icon from '@/components/ui/icon';
import MaterialTypeModal from './settings/MaterialTypeModal';
import MaterialCategoryModal from './settings/MaterialCategoryModal';

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
  const [editingCategory, setEditingCategory] = useState<Partial<MaterialCategory & { typeIds: string[] }> | null>(null);
  const [catTypeFilter, setCatTypeFilter] = useState<string>('all');

  const getCatTypeIds = (cat: MaterialCategory): string[] => {
    if (cat.typeIds?.length) return cat.typeIds;
    if (cat.typeId) return [cat.typeId];
    return [];
  };

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    store.addUnit(newUnit.trim());
    setNewUnit('');
  };

  const categories = store.settings.materialCategories || [];
  const filteredCategories = catTypeFilter === 'all'
    ? categories
    : categories.filter(c => {
        const ids = getCatTypeIds(c);
        return ids.length === 0 || ids.includes(catTypeFilter);
      });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Настройки</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Справочники, единицы измерения, типы и категории материалов</p>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-5 max-w-3xl">

        {/* О компании */}
        <Section title="О компании">
          {(() => {
            const company: CompanyInfo = store.settings.company || { name: '' };
            const upd = (field: keyof CompanyInfo, value: string) =>
              store.updateSettings({ company: { ...company, [field]: value } });
            const inp = 'w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название компании</label>
                    <input value={company.name || ''} onChange={e => upd('name', e.target.value)} placeholder="ООО «Моя Кухня»" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">ИНН</label>
                    <input value={company.inn || ''} onChange={e => upd('inn', e.target.value)} placeholder="7712345678" className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Телефон</label>
                    <input value={company.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+7 (000) 000-00-00" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Email</label>
                    <input value={company.email || ''} onChange={e => upd('email', e.target.value)} placeholder="info@company.ru" className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Директор / ИП</label>
                    <input value={company.director || ''} onChange={e => upd('director', e.target.value)} placeholder="Иванов Иван Иванович" className={inp} />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Сайт</label>
                    <input value={company.website || ''} onChange={e => upd('website', e.target.value)} placeholder="https://example.ru" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Адрес</label>
                  <input value={company.address || ''} onChange={e => upd('address', e.target.value)} placeholder="г. Москва, ул. Пушкина, д. 1" className={inp} />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Префикс нумерации договоров</label>
                  <div className="flex items-center gap-2">
                    <input value={company.contractPrefix || ''} onChange={e => upd('contractPrefix', e.target.value)} placeholder="К-" className="w-24 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
                    <span className="text-xs text-[hsl(var(--text-muted))]">
                      Пример: <span className="font-mono text-foreground">{(company.contractPrefix || 'К-')}{new Date().getFullYear()}-001</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </Section>

        <Section title="Валюта">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Символ валюты</label>
              <input value={store.settings.currency} onChange={e => store.updateSettings({ currency: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" placeholder="₽" maxLength={3} />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-[hsl(220,12%,14%)] rounded px-3 py-2 text-sm text-[hsl(var(--text-dim))]">
                Пример: <span className="font-mono text-foreground">152 500 {store.settings.currency}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Единицы измерения">
          <div className="flex flex-wrap gap-2 mb-3">
            {store.settings.units.map(u => (
              <div key={u} className="flex items-center gap-1 bg-[hsl(220,12%,16%)] border border-border rounded pl-3 pr-1.5 py-1">
                <span className="text-sm text-foreground">{u}</span>
                <button onClick={() => store.deleteUnit(u)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors ml-1"><Icon name="X" size={11} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddUnit()} placeholder="Новая единица (напр. пог.м)"
              className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
            <button onClick={handleAddUnit} className="flex items-center gap-1.5 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
              <Icon name="Plus" size={14} /> Добавить
            </button>
          </div>
        </Section>

        <Section title="Типы материалов">
          <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">Используются для группировки материалов в Базе и фильтрации в блоках Расчёта</div>
          <div className="space-y-1.5 mb-4">
            {store.settings.materialTypes.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#888' }} />
                <span className="flex-1 text-sm text-foreground">{t.name}</span>
                <span className="text-xs text-[hsl(var(--text-muted))] font-mono">{store.materials.filter(m => m.typeId === t.id).length} матер.</span>
                <span className="text-xs text-[hsl(var(--text-muted))]">
                  {categories.filter(c => getCatTypeIds(c).includes(t.id)).length > 0 && `${categories.filter(c => getCatTypeIds(c).includes(t.id)).length} катег.`}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingType(t)} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors"><Icon name="Pencil" size={12} /></button>
                  <button onClick={() => store.deleteMaterialType(t.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors"><Icon name="Trash2" size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setEditingType({ name: '', color: '#c8a96e' })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all">
            <Icon name="Plus" size={14} /> Добавить тип
          </button>
        </Section>

        <Section title="Категории материалов">
          <div className="mb-3 text-xs text-[hsl(var(--text-muted))]">Подкатегории внутри типов — например Е1, Е2, Kapso у Столешниц или Стандарт/Премиум</div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setCatTypeFilter('all')}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
              Все ({categories.length})
            </button>
            {store.settings.materialTypes.filter(t => categories.some(c => getCatTypeIds(c).includes(t.id))).map(t => (
              <button key={t.id} onClick={() => setCatTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${catTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
                style={catTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}>
                {t.name} ({categories.filter(c => getCatTypeIds(c).includes(t.id)).length})
              </button>
            ))}
            {categories.some(c => getCatTypeIds(c).length === 0) && (
              <button onClick={() => setCatTypeFilter('general')}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${catTypeFilter === 'general' ? 'bg-[hsl(220,12%,30%)] text-foreground font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}>
                Общие ({categories.filter(c => getCatTypeIds(c).length === 0).length})
              </button>
            )}
          </div>
          <div className="space-y-1.5 mb-4">
            {(catTypeFilter === 'general' ? categories.filter(c => getCatTypeIds(c).length === 0) : filteredCategories).map(cat => {
              const typeIds = getCatTypeIds(cat);
              const types = store.settings.materialTypes.filter(t => typeIds.includes(t.id));
              return (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-2 bg-[hsl(220,12%,14%)] rounded group">
                  {types.length > 0
                    ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: types[0].color || '#888' }} />
                    : <span className="w-3 h-3 rounded-full shrink-0 bg-[hsl(220,12%,30%)]" />}
                  <span className="flex-1 text-sm text-foreground font-medium">{cat.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {types.length > 0
                      ? types.map(t => <span key={t.id} className="text-xs px-2 py-0.5 rounded-full text-[hsl(220,16%,8%)] font-medium" style={{ backgroundColor: t.color || '#888' }}>{t.name}</span>)
                      : <span className="text-xs text-[hsl(var(--text-muted))]">Общая</span>}
                  </div>
                  {cat.note && <span className="text-xs text-[hsl(var(--text-muted))] truncate max-w-32">{cat.note}</span>}
                  <span className="text-xs text-[hsl(var(--text-muted))] font-mono">{store.materials.filter(m => m.categoryId === cat.id).length} матер.</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingCategory({ ...cat, typeIds: getCatTypeIds(cat) })} className="text-[hsl(var(--text-muted))] hover:text-foreground p-1 transition-colors"><Icon name="Pencil" size={12} /></button>
                    <button onClick={() => store.deleteMaterialCategory(cat.id)} className="text-[hsl(var(--text-muted))] hover:text-destructive p-1 transition-colors"><Icon name="Trash2" size={12} /></button>
                  </div>
                </div>
              );
            })}
            {filteredCategories.length === 0 && <div className="text-xs text-[hsl(var(--text-muted))] py-2">Нет категорий</div>}
          </div>
          <button onClick={() => setEditingCategory({ name: '', typeIds: catTypeFilter !== 'all' && catTypeFilter !== 'general' ? [catTypeFilter] : [] })}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all">
            <Icon name="Plus" size={14} /> Добавить категорию
          </button>
        </Section>

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

        <Section title="О приложении">
          <div className="space-y-2 text-sm text-[hsl(var(--text-dim))]">
            <div className="flex justify-between"><span>Версия</span><span className="font-mono">1.2.0</span></div>
            <div className="flex justify-between"><span>Данные хранятся</span><span>Локально в браузере</span></div>
            <div className="flex justify-between"><span>Разработано</span><span>2026</span></div>
          </div>
        </Section>

        <Section title="Опасная зона" danger>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Сбросить все данные</div>
              <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Удалит все проекты, материалы, услуги и расходы</div>
            </div>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)} className="px-4 py-2 border border-destructive text-destructive rounded text-sm hover:bg-destructive hover:text-white transition-colors">Сбросить</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-destructive text-white rounded text-sm hover:opacity-90">Подтвердить</button>
                <button onClick={() => setConfirmReset(false)} className="px-4 py-2 border border-border text-[hsl(var(--text-dim))] rounded text-sm hover:text-foreground">Отмена</button>
              </div>
            )}
          </div>
        </Section>
      </div>

      {editingType !== null && (
        <MaterialTypeModal
          editingType={editingType}
          onChange={setEditingType}
          onClose={() => setEditingType(null)}
        />
      )}

      {editingCategory !== null && (
        <MaterialCategoryModal
          editingCategory={editingCategory}
          onChange={setEditingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
}