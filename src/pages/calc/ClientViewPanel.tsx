import { useStore } from '@/store/useStore';
import type { ClientView } from '@/store/types';
import Icon from '@/components/ui/icon';

const DEFAULT_CLIENT_VIEW: ClientView = {
  showPrices: true,
  showManufacturer: false,
  showVendor: false,
  showArticle: false,
  showThickness: true,
  showBlockTotals: true,
  showMaterialsTotal: true,
  showServicesTotal: true,
  showExpenses: false,
  showGrandTotal: true,
  note: '',
};

export function getClientView(cv?: ClientView): ClientView {
  return { ...DEFAULT_CLIENT_VIEW, ...cv };
}

interface Props {
  projectId: string;
  onClose: () => void;
  onExportPdf: () => void;
}

interface ToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[hsl(220,12%,14%)]">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${value ? 'bg-gold' : 'bg-[hsl(220,12%,22%)]'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function ClientViewPanel({ projectId, onClose, onExportPdf }: Props) {
  const store = useStore();
  const project = store.projects.find(p => p.id === projectId);
  if (!project) return null;

  const cv = getClientView(project.clientView);

  const update = (patch: Partial<ClientView>) => {
    store.updateProjectInfo(projectId, { clientView: { ...cv, ...patch } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 mb-4 sm:mb-0 animate-fade-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={16} className="text-gold" />
            <span className="font-semibold text-sm">Настройки для клиента</span>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="overflow-auto scrollbar-thin px-5 py-4 flex-1 space-y-5">

          {/* Таблица материалов */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Таблица материалов</div>
            <ToggleRow label="Цена за единицу" hint="Стоимость одной позиции" value={cv.showPrices} onChange={v => update({ showPrices: v })} />
            <ToggleRow label="Толщина" value={cv.showThickness} onChange={v => update({ showThickness: v })} />
            <ToggleRow label="Производитель" value={cv.showManufacturer} onChange={v => update({ showManufacturer: v })} />
            <ToggleRow label="Поставщик" value={cv.showVendor} onChange={v => update({ showVendor: v })} />
            <ToggleRow label="Артикул" value={cv.showArticle} onChange={v => update({ showArticle: v })} />
            <ToggleRow label="Итог по блоку" hint="Сумма в заголовке каждого блока" value={cv.showBlockTotals} onChange={v => update({ showBlockTotals: v })} />
          </div>

          {/* Итоговая сводка */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Итоговая сводка</div>
            <ToggleRow label="Строка «Материалы»" value={cv.showMaterialsTotal} onChange={v => update({ showMaterialsTotal: v })} />
            <ToggleRow label="Строка «Услуги»" value={cv.showServicesTotal} onChange={v => update({ showServicesTotal: v })} />
            <ToggleRow label="Расходы и наценки" hint="Наценки на итог, % и фикс. расходы" value={cv.showExpenses} onChange={v => update({ showExpenses: v })} />
            <ToggleRow label="Итоговая сумма" value={cv.showGrandTotal} onChange={v => update({ showGrandTotal: v })} />
          </div>

          {/* Примечание */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-2">Примечание в PDF</div>
            <textarea
              value={cv.note}
              onChange={e => update({ note: e.target.value })}
              rows={3}
              placeholder="Например: Цены действительны 14 дней. Доставка и монтаж оговариваются отдельно."
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold resize-none placeholder:text-[hsl(var(--text-muted))]"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <button
            onClick={() => { onClose(); onExportPdf(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90"
          >
            <Icon name="FileDown" size={14} /> Сохранить и скачать PDF
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
