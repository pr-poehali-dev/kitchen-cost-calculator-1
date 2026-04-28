import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import type { AuthUser } from '@/auth/useAuth';
import { getSaveStatus, saveStatusListeners, saveStateToDb, type SaveStatus } from '@/store/stateCore';

type Section = 'home' | 'clients' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings' | 'users';

interface LayoutProps {
  active: Section;
  onNav: (s: Section) => void;
  children: React.ReactNode;
  user?: AuthUser;
  onLogout?: () => void;
  onOpenSearch?: () => void;
}

const NAV_BASE = [
  { id: 'home'     as Section, label: 'Главная',   icon: 'House' },
  { id: 'clients'  as Section, label: 'Клиенты',   icon: 'Users' },
  { id: 'calc'     as Section, label: 'Расчёт',    icon: 'Calculator' },
  { id: 'blocks'   as Section, label: 'Блоки',     icon: 'Layers' },
  { id: 'services' as Section, label: 'Услуги',    icon: 'Wrench' },
  { id: 'base'     as Section, label: 'База',       icon: 'Database' },
  { id: 'expenses' as Section, label: 'Расходы',   icon: 'TrendingUp' },
  { id: 'settings' as Section, label: 'Настройки', icon: 'Settings' },
];

const NAV_ADMIN = { id: 'users' as Section, label: 'Пользователи', icon: 'ShieldCheck' };

export default function Layout({ active, onNav, children, user, onLogout, onOpenSearch }: LayoutProps) {
  const nav = user?.role === 'admin' ? [...NAV_BASE, NAV_ADMIN] : NAV_BASE;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(getSaveStatus());

  // Подписываемся на статус сохранения
  useEffect(() => {
    const handler = (s: SaveStatus) => setSaveStatus(s);
    saveStatusListeners.add(handler);
    return () => { saveStatusListeners.delete(handler); };
  }, []);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenSearch]);

  // Предупреждение при закрытии вкладки с несохранёнными данными
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'pending' || saveStatus === 'error') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  const statusUI = {
    saved: { icon: 'Cloud', color: 'text-[hsl(var(--text-muted))]', label: 'Сохранено' },
    pending: { icon: 'CloudUpload', color: 'text-gold', label: 'Сохраняю...' },
    error: { icon: 'CloudOff', color: 'text-destructive', label: 'Ошибка сохранения' },
  }[saveStatus];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-56 flex flex-col border-r border-border bg-[hsl(220,16%,6%)] shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-gold font-semibold text-base tracking-wide">КухниПро</div>
          <div className="text-[hsl(var(--text-muted))] text-xs mt-0.5 tracking-wider uppercase">Калькулятор мебели</div>
        </div>

        {/* Поиск */}
        <button
          onClick={onOpenSearch}
          className="mx-3 mt-3 mb-1 flex items-center gap-2 px-3 py-2 bg-[hsl(220,12%,12%)] border border-border rounded-lg text-xs text-[hsl(var(--text-muted))] hover:border-gold/40 hover:text-foreground transition-all group"
        >
          <Icon name="Search" size={13} />
          <span className="flex-1 text-left">Поиск...</span>
          <kbd className="flex items-center gap-0.5 px-1 py-0.5 bg-[hsl(220,12%,18%)] rounded text-[10px] border border-border opacity-60 group-hover:opacity-100">
            Ctrl K
          </kbd>
        </button>

        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150 ${
                active === item.id
                  ? 'text-gold bg-[hsl(220,12%,14%)] border-r-2 border-gold'
                  : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,12%)]'
              }`}
            >
              <Icon name={item.icon} size={15} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <Icon name={user.role === 'admin' ? 'ShieldCheck' : 'User'} size={12} className="text-gold" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{user.login}</div>
                <div className="text-[10px] text-[hsl(var(--text-muted))] uppercase tracking-wider">{user.role} · {user.plan}</div>
              </div>
            </div>
          )}

          {/* Статус сохранения */}
          {user && (
            <div className={`flex items-center gap-1.5 px-1 text-[10px] ${statusUI.color} transition-colors`}>
              <Icon name={statusUI.icon} size={10} className="shrink-0" fallback="Cloud" />
              <span>{statusUI.label}</span>
              {saveStatus === 'error' && (
                <button
                  onClick={saveStateToDb}
                  className="ml-auto underline hover:no-underline"
                >
                  Повторить
                </button>
              )}
            </div>
          )}

          {/* Баннер ошибки сохранения */}
          {saveStatus === 'error' && (
            <div className="mx-0 px-2 py-2 bg-destructive/10 border border-destructive/30 rounded text-[10px] text-destructive leading-relaxed">
              Нет связи с сервером. Данные сохранены локально — не закрывайте вкладку.
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-destructive hover:bg-destructive/5 rounded transition-colors"
            >
              <Icon name="LogOut" size={12} />
              Выйти
            </button>
          )}
          {!user && <div className="text-[hsl(var(--text-muted))] text-xs px-1">v1.0 · 2026</div>}
        </div>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
