import Icon from '@/components/ui/icon';
import type { ClientStatus } from '../types';
import { CLIENT_STATUSES } from '../types';
import { INPUT } from '../ClientCardShared';

// ── Форматирование телефона ──────────────────────────────────────
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits.startsWith('7') ? digits : '7' + digits;
  const n = d.slice(0, 11);
  if (n.length === 0) return '';
  let result = '+' + n[0];
  if (n.length > 1) result += ' (' + n.slice(1, 4);
  if (n.length > 4) result += ') ' + n.slice(4, 7);
  if (n.length > 7) result += '-' + n.slice(7, 9);
  if (n.length > 9) result += '-' + n.slice(9, 11);
  return result;
}

// ── Поле ввода телефона ─────────────────────────────────────────
export function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '+') { onChange(''); return; }
    onChange(formatPhone(raw));
  };
  return (
    <input
      className={INPUT}
      value={value}
      onChange={handleChange}
      placeholder={placeholder || '+7 (___) ___-__-__'}
      inputMode="tel"
    />
  );
}

// ── Таймлайн статусов ───────────────────────────────────────────
export const STATUS_FLOW: ClientStatus[] = ['new', 'measure', 'agreement', 'production', 'delivery', 'done'];

export function StatusTimeline({ status, onStatusChange }: { status: string; onStatusChange: (s: ClientStatus) => void }) {
  const currentIdx = STATUS_FLOW.indexOf(status as ClientStatus);
  const isCancelled = status === 'cancelled';

  return (
    <div className="flex items-center gap-0 w-full">
      {STATUS_FLOW.map((s, i) => {
        const info = CLIENT_STATUSES.find(x => x.id === s)!;
        const isDone = !isCancelled && currentIdx > i;
        const isCurrent = !isCancelled && currentIdx === i;
        const isFuture = isCancelled || currentIdx < i;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => onStatusChange(s)}
              title={info.label}
              className="flex flex-col items-center gap-1.5 group flex-1 min-w-0"
            >
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold ${
                  isCurrent ? 'scale-110 shadow-md' : 'group-hover:scale-105'
                }`}
                style={
                  isDone
                    ? { background: info.color, borderColor: info.color, color: '#fff' }
                    : isCurrent
                    ? { background: info.color, borderColor: info.color, color: '#fff', boxShadow: `0 0 8px ${info.color}66` }
                    : { borderColor: info.color + '44', color: info.color + '88' }
                }
              >
                {isDone ? <Icon name="Check" size={11} /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-[10px] text-center leading-tight truncate w-full px-0.5 ${
                isCurrent ? 'font-semibold' : isFuture ? 'opacity-40' : ''
              }`} style={isCurrent || isDone ? { color: info.color } : {}}>
                {info.label}
              </span>
            </button>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`h-0.5 w-3 shrink-0 mx-0.5 rounded transition-colors ${isDone ? 'opacity-60' : 'opacity-20'}`}
                style={{ background: isDone ? CLIENT_STATUSES.find(x => x.id === s)!.color : '#888' }}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
          <Icon name="XCircle" size={12} />
          Отменён
        </div>
      )}
    </div>
  );
}
