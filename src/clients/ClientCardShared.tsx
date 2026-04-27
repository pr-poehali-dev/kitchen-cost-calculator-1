import Icon from '@/components/ui/icon';

export const INPUT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';
export const SELECT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors';
export const TEXTAREA = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors resize-none placeholder:text-[hsl(var(--text-muted))]';

export function Field({ label, children }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Section({ title, icon, children, action }: { title: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
          <Icon name={icon} size={13} />{title}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}