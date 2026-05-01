import { useStore } from '@/store/useStore';
import { useCatalog } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';
import SettingsCompanySection from './settings/SettingsCompanySection';
import SettingsCatalogSection from './settings/SettingsCatalogSection';
import SettingsAppSection from './settings/SettingsAppSection';
import SettingsBackupSection from './settings/SettingsBackupSection';

export default function SettingsPage() {
  const store = useStore();
  const catalog = useCatalog();

  const handleExportBackup = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      materials: catalog.materials,
      manufacturers: catalog.manufacturers,
      vendors: catalog.vendors,
      services: store.services,
      expenses: store.expenses,
      expenseGroups: store.expenseGroups,
      projects: store.projects,
      savedBlocks: store.savedBlocks,
      templates: store.templates,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kuhni-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
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

      <div className="flex-1 overflow-auto scrollbar-thin p-4 md:p-6 space-y-5 max-w-3xl">
        <SettingsCompanySection />
        <SettingsCatalogSection />
        <SettingsAppSection />
        <SettingsBackupSection onExportBackup={handleExportBackup} />
      </div>
    </div>
  );
}