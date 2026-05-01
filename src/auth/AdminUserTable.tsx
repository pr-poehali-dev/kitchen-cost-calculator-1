import Icon from '@/components/ui/icon';
import { PLANS, STATUSES, fmtDate, type UserRow, type Modal } from './adminTypes';
import type { AuthUser } from './useAuth';

interface Props {
  users: UserRow[];
  loading: boolean;
  saving: number | null;
  currentUser: AuthUser;
  onAdd: () => void;
  onUpdate: (id: number, fields: Record<string, string>) => void;
  onModal: (modal: Modal) => void;
}

export default function AdminUserTable({
  users, loading, saving, currentUser, onAdd, onUpdate, onModal,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[hsl(var(--text-muted))]">
        <Icon name="Loader2" size={16} className="animate-spin" />
        Загрузка...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--text-muted))]">
        <Icon name="Users" size={32} className="opacity-30" />
        <span className="text-sm">Нет пользователей</span>
        <button onClick={onAdd} className="text-xs text-gold hover:underline">
          Добавить первого
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border overflow-hidden">
      {/* Шапка */}
      <div
        className="grid text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2.5 border-b border-border bg-[hsl(220,12%,12%)]"
        style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1.5fr auto' }}
      >
        <span>Логин</span>
        <span>Роль</span>
        <span>Статус</span>
        <span>Тариф</span>
        <span>Регистрация</span>
        <span>Последний вход</span>
        <span></span>
      </div>

      {users.map(u => (
        <div
          key={u.id}
          className={`grid items-center px-4 py-3 border-b border-[hsl(220,12%,17%)] last:border-0 transition-colors ${
            u.status === 'banned' ? 'opacity-50' : ''
          } ${u.id === currentUser.id ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,16%)]'}`}
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 1.5fr auto' }}
        >
          {/* Логин */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              u.role === 'admin' ? 'bg-gold/15' : 'bg-[hsl(220,12%,20%)]'
            }`}>
              <Icon
                name={u.role === 'admin' ? 'ShieldCheck' : 'User'}
                size={12}
                className={u.role === 'admin' ? 'text-gold' : 'text-[hsl(var(--text-muted))]'}
              />
            </div>
            <span className="text-sm font-medium truncate">{u.login}</span>
            {u.id === currentUser.id && <span className="text-[10px] text-gold opacity-60 shrink-0">вы</span>}
          </div>

          {/* Роль */}
          <select
            value={u.role}
            disabled={u.id === currentUser.id || saving === u.id}
            onChange={e => onUpdate(u.id, { role: e.target.value })}
            className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40 cursor-pointer"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>

          {/* Статус */}
          <select
            value={u.status}
            disabled={u.id === currentUser.id || saving === u.id}
            onChange={e => onUpdate(u.id, { status: e.target.value })}
            className={`bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs outline-none focus:border-gold disabled:opacity-40 cursor-pointer ${
              u.status === 'banned' ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Тариф */}
          <select
            value={u.plan}
            disabled={saving === u.id}
            onChange={e => onUpdate(u.id, { plan: e.target.value })}
            className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40 cursor-pointer"
          >
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.created_at)}</span>
          <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.last_login)}</span>

          {/* Действия */}
          <div className="flex items-center gap-1 pl-2">
            <button
              title="Профиль менеджера"
              onClick={() => onModal({ type: 'profile', user: u })}
              className="p-1.5 text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,22%)] rounded transition-colors"
            >
              <Icon name="ScrollText" size={13} />
            </button>
            <button
              title="Сменить пароль"
              onClick={() => onModal({ type: 'password', user: u })}
              className="p-1.5 text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,22%)] rounded transition-colors"
            >
              <Icon name="KeyRound" size={13} />
            </button>
            {u.id !== currentUser.id && (
              <button
                title="Удалить"
                onClick={() => onModal({ type: 'delete', user: u })}
                className="p-1.5 text-[hsl(var(--text-muted))] hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                <Icon name="Trash2" size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
