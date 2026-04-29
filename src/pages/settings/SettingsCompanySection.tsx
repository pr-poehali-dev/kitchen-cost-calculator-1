import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { CompanyInfo } from '@/store/types';
import Icon from '@/components/ui/icon';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
      <div className="text-xs uppercase tracking-wider mb-4 font-medium text-[hsl(var(--text-muted))]">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsCompanySection() {
  const store = useStore();
  const [newUnit, setNewUnit] = useState('');

  const company: CompanyInfo = store.settings.company || { name: '' };
  const upd = (field: keyof CompanyInfo, value: string) =>
    store.updateSettings({ company: { ...company, [field]: value } });
  const inp = 'w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    store.addUnit(newUnit.trim());
    setNewUnit('');
  };

  return (
    <>
      <Section title="О компании">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Название компании</label>
              <input value={company.name || ''} onChange={e => upd('name', e.target.value)} placeholder="ООО «Моя Кухня»" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">ИНН</label>
              <input value={company.inn || ''} onChange={e => upd('inn', e.target.value)} placeholder="7712345678" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Телефон</label>
              <input value={company.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+7 (000) 000-00-00" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Email</label>
              <input value={company.email || ''} onChange={e => upd('email', e.target.value)} placeholder="info@company.ru" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Директор / ИП</label>
              <input value={company.director || ''} onChange={e => upd('director', e.target.value)} placeholder="Иванов Иван Иванович" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Сайт</label>
              <input value={company.website || ''} onChange={e => upd('website', e.target.value)} placeholder="https://example.ru" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Адрес</label>
            <input value={company.address || ''} onChange={e => upd('address', e.target.value)} placeholder="г. Москва, ул. Пушкина, д. 1" className={inp} />
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Префикс нумерации договоров</label>
            <div className="flex items-center gap-2">
              <input value={company.contractPrefix || ''} onChange={e => upd('contractPrefix', e.target.value)} placeholder="К-" className="w-24 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
              <span className="text-xs text-[hsl(var(--text-muted))]">
                Пример: <span className="font-mono text-foreground">{(company.contractPrefix || 'К-')}{new Date().getFullYear()}-001</span>
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Валюта">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Символ валюты</label>
            <input value={store.settings.currency} onChange={e => store.updateSettings({ currency: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" placeholder="₽" maxLength={3} />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-[hsl(220,12%,14%)] rounded px-3 py-2 text-sm text-[hsl(var(--text-dim))]">
              Пример: <span className="font-mono text-foreground">152 500 {store.settings.currency}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Единицы измерения">
        <div className="flex flex-wrap gap-2 mb-3">
          {store.settings.units.map(u => (
            <div key={u} className="flex items-center gap-1 bg-[hsl(220,12%,16%)] border border-border rounded pl-3 pr-1.5 py-1">
              <span className="text-sm text-foreground">{u}</span>
              <button onClick={() => store.deleteUnit(u)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors ml-1"><Icon name="X" size={11} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddUnit()} placeholder="Новая единица (напр. пог.м)"
            className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
          <button onClick={handleAddUnit} className="flex items-center gap-1.5 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
            <Icon name="Plus" size={14} /> Добавить
          </button>
        </div>
      </Section>
    </>
  );
}