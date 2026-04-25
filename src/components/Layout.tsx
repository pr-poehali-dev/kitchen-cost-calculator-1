import Icon from '@/components/ui/icon';
import type { AuthUser } from '@/auth/useAuth';

type Section = 'home' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings';

interface LayoutProps {
  active: Section;
  onNav: (s: Section) => void;
  children: React.ReactNode;
  user?: AuthUser;
  onLogout?: () => void;
  onAdminPanel?: () => void;
}

const NAV = [
  { id: 'home'     as Section, label: 'Главная',   icon: 'House' },
  { id: 'calc'     as Section, label: 'Расчёт',    icon: 'Calculator' },
  { id: 'blocks'   as Section, label: 'Блоки',     icon: 'Layers' },
  { id: 'services' as Section, label: 'Услуги',    icon: 'Wrench' },
  { id: 'base'     as Section, label: 'База',       icon: 'Database' },
  { id: 'expenses' as Section, label: 'Расходы',   icon: 'TrendingUp' },
  { id: 'settings' as Section, label: 'Настройки', icon: 'Settings' },
];

export default function Layout({ active, onNav, children, user, onLogout, onAdminPanel }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-56 flex flex-col border-r border-border bg-[hsl(220,16%,6%)] shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-gold font-semibold text-base tracking-wide">КухниПро</div>
          <div className="text-[hsl(var(--text-muted))] text-xs mt-0.5 tracking-wider uppercase">Калькулятор мебели</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(item => (
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

        {/* User block */}
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

          {user?.role === 'admin' && onAdminPanel && (
            <button
              onClick={onAdminPanel}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,14%)] rounded transition-colors"
            >
              <Icon name="Shield" size={12} className="text-gold" />
              Пользователи
            </button>
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

          {!user && (
            <div className="text-[hsl(var(--text-muted))] text-xs px-1">v1.0 · 2026</div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
