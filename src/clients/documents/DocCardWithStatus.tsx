import Icon from '@/components/ui/icon';
import type { DocDef } from './docTypes';
import { DocCard } from './DocCard';

// ── localStorage: статус отправки ───────────────────────────────
const SENT_KEY = (clientId: string, docId: string) => `doc_sent_${clientId}_${docId}`;

export function getSentStatus(clientId: string, docId: string): { date: string; channel: string } | null {
  try { return JSON.parse(localStorage.getItem(SENT_KEY(clientId, docId)) || 'null'); } catch { return null; }
}

export function setSentStatus(clientId: string, docId: string, channel: string) {
  localStorage.setItem(SENT_KEY(clientId, docId), JSON.stringify({ date: new Date().toISOString().slice(0, 10), channel }));
}

// ── Обёртка DocCard со статусом отправки ────────────────────────
interface Props {
  doc: DocDef;
  clientId: string;
  clientName: string;
  onSave?: () => Promise<void>;
  hasDraft?: boolean;
  sentStatus: { date: string; channel: string } | null;
  onMarkSent: (channel: string) => void;
}

export function DocCardWithStatus({ doc, clientId, clientName, onSave, hasDraft, sentStatus, onMarkSent }: Props) {
  return (
    <div>
      <DocCard doc={doc} clientId={clientId} clientName={clientName} onSave={onSave} hasDraft={hasDraft} onAfterShare={onMarkSent} />
      {sentStatus && (
        <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-400">
          <Icon name="CheckCircle" size={11} />
          Отправлен {sentStatus.date} · {sentStatus.channel}
          <button onClick={() => onMarkSent('')} className="ml-auto text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
