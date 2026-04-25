import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  onLogin: (login: string, password: string) => Promise<string | null>;
  onRegister: (login: string, password: string) => Promise<string | null>;
}

export default function LoginPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fn = mode === 'login' ? onLogin : onRegister;
    const err = await fn(login.trim(), password.trim());
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen bg-[hsl(220,16%,7%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 mb-4">
            <Icon name="ChefHat" size={28} className="text-gold" />
          </div>
          <h1 className="text-xl font-bold text-foreground">КухниПро</h1>
          <p className="text-[hsl(var(--text-muted))] text-sm mt-1">Система расчёта кухонь</p>
        </div>

        {/* Card */}
        <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-[hsl(220,12%,14%)] rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${mode === 'login' ? 'bg-gold text-[hsl(220,16%,8%)]' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            >
              Вход
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${mode === 'register' ? 'bg-gold text-[hsl(220,16%,8%)]' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider block mb-1.5">Логин</label>
              <input
                autoFocus
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Ваш логин"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider block mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[hsl(220,12%,16%)] border border-border rounded-lg px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold transition-colors"
                required
                minLength={6}
              />
            </div>

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
                : mode === 'login' ? 'Войти' : 'Зарегистрироваться'
              }
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-[hsl(var(--text-muted))] text-center mt-4">
              Первый зарегистрированный пользователь получает права администратора
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
