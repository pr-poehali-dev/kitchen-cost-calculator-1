import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/auth/useAuth';
import { API_URLS } from '@/config/api';

interface Props {
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteTemplateDialog({ templateName, onConfirm, onCancel }: Props) {
  const { getToken } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError('Введите пароль'); return; }
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_URLS.auth}/?action=verify_password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('Неверный пароль');
        setPassword('');
        inputRef.current?.focus();
        return;
      }
      onConfirm();
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Заголовок */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <Icon name="Trash2" size={16} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Удалить шаблон</h3>
            <p className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5 leading-relaxed">
              Шаблон <span className="text-foreground font-medium">«{templateName}»</span> будет удалён без возможности восстановления.
            </p>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] text-[hsl(var(--text-muted))] block mb-1.5">
              Введите пароль администратора для подтверждения
            </label>
            <div className="relative">
              <Icon name="Lock" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[hsl(220,14%,14%)] border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                <Icon name="AlertCircle" size={11} />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-3 py-2 rounded-lg border border-border text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              {loading
                ? <><Icon name="Loader2" size={12} className="animate-spin" />Проверка...</>
                : <><Icon name="Trash2" size={12} />Удалить</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
