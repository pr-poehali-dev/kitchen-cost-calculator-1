import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Unit } from '@/store/types';
import Icon from '@/components/ui/icon';

const ALL_UNITS: Unit[] = ['м²', 'м.п.', 'шт', 'компл', 'л', 'кг'];

export default function SettingsPage() {
  const store = useStore();
  const [newUnit, setNewUnit] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Настройки</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">Общие параметры приложения</p>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-5 max-w-2xl">

        {/* Currency */}
        <Section title="Валюта и формат">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Символ валюты</label>
              <input
                value={store.settings.currency}
                onChange={e => store.updateSettings({ currency: e.target.value })}
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
                placeholder="₽"
                maxLength={3}
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-[hsl(220,12%,14%)] rounded px-3 py-2 text-sm text-[hsl(var(--text-dim))]">
                Пример: <span className="font-mono text-foreground">152 500 {store.settings.currency}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Units */}
        <Section title="Единицы измерения">
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_UNITS.map(u => (
              <span key={u} className="bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-1 text-sm text-foreground flex items-center gap-2">
                {u}
                <span className="text-[hsl(var(--text-muted))] text-xs">• системная</span>
              </span>
            ))}
          </div>
          <div className="text-xs text-[hsl(var(--text-muted))]">Системные единицы измерения используются во всём приложении</div>
        </Section>

        {/* Markups summary */}
        <Section title="Наценки (настраиваются в разделе «Расходы»)">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[hsl(220,12%,14%)] rounded p-3 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--text-dim))]">На материалы</span>
              <span className="font-mono text-gold text-sm">{store.settings.markupMaterial}%</span>
            </div>
            <div className="bg-[hsl(220,12%,14%)] rounded p-3 flex items-center justify-between">
              <span className="text-sm text-[hsl(var(--text-dim))]">На услуги</span>
              <span className="font-mono text-gold text-sm">{store.settings.markupService}%</span>
            </div>
          </div>
        </Section>

        {/* Stats */}
        <Section title="Статистика базы данных">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Проектов', value: store.projects.length, icon: 'FolderOpen' },
              { label: 'Поставщиков', value: store.suppliers.length, icon: 'Truck' },
              { label: 'Материалов', value: store.materials.length, icon: 'Package' },
              { label: 'Услуг', value: store.services.length, icon: 'Wrench' },
            ].map(stat => (
              <div key={stat.label} className="bg-[hsl(220,12%,14%)] rounded p-3 text-center">
                <Icon name={stat.icon} size={18} className="text-gold mx-auto mb-1" />
                <div className="text-xl font-mono font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-[hsl(var(--text-muted))]">{stat.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* About */}
        <Section title="О приложении">
          <div className="space-y-2 text-sm text-[hsl(var(--text-dim))]">
            <div className="flex justify-between"><span>Версия</span><span className="font-mono">1.0.0</span></div>
            <div className="flex justify-between"><span>Данные хранятся</span><span>Локально в браузере</span></div>
            <div className="flex justify-between"><span>Разработано</span><span>2026</span></div>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Опасная зона" danger>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">Сбросить все данные</div>
              <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">Удалит все проекты, материалы, услуги и расходы</div>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 border border-destructive text-destructive rounded text-sm hover:bg-destructive hover:text-white transition-colors"
              >
                Сбросить
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-destructive text-white rounded text-sm hover:opacity-90"
                >Подтвердить</button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-4 py-2 border border-border text-[hsl(var(--text-dim))] rounded text-sm hover:text-foreground"
                >Отмена</button>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-[hsl(220,14%,11%)] rounded border ${danger ? 'border-destructive/30' : 'border-border'} p-5`}>
      <div className={`text-xs uppercase tracking-wider mb-4 ${danger ? 'text-destructive' : 'text-[hsl(var(--text-muted))]'}`}>{title}</div>
      {children}
    </div>
  );
}
