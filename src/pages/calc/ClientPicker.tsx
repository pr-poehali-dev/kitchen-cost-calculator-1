import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { Client } from '@/clients/types';
import { clientFullName } from '@/clients/types';
import { API_URLS } from '@/config/api';

function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}

interface Props {
  clientId?: string;
  clientName?: string;
  onSelect: (client: Client) => void;
  onClear: () => void;
  onOpenClient?: (clientId: string) => void;
}

export default function ClientPicker({ clientId, clientName, onSelect, onClear, onOpenClient }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ action: 'list', page: '1', per_page: '50' });
    if (query) params.set('q', query);
    fetch(`${API_URLS.clients}/?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, query]);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (c: Client) => {
    onSelect(c);
    setOpen(false);
    setQuery('');
  };

  if (clientId && clientName) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon name="User" size={13} className="text-gold shrink-0" />
        <button
          onClick={() => onOpenClient?.(clientId)}
          className="text-sm font-medium text-gold hover:text-amber-300 transition-colors truncate max-w-[160px]"
          title={`Открыть карточку: ${clientName}`}
        >
          {clientName}
        </button>
        <button
          onClick={onClear}
          className="p-0.5 text-[hsl(var(--text-muted))] hover:text-foreground transition-colors shrink-0"
          title="Отвязать клиента"
        >
          <Icon name="X" size={11} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-foreground border border-dashed border-border hover:border-[hsl(var(--text-dim))] rounded px-2 py-1 transition-colors"
      >
        <Icon name="UserPlus" size={12} />
        <span>Привязать клиента</span>
      </button>

      {open && (
        <div className="absolute top-8 left-0 z-50 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl w-72">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-[hsl(220,12%,10%)] rounded">
              <Icon name="Search" size={13} className="text-[hsl(var(--text-muted))] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск по имени, телефону..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--text-muted))]"
              />
              {loading && <Icon name="Loader2" size={13} className="text-[hsl(var(--text-muted))] animate-spin shrink-0" />}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {clients.length === 0 && !loading && (
              <div className="px-3 py-4 text-xs text-[hsl(var(--text-muted))] text-center">
                {query ? 'Клиентов не найдено' : 'Начните вводить имя или телефон'}
              </div>
            )}
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2 hover:bg-[hsl(220,12%,18%)] transition-colors flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gold">
                    {(c.first_name?.[0] || c.last_name?.[0] || '?').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{clientFullName(c) || '— без имени —'}</div>
                  {c.phone && <div className="text-xs text-[hsl(var(--text-muted))] truncate">{c.phone}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
