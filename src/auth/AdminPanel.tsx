import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { AuthUser } from './useAuth';

const ADMIN_URL = 'https://functions.poehali.dev/e48c5260-c45a-48c2-be96-d451e6422c7b';

interface UserRow {
  id: number;
  login: string;
  role: string;
  status: string;
  plan: string;
  created_at: string;
  last_login: string | null;
}

interface Props {
  currentUser: AuthUser;
  token: string;
  inline?: boolean;
  onClose?: () => void;
}

const PLANS = ['free', 'pro', 'enterprise'];
const STATUSES = ['active', 'banned'];

export default function AdminPanel({ currentUser, token, inline, onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(ADMIN_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const update = async (id: number, fields: Record<string, string>) => {
    setSaving(id);
    await fetch(ADMIN_URL, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    setSaving(null);
    fetchUsers();
  };

  const fmtDate = (s: string | null) => {
    if (!s || s === 'None') return '—';
    return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="Users" size={16} className="text-gold" />
          <span className="font-semibold">Пользователи</span>
          <span className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,16%)] px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>
        {!inline && onClose && (
          <button onClick={onClose} className="text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-[hsl(var(--text-muted))]">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--text-muted))]">
            <Icon name="Users" size={32} className="opacity-30" />
            <span className="text-sm">Нет пользователей</span>
          </div>
        ) : (
          <div className="bg-[hsl(220,12%,14%)] rounded-lg border border-border overflow-hidden">
            <div
              className="grid text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] px-4 py-2.5 border-b border-border"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}
            >
              <span>Логин</span>
              <span>Роль</span>
              <span>Статус</span>
              <span>Тариф</span>
              <span>Регистрация</span>
              <span>Вход</span>
            </div>

            {users.map(u => (
              <div
                key={u.id}
                className={`grid items-center px-4 py-3 border-b border-[hsl(220,12%,17%)] last:border-0 transition-colors ${
                  u.status === 'banned' ? 'opacity-50' : ''
                } ${u.id === currentUser.id ? 'bg-gold/5' : 'hover:bg-[hsl(220,12%,16%)]'}`}
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr' }}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={u.role === 'admin' ? 'ShieldCheck' : 'User'}
                    size={13}
                    className={u.role === 'admin' ? 'text-gold' : 'text-[hsl(var(--text-muted))]'}
                  />
                  <span className="text-sm font-medium">{u.login}</span>
                  {u.id === currentUser.id && <span className="text-xs text-gold opacity-60">(вы)</span>}
                </div>

                <select
                  value={u.role}
                  disabled={u.id === currentUser.id || saving === u.id}
                  onChange={e => update(u.id, { role: e.target.value })}
                  className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>

                <select
                  value={u.status}
                  disabled={u.id === currentUser.id || saving === u.id}
                  onChange={e => update(u.id, { status: e.target.value })}
                  className={`bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs outline-none focus:border-gold disabled:opacity-40 ${
                    u.status === 'banned' ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={u.plan}
                  disabled={saving === u.id}
                  onChange={e => update(u.id, { plan: e.target.value })}
                  className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40"
                >
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.created_at)}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.last_login)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-background">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {content}
      </div>
    </div>
  );
}
