import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { AuthUser } from './useAuth';
import { API_URLS } from '@/config/api';

const ADMIN_URL = API_URLS.admin;

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

type Modal =
  | { type: 'create' }
  | { type: 'password'; user: UserRow }
  | { type: 'delete'; user: UserRow }
  | null;

function adminUrl() {
  return `${ADMIN_URL}`;
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export default function AdminPanel({ currentUser, token, inline, onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(adminUrl(), { headers: authHeaders(token) });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const update = async (id: number, fields: Record<string, string>) => {
    setSaving(id);
    await fetch(adminUrl(), {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ id, ...fields }),
    });
    setSaving(null);
    fetchUsers();
  };

  const fmtDate = (s: string | null) => {
    if (!s || s === 'None') return '—';
    return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="Users" size={16} className="text-gold" />
          <span className="font-semibold">Пользователи</span>
          <span className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,16%)] px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="UserPlus" size={13} />
          Добавить
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[hsl(var(--text-muted))]">
            <Icon name="Loader2" size={16} className="animate-spin" />
            Загрузка...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--text-muted))]">
            <Icon name="Users" size={32} className="opacity-30" />
            <span className="text-sm">Нет пользователей</span>
            <button
              onClick={() => setModal({ type: 'create' })}
              className="text-xs text-gold hover:underline"
            >
              Добавить первого
            </button>
          </div>
        ) : (
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
                  onChange={e => update(u.id, { role: e.target.value })}
                  className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40 cursor-pointer"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>

                {/* Статус */}
                <select
                  value={u.status}
                  disabled={u.id === currentUser.id || saving === u.id}
                  onChange={e => update(u.id, { status: e.target.value })}
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
                  onChange={e => update(u.id, { plan: e.target.value })}
                  className="bg-[hsl(220,12%,18%)] border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-gold disabled:opacity-40 cursor-pointer"
                >
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.created_at)}</span>
                <span className="text-xs text-[hsl(var(--text-dim))]">{fmtDate(u.last_login)}</span>

                {/* Действия */}
                <div className="flex items-center gap-1 pl-2">
                  <button
                    title="Сменить пароль"
                    onClick={() => setModal({ type: 'password', user: u })}
                    className="p-1.5 text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,22%)] rounded transition-colors"
                  >
                    <Icon name="KeyRound" size={13} />
                  </button>
                  {u.id !== currentUser.id && (
                    <button
                      title="Удалить"
                      onClick={() => setModal({ type: 'delete', user: u })}
                      className="p-1.5 text-[hsl(var(--text-muted))] hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальные окна */}
      {modal && (
        <ModalOverlay onClose={() => setModal(null)}>
          {modal.type === 'create' && (
            <CreateUserForm
              token={token}
              onDone={() => { setModal(null); fetchUsers(); }}
              onCancel={() => setModal(null)}
            />
          )}
          {modal.type === 'password' && (
            <ChangePasswordForm
              user={modal.user}
              token={token}
              onDone={() => setModal(null)}
              onCancel={() => setModal(null)}
            />
          )}
          {modal.type === 'delete' && (
            <DeleteConfirm
              user={modal.user}
              token={token}
              onDone={() => { setModal(null); fetchUsers(); }}
              onCancel={() => setModal(null)}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

function CreateUserForm({ token, onDone, onCancel }: { token: string; onDone: () => void; onCancel: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [plan, setPlan] = useState('free');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(adminUrl(), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ login: login.trim().toLowerCase(), password, role, plan }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Ошибка'); return; }
    onDone();
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="UserPlus" size={15} className="text-gold" />
        <span className="font-semibold text-sm">Новый пользователь</span>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Логин</label>
          <input
            autoFocus
            value={login}
            onChange={e => setLogin(e.target.value)}
            required minLength={3}
            className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            placeholder="Имя пользователя"
          />
        </div>
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Пароль</label>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            required minLength={8}
            className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            placeholder="Минимум 8 символов"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Роль</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Тариф</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold">
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 text-xs text-[hsl(var(--text-muted))] border border-border rounded-lg hover:bg-[hsl(220,12%,16%)] transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 text-xs bg-gold text-[hsl(220,16%,8%)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1">
            {loading ? <><Icon name="Loader2" size={12} className="animate-spin" /> Создание...</> : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChangePasswordForm({ user, token, onDone, onCancel }: { user: UserRow; token: string; onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(adminUrl(), {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ id: user.id, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Ошибка'); return; }
    onDone();
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="KeyRound" size={15} className="text-gold" />
        <span className="font-semibold text-sm">Смена пароля</span>
      </div>
      <p className="text-xs text-[hsl(var(--text-muted))] mb-4">Пользователь: <span className="text-foreground font-medium">{user.login}</span></p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-[hsl(var(--text-muted))] block mb-1">Новый пароль</label>
          <input
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            required minLength={8}
            className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors"
            placeholder="Минимум 8 символов"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 text-xs text-[hsl(var(--text-muted))] border border-border rounded-lg hover:bg-[hsl(220,12%,16%)] transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 text-xs bg-gold text-[hsl(220,16%,8%)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1">
            {loading ? <><Icon name="Loader2" size={12} className="animate-spin" /> Сохраняю...</> : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirm({ user, token, onDone, onCancel }: { user: UserRow; token: string; onDone: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    await fetch(adminUrl(), {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({ id: user.id }),
    });
    setLoading(false);
    onDone();
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="Trash2" size={15} className="text-destructive" />
        <span className="font-semibold text-sm">Удалить пользователя</span>
      </div>
      <p className="text-sm text-[hsl(var(--text-muted))] mb-5">
        Удалить <span className="text-foreground font-medium">{user.login}</span>? Это действие нельзя отменить.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 text-xs text-[hsl(var(--text-muted))] border border-border rounded-lg hover:bg-[hsl(220,12%,16%)] transition-colors">
          Отмена
        </button>
        <button onClick={confirm} disabled={loading}
          className="flex-1 py-2 text-xs bg-destructive text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1">
          {loading ? <><Icon name="Loader2" size={12} className="animate-spin" /> Удаление...</> : 'Удалить'}
        </button>
      </div>
    </div>
  );
}