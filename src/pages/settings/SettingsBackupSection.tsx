import { useState } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';

function Section({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-[hsl(220,14%,11%)] rounded border ${danger ? 'border-destructive/30' : 'border-border'} p-5`}>
      <div className={`text-xs uppercase tracking-wider mb-4 font-medium ${danger ? 'text-destructive' : 'text-[hsl(var(--text-muted))]'}`}>{title}</div>
      {children}
    </div>
  );
}

interface Props {
  onExportBackup: () => void;
}

export default function SettingsBackupSection({ onExportBackup }: Props) {
  const store = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<Record<string, unknown> | null>(null);

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
      materials:     data.materials     as typeof s.materials     ?? s.materials,
      manufacturers: data.manufacturers as typeof s.manufacturers ?? s.manufacturers,
      vendors:       data.vendors       as typeof s.vendors       ?? s.vendors,
      services:      data.services      as typeof s.services      ?? s.services,
      expenses:      data.expenses      as typeof s.expenses      ?? s.expenses,
      expenseGroups: data.expenseGroups as typeof s.expenseGroups ?? s.expenseGroups,
      projects:      data.projects      as typeof s.projects      ?? s.projects,
      savedBlocks:   data.savedBlocks   as typeof s.savedBlocks   ?? s.savedBlocks,
      templates:     data.templates     as typeof s.templates     ?? s.templates,
      settings:      data.settings      as typeof s.settings      ?? s.settings,
    }));
    setPendingImportData(null);
    setImportOk(true);
    setTimeout(() => setImportOk(false), 3000);
  };

  return (
    <>
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
              onClick={onExportBackup}
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
                ['Материалы',       (pendingImportData.materials     as unknown[])?.length],
                ['Проекты',         (pendingImportData.projects      as unknown[])?.length],
                ['Производители',   (pendingImportData.manufacturers as unknown[])?.length],
                ['Шаблоны блоков',  (pendingImportData.savedBlocks   as unknown[])?.length],
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
    </>
  );
}
