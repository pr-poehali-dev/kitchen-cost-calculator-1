import { useState, useCallback } from 'react';
import Icon from './icon';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let _show: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const show = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, resolve });
    });
  }, []);

  _show = show;

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  const Dialog = state ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="bg-[hsl(220,14%,11%)] border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${state.danger !== false ? 'bg-destructive/15' : 'bg-amber-400/15'}`}>
            <Icon
              name={state.danger !== false ? 'Trash2' : 'AlertTriangle'}
              size={16}
              className={state.danger !== false ? 'text-destructive' : 'text-amber-400'}
            />
          </div>
          <div>
            {state.title && <p className="font-semibold text-sm text-foreground mb-1">{state.title}</p>}
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed">{state.message}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-colors ${
              state.danger !== false
                ? 'bg-destructive text-white hover:opacity-90'
                : 'bg-amber-500 text-white hover:opacity-90'
            }`}
          >
            {state.confirmText ?? 'Удалить'}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 px-4 text-sm border border-border rounded-lg text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,16%)] transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { Dialog };
}

// Глобальная функция — вызывается из любого места
export async function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!_show) return window.confirm(opts.message); // fallback
  return _show(opts);
}