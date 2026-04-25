import Icon from '@/components/ui/icon';

type Section = 'home' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings';

interface LayoutProps {
  active: Section;
  onNav: (s: Section) => void;
  children: React.ReactNode;
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

export default function Layout({ active, onNav, children }: LayoutProps) {
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
        <div className="px-5 py-4 border-t border-border">
          <div className="text-[hsl(var(--text-muted))] text-xs">v1.0 · 2026</div>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
