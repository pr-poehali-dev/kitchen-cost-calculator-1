import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { useClient, useClients } from './useClients';
import { CLIENT_STATUSES, clientFullName, emptyClient } from './types';
import type { Client, ClientStatus } from './types';
import TabDocuments from './TabDocuments';
import { TabOverview, TabData, TabContract, TabHistory } from './ClientCardTabs';
import { TabPhotos } from './ClientCardPhotos';
import { Skeleton } from '@/components/Skeleton';

function calcProfileProgress(c: Client): { pct: number; filled: number; total: number } {
  const fields: (keyof Client)[] = [
    'last_name', 'first_name', 'phone', 'email', 'messenger',
    'delivery_city', 'delivery_street', 'delivery_house',
    'contract_number', 'contract_date', 'total_amount',
    'delivery_date', 'designer',
    'passport_series', 'passport_number',
  ];
  const filled = fields.filter(f => {
    const v = c[f];
    // total_amount: 0 считается заполненным (сумма может быть нулевой)
    if (f === 'total_amount') return v !== null && v !== undefined && v !== '';
    return v !== null && v !== undefined && v !== '' && v !== 0;
  }).length;
  return { pct: Math.round((filled / fields.length) * 100), filled, total: fields.length };
}

type Tab = 'overview' | 'data' | 'contract' | 'photos' | 'documents' | 'history';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Сводка',     icon: 'LayoutDashboard' },
  { id: 'data',       label: 'Данные',     icon: 'User' },
  { id: 'contract',   label: 'Договор',    icon: 'FileText' },
  { id: 'photos',     label: 'Фото',       icon: 'Image' },
  { id: 'documents',  label: 'Документы',  icon: 'BookOpen' },
  { id: 'history',    label: 'История',    icon: 'Clock' },
];

