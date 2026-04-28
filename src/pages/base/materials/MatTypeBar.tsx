import { useStore } from '@/store/useStore';
import type { MaterialType } from '@/store/types';
import Icon from '@/components/ui/icon';

interface PriceMenuCallbacks {
  onSkatImport: () => void;
  onSkatPrice: () => void;
  onBoyardImport: () => void;
  onBoyardPrice: () => void;
  onPricelistUpdate: () => void;
  onExcelPrice: () => void;
  onBulkPrice: () => void;
  onExcelImport: () => void;
  onTmfImport: () => void;
  onTmfPrice: () => void;
  onPercentModal: () => void;
}

interface Props {
  matTypeFilter: string;
  onFilterChange: (v: string) => void;
  showImportMenu: boolean;
  onToggleImportMenu: () => void;
  onCloseImportMenu: () => void;
  onAddMaterial: () => void;
  priceMenu: PriceMenuCallbacks;
}

export default function MatTypeBar({
  matTypeFilter, onFilterChange,
  showImportMenu, onToggleImportMenu, onCloseImportMenu,
  onAddMaterial, priceMenu,
}: Props) {
  const store = useStore();
  const allTypes: MaterialType[] = store.settings.materialTypes;

  return (
    <div className="flex items-center justify-between mb-3 gap-3">
      {/* Фильтр по типу */}
      <div className="flex gap-1 flex-wrap items-center min-w-0">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded text-xs transition-colors shrink-0 ${matTypeFilter === 'all' ? 'bg-gold text-[hsl(220,16%,8%)] font-medium' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
        >
          Все ({store.materials.length})
        </button>
        {allTypes.filter(t => store.materials.some(m => m.typeId === t.id)).map(t => (
          <button
            key={t.id}
            onClick={() => onFilterChange(t.id)}
            className={`px-3 py-1.5 rounded text-xs transition-colors font-medium shrink-0 ${matTypeFilter === t.id ? 'text-[hsl(220,16%,8%)]' : 'bg-[hsl(220,12%,16%)] text-[hsl(var(--text-dim))] hover:text-foreground'}`}
            style={matTypeFilter === t.id ? { backgroundColor: t.color || '#c8a96e' } : {}}
          >
            {t.name} ({store.materials.filter(m => m.typeId === t.id).length})
          </button>
        ))}
      </div>

      {/* Кнопки справа */}
      <div className="flex gap-2 shrink-0">
        {/* Дропдаун прайсов */}
        <div className="relative">
          <button
            onClick={onToggleImportMenu}
            className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(220,12%,16%)] border border-border text-foreground rounded text-sm hover:border-gold hover:text-gold transition-all"
          >
            <Icon name="RefreshCw" size={14} /> Прайсы
            <Icon name="ChevronDown" size={12} className={`transition-transform ${showImportMenu ? 'rotate-180' : ''}`} />
          </button>
          {showImportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={onCloseImportMenu} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl w-52 py-1">
                <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-border mb-1">СКАТ</div>
                <button onClick={() => { priceMenu.onSkatImport(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="PackagePlus" size={13} className="text-[hsl(var(--text-muted))]" /> Импорт СКАТ
                </button>
                <button onClick={() => { priceMenu.onSkatPrice(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Цены СКАТ
                </button>
                <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-t border-border my-1">BOYARD</div>
                <button onClick={() => { priceMenu.onBoyardImport(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="PackagePlus" size={13} className="text-[hsl(var(--text-muted))]" /> Импорт BOYARD
                </button>
                <button onClick={() => { priceMenu.onBoyardPrice(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Цены BOYARD
                </button>
                <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-t border-border my-1">ТМФ (фасады)</div>
                <button onClick={() => { priceMenu.onTmfImport(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="PackagePlus" size={13} className="text-[hsl(var(--text-muted))]" /> Импорт ТМФ
                </button>
                <button onClick={() => { priceMenu.onTmfPrice(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Цены ТМФ
                </button>
                <div className="px-3 py-1 text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider border-b border-t border-border my-1">Другие</div>
                <button onClick={() => { priceMenu.onPricelistUpdate(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="RefreshCw" size={13} className="text-[hsl(var(--text-muted))]" /> Из прайса (Slotex)
                </button>
                <button onClick={() => { priceMenu.onExcelPrice(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="FileSpreadsheet" size={13} className="text-[hsl(var(--text-muted))]" /> Из Excel
                </button>
                <button onClick={() => { priceMenu.onBulkPrice(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="Tags" size={13} className="text-[hsl(var(--text-muted))]" /> Цены списком
                </button>
                <button onClick={() => { priceMenu.onExcelImport(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="Table" size={13} className="text-emerald-400" /> Импорт из Excel (маппинг)
                </button>
                <div className="border-t border-border my-1" />
                <button onClick={() => { priceMenu.onPercentModal(); onCloseImportMenu(); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2">
                  <Icon name="Percent" size={13} className="text-amber-400" /> Изменить на %
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onAddMaterial}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
        >
          <Icon name="Plus" size={14} /> Добавить
        </button>
      </div>
    </div>
  );
}