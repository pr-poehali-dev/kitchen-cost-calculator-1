import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Service } from '@/store/types';
import Icon from '@/components/ui/icon';
import { fmt, Modal } from './BaseShared';
import SearchInput from '@/components/ui/search-input';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import ServiceCategoriesModal from './ServiceCategoriesModal';
import ServiceSidebar from './ServiceSidebar';

type Tab = 'all' | 'archived' | string; // string = categoryId

export default function ServicesTab({ initialSearch = '' }: { initialSearch?: string }) {
  const store = useStore();
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();

  const activeServices = store.services.filter(sv => !sv.archived);
  const archivedServices = store.services.filter(sv => sv.archived);

  const baseList = activeTab === 'archived'
    ? archivedServices
    : activeTab === 'all'
      ? activeServices
      : activeTab === 'no_cat'
        ? activeServices.filter(sv => !sv.categoryId)
        : activeServices.filter(sv => sv.categoryId === activeTab);

  const filteredServices = q
    ? baseList.filter(sv =>
        sv.name.toLowerCase().includes(q) ||
        (sv.category || '').toLowerCase().includes(q)
      )
    : baseList;

  const handleOpenNew = () => {
    setEditingService({ categoryId: undefined, category: '', unit: 'шт', basePrice: 0, clientPrice: 0 });
  };

  const handleSave = () => {
    if (!editingService?.name?.trim()) return;
    const cat = store.serviceCategories.find(c => c.id === editingService.categoryId);
    const data = { ...editingService, category: cat?.name || editingService.category || '' };
    if (editingService.id) store.updateService(editingService.id, data);
    else store.addService(data as Omit<Service, 'id'>);
    setEditingService(null);
  };

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Основная колонка */}
      <div className="flex-1 min-w-0">
        {/* Панель управления */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Поиск..."
            className="flex-1 min-w-40 max-w-xs"
          />
          <span className="text-xs text-[hsl(var(--text-muted))]">
            {filteredServices.length} из {store.services.length}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-foreground transition-colors"
            >
              <Icon name="Tags" size={13} /> Категории
            </button>
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
            >
              <Icon name="Plus" size={14} /> Добавить услугу
            </button>
          </div>
        </div>

        {/* Вкладки категорий */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-thin pb-0.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'all'
                ? 'bg-[hsl(220,12%,18%)] text-foreground'
                : 'text-[hsl(var(--text-muted))] hover:text-foreground'
            }`}
          >
            Все
            <span className="text-[hsl(var(--text-muted))]">{activeServices.length}</span>
          </button>

          {store.serviceCategories.map(cat => {
            const count = activeServices.filter(s => s.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                  activeTab === cat.id
                    ? 'bg-[hsl(220,12%,18%)] text-foreground'
                    : 'text-[hsl(var(--text-muted))] hover:text-foreground'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                {cat.name}
                <span className="text-[hsl(var(--text-muted))]">{count}</span>
              </button>
            );
          })}

          {/* Без категории */}
          {(() => {
            const noCatCount = activeServices.filter(s => !s.categoryId).length;
            if (noCatCount === 0) return null;
            return (
              <button
                onClick={() => setActiveTab('no_cat')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                  activeTab === 'no_cat'
                    ? 'bg-[hsl(220,12%,18%)] text-foreground'
                    : 'text-[hsl(var(--text-muted))] hover:text-foreground'
                }`}
              >
                Без категории
                <span className="text-[hsl(var(--text-muted))]">{noCatCount}</span>
              </button>
            );
          })()}

          {archivedServices.length > 0 && (
            <button
              onClick={() => setActiveTab('archived')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ml-2 ${
                activeTab === 'archived'
                  ? 'bg-[hsl(220,12%,18%)] text-foreground'
                  : 'text-[hsl(var(--text-muted))] hover:text-foreground'
              }`}
            >
              <Icon name="Archive" size={11} />
              Архив
              <span className="text-[hsl(var(--text-muted))]">{archivedServices.length}</span>
            </button>
          )}
        </div>

        {/* Таблица */}
        <div className="bg-[hsl(220,14%,11%)] rounded border border-border overflow-x-auto scrollbar-thin">
          <div
            className="grid text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 28px', minWidth: '560px' }}
          >
            <span>Наименование</span>
            <span>Категория</span>
            <span>Ед. изм.</span>
            <span className="text-right">Себест.</span>
            <span className="text-right">Цена клиента</span>
            <span />
          </div>

          {filteredServices.length === 0 && (
            <div className="px-4 py-10 text-center text-[hsl(var(--text-muted))] text-sm">
              {search ? 'Ничего не найдено' : activeTab === 'archived' ? 'Нет архивных услуг' : 'Нет услуг'}
            </div>
          )}

          {filteredServices.map(sv => {
            const cat = store.getServiceCategoryById(sv.categoryId);
            const margin = sv.clientPrice && sv.basePrice
              ? Math.round(((sv.clientPrice - sv.basePrice) / sv.clientPrice) * 100)
              : null;
            const isSelected = selectedServiceId === sv.id;

            return (
              <div
                key={sv.id}
                onClick={() => setSelectedServiceId(isSelected ? null : sv.id)}
                className={`grid items-center px-4 py-2.5 border-b border-[hsl(220,12%,14%)] cursor-pointer transition-colors group text-sm ${
                  isSelected
                    ? 'bg-[hsl(220,12%,15%)]'
                    : sv.archived
                      ? 'opacity-50 hover:opacity-70 hover:bg-[hsl(220,12%,12%)]'
                      : 'hover:bg-[hsl(220,12%,12%)]'
                }`}
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 28px', minWidth: '560px' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {cat && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                    <span className="text-foreground">{sv.name}</span>
                    {sv.archived && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(220,12%,20%)] text-[hsl(var(--text-muted))]">архив</span>
                    )}
                  </div>
                  {sv.description && (
                    <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5 truncate pl-4">{sv.description}</div>
                  )}
                </div>

                <span className="text-xs text-[hsl(var(--text-dim))]">{cat?.name || sv.category || '—'}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{sv.unit}</span>

                <span className="text-right font-mono text-sm">
                  {fmt(sv.basePrice)}
                </span>

                <div className="text-right">
                  {sv.clientPrice ? (
                    <div>
                      <span className="font-mono text-sm">{fmt(sv.clientPrice)}</span>
                      {margin !== null && (
                        <span className={`ml-1.5 text-xs ${margin >= 20 ? 'text-[hsl(140,60%,50%)]' : margin >= 10 ? 'text-gold' : 'text-destructive'}`}>
                          {margin}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[hsl(var(--text-muted))]">—</span>
                  )}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingService({ ...sv })}
                    className="text-[hsl(var(--text-muted))] hover:text-foreground"
                  >
                    <Icon name="Pencil" size={12} />
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirmDialog({ message: `Удалить услугу «${sv.name}»?` }))
                        store.deleteService(sv.id);
                    }}
                    className="text-[hsl(var(--text-muted))] hover:text-destructive"
                  >
                    <Icon name="Trash2" size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Боковая панель карточки */}
      {selectedServiceId && (
        <ServiceSidebar
          serviceId={selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
        />
      )}

      {/* Модалка редактирования */}
      {editingService !== null && (
        <Modal title={editingService.id ? 'Изменить услугу' : 'Новая услуга'} onClose={() => setEditingService(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">
                Наименование <span className="text-gold">*</span>
              </label>
              <input
                autoFocus
                value={editingService.name || ''}
                onChange={e => setEditingService(p => ({ ...p!, name: e.target.value }))}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Категория</label>
                <select
                  value={editingService.categoryId || ''}
                  onChange={e => {
                    const cat = store.serviceCategories.find(c => c.id === e.target.value);
                    setEditingService(p => ({ ...p!, categoryId: e.target.value || undefined, category: cat?.name || '' }));
                  }}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                >
                  <option value="" className="bg-[hsl(220,14%,11%)]">— Без категории —</option>
                  {store.serviceCategories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[hsl(220,14%,11%)]">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Ед. изм.</label>
                <select
                  value={editingService.unit || 'шт'}
                  onChange={e => setEditingService(p => ({ ...p!, unit: e.target.value }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                >
                  {store.settings.units.map(u => (
                    <option key={u} value={u} className="bg-[hsl(220,14%,11%)]">{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Себестоимость</label>
                <input
                  type="number"
                  value={editingService.basePrice ?? ''}
                  onChange={e => setEditingService(p => ({ ...p!, basePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Цена клиента</label>
                <input
                  type="number"
                  value={editingService.clientPrice ?? ''}
                  onChange={e => setEditingService(p => ({ ...p!, clientPrice: parseFloat(e.target.value) || undefined }))}
                  placeholder="Не задана"
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Примечание</label>
              <input
                value={editingService.note || ''}
                onChange={e => setEditingService(p => ({ ...p!, note: e.target.value }))}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!editingService.name?.trim()}
                className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditingService(null)}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showCategoriesModal && (
        <ServiceCategoriesModal onClose={() => setShowCategoriesModal(false)} />
      )}
    </div>
  );
}