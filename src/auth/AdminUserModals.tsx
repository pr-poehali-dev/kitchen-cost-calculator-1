import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { adminUrl, authHeaders, PLANS, type UserRow } from './adminTypes';

// ── Overlay ────────────────────────────────────────────────────────────────

export function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

// ── Создать пользователя ────────────────────────────────────────────────────

export function CreateUserForm({ token, onDone, onCancel }: {
  token: string; onDone: () => void; onCancel: () => void;
}) {
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

// ── Сменить пароль ─────────────────────────────────────────────────────────

export function ChangePasswordForm({ user, token, onDone, onCancel }: {
  user: UserRow; token: string; onDone: () => void; onCancel: () => void;
}) {
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
      <p className="text-xs text-[hsl(var(--text-muted))] mb-4">
        Пользователь: <span className="text-foreground font-medium">{user.login}</span>
      </p>
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

// ── Подтверждение удаления ─────────────────────────────────────────────────

export function DeleteConfirm({ user, token, onDone, onCancel }: {
  user: UserRow; token: string; onDone: () => void; onCancel: () => void;
}) {
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

// ── Профиль менеджера ──────────────────────────────────────────────────────

export function ProfileModal({ user, token, onSave, onClose }: {
  user: UserRow; token: string; onSave: () => void; onClose: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [poaNumber, setPoaNumber] = useState(user.poa_number || '');
  const [poaDate, setPoaDate] = useState(user.poa_date || '');
  const [saving, setSaving] = useState(false);

  const inp = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';

  const handleSave = async () => {
    setSaving(true);
    await fetch(adminUrl(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: user.id, full_name: fullName, poa_number: poaNumber, poa_date: poaDate || null }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-sm">Профиль менеджера</h3>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{user.login}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[hsl(var(--text-muted))] hover:text-foreground rounded transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">ФИО менеджера</label>
            <input className={inp} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
          </div>

          <div className="pt-1 pb-1 border-t border-border">
            <div className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-2 mt-1 flex items-center gap-1.5">
              <Icon name="ScrollText" size={11} /> Доверенность
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Номер</label>
                <input className={inp} value={poaNumber} onChange={e => setPoaNumber(e.target.value)} placeholder="12/2024" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-muted))] mb-1 block">Дата</label>
                <input type="date" className={inp} value={poaDate} onChange={e => setPoaDate(e.target.value)} />
              </div>
            </div>
            {(poaNumber || poaDate) && (
              <div className="mt-2 p-2 bg-[hsl(220,12%,14%)] rounded text-xs text-[hsl(var(--text-muted))] border border-border">
                В договоре: <span className="text-foreground">«действующего на основании доверенности № {poaNumber || '___'} от {poaDate ? new Date(poaDate).toLocaleDateString('ru') : '___'}»</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded text-sm text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
