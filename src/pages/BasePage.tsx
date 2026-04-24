import { useState } from 'react';
import { useStore } from '@/store/useStore';
import ManufacturersTab from './base/ManufacturersTab';
import VendorsTab from './base/VendorsTab';
import MaterialsTab from './base/MaterialsTab';
import ServicesTab from './base/ServicesTab';

type Tab = 'manufacturers' | 'vendors' | 'materials' | 'services';

export default function BasePage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('manufacturers');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [matTypeFilter, setMatTypeFilter] = useState<string>('all');

  const TABS = [
    { id: 'manufacturers' as Tab, label: 'Производители', count: store.manufacturers.length },
    { id: 'vendors' as Tab, label: 'Поставщики', count: store.vendors.length },
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
              onClick={() => {
                setTab(t.id);
                setSelectedManufacturer(null);
                setSelectedVendor(null);
              }}
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
        {tab === 'manufacturers' && (
          <ManufacturersTab
            selectedId={selectedManufacturer}
            onSelect={setSelectedManufacturer}
          />
        )}
        {tab === 'vendors' && (
          <VendorsTab
            selectedId={selectedVendor}
            onSelect={setSelectedVendor}
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
