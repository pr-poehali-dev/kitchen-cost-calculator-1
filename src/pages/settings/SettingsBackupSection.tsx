import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/auth/useAuth';
import Icon from '@/components/ui/icon';
import { API_URLS } from '@/config/api';

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
  const { state: authState } = useAuth();
  const user = authState.status === 'authenticated' ? authState.user : null;
  const isAdmin = user?.role === 'admin';

  const [importError, setImportError] = useState('');
  const [importOk, setImportOk] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<Record<string, unknown> | null>(null);

  // Состояние модалки сброса
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetChecking, setResetChecking] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

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

  const openResetModal = () => {
    setResetPassword('');
    setResetError('');
    setShowResetModal(true);
    setTimeout(() => passwordRef.current?.focus(), 50);
  };

  const handleResetConfirm = async () => {
    if (!resetPassword.trim() || !user) return;
    setResetChecking(true);
    setResetError('');
    try {
      const res = await fetch(`${API_URLS.auth}/?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: user.login, password: resetPassword }),
      });
      if (!res.ok) {
        setResetError('Неверный пароль');
        setResetChecking(false);
        return;
      }
      // Пароль верный — сбрасываем
      localStorage.clear();
      window.location.reload();
    } catch {
      setResetError('Ошибка соединения, попробуйте снова');
      setResetChecking(false);
    }
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-foreground">Сбросить все данные</div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Удалит все проекты, материалы, услуги и расходы</div>
          </div>
          {isAdmin ? (
            <button
              onClick={openResetModal}
              className="px-4 py-2 border border-destructive text-destructive rounded text-sm hover:bg-destructive hover:text-white transition-colors shrink-0"
            >
              Сбросить
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] shrink-0">
              <Icon name="Lock" size={13} />
              Только для администратора
            </div>
          )}
        </div>
      </Section>

      {/* Модалка: подтверждение сброса паролем */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[hsl(220,14%,11%)] border border-destructive/40 rounded-xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden">
            {/* Шапка */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <Icon name="ShieldAlert" size={15} className="text-destructive" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Подтверждение сброса</div>
                <div className="text-xs text-[hsl(var(--text-muted))]">Требуется пароль администратора</div>
              </div>
            </div>

            {/* Тело */}
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/25 rounded-lg">
                <Icon name="AlertTriangle" size={14} className="text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">
                  Будут удалены <span className="font-semibold text-destructive">все данные</span> — проекты, материалы, услуги, расходы. Действие необратимо.
                </p>
              </div>

              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1.5 block">
                  Пароль пользователя <span className="normal-case font-mono text-foreground">{user?.login}</span>
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  value={resetPassword}
                  onChange={e => { setResetPassword(e.target.value); setResetError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleResetConfirm()}
                  placeholder="Введите пароль..."
                  className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-destructive transition-colors"
                />
                {resetError && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive">
                    <Icon name="AlertCircle" size={12} /> {resetError}
                  </div>
                )}
              </div>
            </div>

            {/* Футер */}
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={handleResetConfirm}
                disabled={!resetPassword.trim() || resetChecking}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-destructive text-white rounded text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {resetChecking
                  ? <><Icon name="Loader" size={13} className="animate-spin" /> Проверяю...</>
                  : <><Icon name="Trash2" size={13} /> Удалить все данные</>
                }
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
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
              {([
                ['Материалы', (pendingImportData.materials as unknown[])?.length],
                ['Производители', (pendingImportData.manufacturers as unknown[])?.length],
                ['Поставщики', (pendingImportData.vendors as unknown[])?.length],
                ['Услуги', (pendingImportData.services as unknown[])?.length],
                ['Проекты', (pendingImportData.projects as unknown[])?.length],
              ] as [string, number | undefined][]).map(([label, count]) => count !== undefined && (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={confirmImport} className="flex-1 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
                Загрузить и заменить
              </button>
              <button onClick={() => setPendingImportData(null)} className="px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-dim))] hover:text-foreground">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
