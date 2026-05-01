import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCatalog } from '@/hooks/useCatalog';
import Icon from '@/components/ui/icon';

const ACCENT_KEY = 'kuhni_pro_accent';

const ACCENTS = [
  { id: 'gold',    label: 'Золото',    color: 'hsl(38,60%,58%)' },
  { id: 'blue',    label: 'Синий',     color: 'hsl(210,80%,60%)' },
  { id: 'emerald', label: 'Изумруд',   color: 'hsl(160,60%,45%)' },
  { id: 'violet',  label: 'Фиолет',    color: 'hsl(260,60%,65%)' },
  { id: 'rose',    label: 'Розовый',   color: 'hsl(340,70%,60%)' },
  { id: 'orange',  label: 'Оранжевый', color: 'hsl(25,90%,55%)' },
] as const;

type AccentId = typeof ACCENTS[number]['id'];

function applyAccent(id: AccentId) {
  const root = document.documentElement;
  if (id === 'gold') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', id);
  localStorage.setItem(ACCENT_KEY, id);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
      <div className="text-xs uppercase tracking-wider mb-4 font-medium text-[hsl(var(--text-muted))]">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsAppSection() {
  const store = useStore();
  const catalog = useCatalog();
  const [accent, setAccent] = useState<AccentId>(() => (localStorage.getItem(ACCENT_KEY) as AccentId) || 'gold');

  useEffect(() => {
    applyAccent(accent);
  }, []);

  const handleAccentChange = (id: AccentId) => {
    setAccent(id);
    applyAccent(id);
  };

  return (
    <>
      <Section title="Статистика">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Проектов',      value: store.projects.length,      icon: 'FolderOpen' },
            { label: 'Производителей', value: catalog.manufacturers.length, icon: 'Building2' },
            { label: 'Поставщиков',   value: catalog.vendors.length,        icon: 'Truck' },
            { label: 'Материалов',    value: catalog.materials.length,      icon: 'Package' },
            { label: 'Услуг',         value: store.services.length,       icon: 'Wrench' },
          ].map(stat => (
            <div key={stat.label} className="bg-[hsl(220,12%,14%)] rounded p-3 text-center">
              <Icon name={stat.icon} size={18} className="text-gold mx-auto mb-1" />
              <div className="text-xl font-mono font-semibold text-foreground">{stat.value}</div>
              <div className="text-xs text-[hsl(var(--text-muted))]">{stat.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="О приложении">
        <div className="space-y-2 text-sm text-[hsl(var(--text-dim))]">
          <div className="flex justify-between"><span>Версия</span><span className="font-mono">1.2.0</span></div>
          <div className="flex justify-between"><span>Данные хранятся</span><span>Локально в браузере</span></div>
          <div className="flex justify-between"><span>Разработано</span><span>2026</span></div>
        </div>
      </Section>

      <Section title="Внешний вид">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-[hsl(var(--text-muted))] mb-2">Акцентный цвет интерфейса</div>
            <div className="flex gap-2 flex-wrap">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => handleAccentChange(a.id)}
                  title={a.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                    accent === a.id ? 'border-white/40 bg-[hsl(220,12%,18%)]' : 'border-border hover:border-[hsl(220,12%,28%)]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span className={accent === a.id ? 'text-foreground font-medium' : 'text-[hsl(var(--text-dim))]'}>{a.label}</span>
                  {accent === a.id && <Icon name="Check" size={12} className="text-foreground" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}