export default function ClientCard({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const { client, photos, history, loading, saving, save, changeStatus, uploadPhoto, deletePhoto } = useClient(clientId);
  const { createClient } = useClients();
  const [tab, setTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState<Client | null>(null);
  const [saved, setSaved] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const current = draft ?? client;

  const onChange = (field: keyof Client, value: unknown) => {
    setDraft(prev => ({ ...(prev ?? client!), [field]: value } as Client));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    const ok = await save(draft);
    if (ok) { setSaved(true); setDraft(null); setTimeout(() => setSaved(false), 2000); }
  };

  const handleStatusChange = async (status: ClientStatus) => {
    onChange('status', status);
    if (client) await changeStatus(status);
  };

  const handleDuplicate = async () => {
    if (!current) return;
    setDuplicating(true);
    const base = emptyClient();
    const copy = {
      ...base,
      last_name: current.last_name,
      first_name: current.first_name,
      middle_name: current.middle_name,
      phone: current.phone,
      phone2: current.phone2,
      messenger: current.messenger,
      email: current.email,
      delivery_city: current.delivery_city,
      delivery_street: current.delivery_street,
      delivery_house: current.delivery_house,
      delivery_apt: current.delivery_apt,
      delivery_entrance: current.delivery_entrance,
      delivery_floor: current.delivery_floor,
      delivery_elevator: current.delivery_elevator,
      delivery_note: current.delivery_note,
      designer: current.designer,
      measurer: current.measurer,
      comment: `Копия клиента: ${clientFullName(current)}`,
    };
    await createClient(copy);
    setDuplicating(false);
    onBack();
  };

  const progress = useMemo(() => current ? calcProfileProgress(current) : null, [current]);

  const yandexMapUrl = useMemo(() => {
    if (!current) return null;
    const parts = [current.delivery_city, current.delivery_street, current.delivery_house].filter(Boolean);
    if (parts.length < 2) return null;
    return `https://maps.yandex.ru/?text=${encodeURIComponent(parts.join(', '))}`;
  }, [current]);

  if (loading || !current) {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        {/* Header skeleton */}
        <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        {/* Tabs skeleton */}
        <div className="border-b border-border px-6 flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20 mt-1 rounded-t" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full rounded" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusInfo = CLIENT_STATUSES.find(s => s.id === current.status);
  const name = clientFullName(current);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors group">
            <span className="w-5 h-5 rounded flex items-center justify-center group-hover:bg-gold/10 transition-colors">
              <Icon name="ChevronLeft" size={14} />
            </span>
            Клиенты
          </button>
          <Icon name="ChevronRight" size={11} className="text-[hsl(var(--text-muted))] opacity-40 shrink-0" />
          <span className="text-xs text-foreground truncate">{name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
            <span className="text-gold font-bold text-sm">
              {(current.last_name?.[0] || current.first_name?.[0] || '?').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">{name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {statusInfo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: statusInfo.color + '22', color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              )}
              {current.phone && <span className="text-xs text-[hsl(var(--text-muted))]">{current.phone}</span>}
              {/* Прогресс заполнения */}
              {progress && (
                <div className="flex items-center gap-1.5" title={`Профиль заполнен на ${progress.pct}% (${progress.filled}/${progress.total} полей)`}>
                  <div className="w-16 h-1.5 bg-[hsl(220,12%,18%)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress.pct}%`,
                        backgroundColor: progress.pct >= 80 ? '#10b981' : progress.pct >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[hsl(var(--text-muted))]">{progress.pct}%</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Карта Яндекс */}
            {yandexMapUrl && (
              <a href={yandexMapUrl} target="_blank" rel="noopener noreferrer"
                title="Открыть адрес на карте"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-muted))] hover:text-amber-400 hover:border-amber-400/40 transition-all">
                <Icon name="MapPin" size={13} />
              </a>
            )}
            {/* Дублировать */}
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              title="Дублировать клиента"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/40 transition-all disabled:opacity-50"
            >
              {duplicating ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Copy" size={13} />}
            </button>
            {/* Быстрые действия */}
            {current.phone && (
              <div className="flex items-center gap-1">
                <a
                  href={`tel:${current.phone.replace(/\D/g, '')}`}
                  title="Позвонить"
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-400/40 transition-all"
                >
                  <Icon name="Phone" size={13} />
                </a>
                <a
                  href={`https://wa.me/${current.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-muted))] hover:text-[#25D366] hover:border-[#25D366]/40 transition-all"
                >
                  <Icon name="MessageCircle" size={13} />
                </a>
                <a
                  href={`https://t.me/${current.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Telegram"
                  onClick={e => e.stopPropagation()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[hsl(220,12%,16%)] border border-border text-[hsl(var(--text-muted))] hover:text-sky-400 hover:border-sky-400/40 transition-all"
                >
                  <Icon name="Send" size={13} />
                </a>
              </div>
            )}
            {draft && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Save" size={13} />}
                Сохранить
              </button>
            )}
            {saved && !draft && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Icon name="Check" size={13} />Сохранено
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-[hsl(220,16%,7%)] px-6 flex gap-0 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-gold text-gold'
                : 'border-transparent text-[hsl(var(--text-muted))] hover:text-foreground'
            }`}
          >
            <Icon name={t.icon} size={12} />{t.label}
            {t.id === 'photos' && photos.filter(p => p.url).length > 0 && (
              <span className="ml-1 bg-[hsl(220,12%,18%)] text-[hsl(var(--text-muted))] rounded-full px-1.5 py-0.5 text-[10px]">
                {photos.filter(p => p.url).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="px-6 py-6 max-w-3xl mx-auto">
          {tab === 'overview'   && <TabOverview client={current} onChange={onChange} onStatusChange={handleStatusChange} />}
          {tab === 'data'       && <TabData client={current} onChange={onChange} />}
          {tab === 'contract'   && <TabContract client={current} onChange={onChange} />}
          {tab === 'photos'     && <TabPhotos clientId={clientId} photos={photos} onUpload={uploadPhoto} onDelete={deletePhoto} />}
          {tab === 'documents'  && <TabDocuments client={current} hasDraft={!!draft} onSave={handleSave} />}
          {tab === 'history'    && <TabHistory history={history} />}
        </div>
      </div>
    </div>
  );
}