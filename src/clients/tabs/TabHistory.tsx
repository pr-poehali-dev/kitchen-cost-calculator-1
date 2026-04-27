import Icon from '@/components/ui/icon';
import type { ClientHistoryItem } from '../types';

const ACTION_ICONS: Record<string, string> = {
  created: 'UserPlus',
  updated: 'Edit3',
  status_changed: 'ArrowRight',
  photo_added: 'Image',
  comment_added: 'MessageSquare',
};

export function TabHistory({ history }: { history: ClientHistoryItem[] }) {
  if (history.length === 0) {
    return <div className="text-center text-[hsl(var(--text-muted))] text-sm py-12">История действий пуста</div>;
  }

  return (
    <div className="space-y-1">
      {history.map(item => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(220,12%,13%)] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[hsl(220,12%,16%)] flex items-center justify-center shrink-0 mt-0.5">
            <Icon name={ACTION_ICONS[item.action] || 'Clock'} size={12} className="text-[hsl(var(--text-muted))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground">{item.description}</div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[hsl(var(--text-muted))]">
              <span>{item.user_name || 'Система'}</span>
              <span>·</span>
              <span>{new Date(item.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
