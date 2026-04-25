import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const SAVED_LOGIN_KEY = 'kuhni_saved_login';

interface Props {
  onLogin: (login: string, password: string, remember: boolean) => Promise<string | null>;
}

export default function LoginPage({ onLogin }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_LOGIN_KEY);
    if (saved) setLogin(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (remember) {
      localStorage.setItem(SAVED_LOGIN_KEY, login.trim());
    } else {
      localStorage.removeItem(SAVED_LOGIN_KEY);
    }
    const err = await onLogin(login.trim(), password.trim(), remember);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-[hsl(220,16%,7%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 mb-4">
            <Icon name="ChefHat" size={28} className="text-gold" />
          </div>
          <h1 className="text-xl font-bold text-foreground">КухниПро</h1>
          <p className="text-[hsl(var(--text-muted))] text-sm mt-1">Система расчёта кухонь</p>
        </div>

        <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-foreground mb-5">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider block mb-1.5">Логин</label>
              <input
                autoFocus
                autoComplete="username"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Ваш логин"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider block mb-1.5">Пароль</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors"
                required
              />
            </div>

            {/* Запомнить меня */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setRemember(r => !r)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  remember
                    ? 'bg-gold border-gold'
                    : 'border-border bg-[hsl(220,12%,16%)] group-hover:border-[hsl(var(--text-muted))]'
                }`}
              >
                {remember && <Icon name="Check" size={10} className="text-[hsl(220,16%,8%)]" />}
              </div>
              <span className="text-xs text-[hsl(var(--text-muted))]">Запомнить меня на 2 дня</span>
            </label>

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5 text-sm text-destructive">
                <Icon name="AlertCircle" size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gold text-[hsl(220,16%,8%)] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Icon name="Loader2" size={14} className="animate-spin" /> Загрузка...</>
                : 'Войти'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
