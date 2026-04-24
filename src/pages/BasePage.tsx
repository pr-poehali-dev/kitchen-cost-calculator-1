import { useState } from 'react';
import { useStore } from '@/store/useStore';
import SuppliersTab from './base/SuppliersTab';
import MaterialsTab from './base/MaterialsTab';
import ServicesTab from './base/ServicesTab';

type Tab = 'suppliers' | 'materials' | 'services';

export default function BasePage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('suppliers');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  const TABS = [
    { id: 'suppliers' as Tab, label: 'Поставщики', count: store.suppliers.length },
    { id: 'materials' as Tab, label: 'Материалы', count: store.materials.length },
    { id: 'services' as Tab, label: 'Услуги', count: store.services.length },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <h1 className="text-base font-semibold text-foreground mb-3">База данных</h1>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedSupplier(null); }}
              className={`px-4 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                tab === t.id
                  ? 'bg-gold text-[hsl(220,16%,8%)] font-medium'
                  : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,16%)]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-[hsl(220,16%,8%)] text-gold' : 'bg-[hsl(220,12%,18%)] text-[hsl(var(--text-muted))]'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        {tab === 'suppliers' && (
          <SuppliersTab
            selectedSupplier={selectedSupplier}
            onSelectSupplier={setSelectedSupplier}
          />
        )}
        {tab === 'materials' && (
          <MaterialsTab
            matTypeFilter={matTypeFilter}
            onFilterChange={setMatTypeFilter}
          />
        )}
        {tab === 'services' && (
          <ServicesTab />
        )}
      </div>
    </div>
  );
}
