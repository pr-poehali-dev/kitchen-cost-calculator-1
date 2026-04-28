import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { MaterialType, MaterialCategory, CompanyInfo } from '@/store/types';
import Icon from '@/components/ui/icon';
import MaterialTypeModal from './settings/MaterialTypeModal';
import MaterialCategoryModal from './settings/MaterialCategoryModal';

const ACCENT_KEY = 'kuhni_pro_accent';

const ACCENTS = [
  { id: 'gold',    label: 'Золото',    color: 'hsl(38,60%,58%)' },
  { id: 'blue',    label: 'Синий',     color: 'hsl(210,80%,60%)' },
  { id: 'emerald', label: 'Изумруд',   color: 'hsl(160,60%,45%)' },
  { id: 'violet',  label: 'Фиолет',    color: 'hsl(260,60%,65%)' },
  { id: 'rose',    label: 'Розовый',   color: 'hsl(340,70%,60%)' },
  { id: 'orange',  label: 'Оранжевый', color: 'hsl(25,90%,55%)' },
] as const;

type AccentId = typeof ACCENTS[number]['id'];

function applyAccent(id: AccentId) {
  const root = document.documentElement;
  if (id === 'gold') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', id);
  localStorage.setItem(ACCENT_KEY, id);
}

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
  const [accent, setAccent] = useState<AccentId>(() => (localStorage.getItem(ACCENT_KEY) as AccentId) || 'gold');
  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<Record<string, unknown> | null>(null);

  // Применяем тему при монтировании
  useEffect(() => {
    applyAccent(accent);
  }, []);

  const handleAccentChange = (id: AccentId) => {
    setAccent(id);
    applyAccent(id);
  };

  const handleExportBackup = () => {
    const state = store;
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      materials: store.materials,
      manufacturers: store.manufacturers,
      vendors: store.vendors,
      services: store.services,
      expenses: store.expenses,
      expenseGroups: store.expenseGroups,
      projects: store.projects,
      savedBlocks: store.savedBlocks,
      templates: store.templates,
      settings: store.settings,
    };
    void state;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kuhni-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportOk(false);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.materials || !data.settings) {
          setImportError('Неверный формат файла');
          return;
        }
        setPendingImportData(data);
      } catch {
        setImportError('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!pendingImportData) return;
    const data = pendingImportData;
    store.setState(s => ({
      ...s,
      materials: data.materials as typeof s.materials ?? s.materials,
      manufacturers: data.manufacturers as typeof s.manufacturers ?? s.manufacturers,
      vendors: data.vendors as typeof s.vendors ?? s.vendors,
      services: data.services as typeof s.services ?? s.services,
      expenses: data.expenses as typeof s.expenses ?? s.expenses,
      expenseGroups: data.expenseGroups as typeof s.expenseGroups ?? s.expenseGroups,
      projects: data.projects as typeof s.projects ?? s.projects,
      savedBlocks: data.savedBlocks as typeof s.savedBlocks ?? s.savedBlocks,
      templates: data.templates as typeof s.templates ?? s.templates,
      settings: data.settings as typeof s.settings ?? s.settings,
    }));
    setPendingImportData(null);
    setImportOk(true);
    setTimeout(() => setImportOk(false), 3000);
  };

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
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Настройки</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Справочники, единицы измерения, типы и категории материалов</p>
        </div>
        <button
          onClick={handleExportBackup}
          className="flex items-center gap-2 px-3 py-2 bg-gold/10 border border-gold/30 text-gold rounded text-xs font-medium hover:bg-gold/20 transition-all"
        >
          <Icon name="Download" size={13} /> Скачать резервную копию
        </button>
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

        {/* Внешний вид */}
        <Section title="Внешний вид">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Акцентный цвет интерфейса</div>
              <div className="flex gap-2 flex-wrap">
                {ACCENTS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleAccentChange(a.id)}
                    title={a.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      accent === a.id ? 'border-white/40 bg-[hsl(220,12%,18%)]' : 'border-border hover:border-[hsl(220,12%,28%)]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <span className={accent === a.id ? 'text-foreground font-medium' : 'text-[hsl(var(--text-dim))]'}>{a.label}</span>
                    {accent === a.id && <Icon name="Check" size={12} className="text-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Бэкап данных */}
        <Section title="Резервная копия данных">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-foreground font-medium">Экспорт всех данных</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                  Скачает JSON-файл с материалами, проектами, расходами и настройками
                </div>
              </div>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold/50 transition-all shrink-0"
              >
                <Icon name="Download" size={14} /> Скачать бэкап
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-foreground font-medium">Импорт из бэкапа</div>
                  <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                    Загрузит данные из ранее сохранённого JSON-файла. Текущие данные будут заменены.
                  </div>
                </div>
                <label className="flex items-center gap-2 px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold/50 transition-all shrink-0 cursor-pointer">
                  <Icon name="Upload" size={14} /> Загрузить бэкап
                  <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                </label>
              </div>
              {importError && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                  <Icon name="AlertCircle" size={13} /> {importError}
                </div>
              )}
              {importOk && (
                <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                  <Icon name="CheckCircle" size={13} /> Данные успешно загружены
                </div>
              )}
            </div>
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

      {/* Диалог подтверждения импорта */}
      {pendingImportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <Icon name="AlertTriangle" size={18} className="text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Восстановить из резервной копии?</div>
                <div className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Все текущие данные будут заменены данными из файла. Это действие нельзя отменить.
                </div>
              </div>
            </div>
            <div className="bg-[hsl(220,12%,14%)] rounded border border-border p-3 text-xs text-[hsl(var(--text-muted))] space-y-1">
              <div className="text-foreground font-medium mb-1.5">Будет загружено:</div>
              {[
                ['Материалы', (pendingImportData.materials as unknown[])?.length],
                ['Проекты', (pendingImportData.projects as unknown[])?.length],
                ['Производители', (pendingImportData.manufacturers as unknown[])?.length],
                ['Шаблоны блоков', (pendingImportData.savedBlocks as unknown[])?.length],
              ].map(([label, count]) => count !== undefined && (
                <div key={label as string} className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-foreground font-medium">{count as number} шт.</span>
                </div>
              ))}
              {(pendingImportData.exportedAt as string) && (
                <div className="flex justify-between pt-1 border-t border-border mt-1">
                  <span>Дата копии</span>
                  <span className="text-foreground">{new Date(pendingImportData.exportedAt as string).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmImport}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90"
              >
                Восстановить
              </button>
              <button
                onClick={() => setPendingImportData(null)}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}