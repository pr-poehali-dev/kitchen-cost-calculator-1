import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useClient } from './useClients';
import { CLIENT_STATUSES, clientFullName } from './types';
import type { Client, ClientStatus } from './types';

const INPUT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';
const SELECT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors';
const TEXTAREA = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors resize-none placeholder:text-[hsl(var(--text-muted))]';

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? '' : ''}>
      <label className="block text-[11px] text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
        <Icon name={icon} size={13} />{title}
      </div>
      {children}
    </div>
  );
}

// ── Вкладка: Сводка ────────────────────────────────────────────
function TabOverview({ client, onChange, onStatusChange }: {
  client: Client;
  onChange: (f: keyof Client, v: string) => void;
  onStatusChange: (s: ClientStatus) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const hasReminder = client.reminder_date && client.reminder_date >= today;

  return (
    <div className="space-y-4">
      {/* Статус */}
      <Section title="Статус сделки" icon="Activity">
        <div className="flex flex-wrap gap-2">
          {CLIENT_STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => onStatusChange(s.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={client.status === s.id
                ? { background: s.color, borderColor: s.color, color: '#fff' }
                : { borderColor: s.color + '44', color: s.color }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Ответственные */}
      <Section title="Ответственные" icon="Users">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Дизайнер">
            <input className={INPUT} value={client.designer} onChange={e => onChange('designer', e.target.value)} placeholder="Имя дизайнера" />
          </Field>
          <Field label="Замерщик">
            <input className={INPUT} value={client.measurer} onChange={e => onChange('measurer', e.target.value)} placeholder="Имя замерщика" />
          </Field>
        </div>
      </Section>

      {/* Напоминание */}
      <Section title="Напоминание" icon="Bell">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата следующего контакта">
              <input type="date" className={INPUT} value={client.reminder_date} onChange={e => onChange('reminder_date', e.target.value)} />
            </Field>
            <div className="flex items-end">
              {hasReminder && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded text-xs text-amber-400 w-full">
                  <Icon name="Bell" size={12} />
                  Напоминание активно
                </div>
              )}
            </div>
          </div>
          <Field label="Заметка к напоминанию">
            <textarea rows={2} className={TEXTAREA} value={client.reminder_note} onChange={e => onChange('reminder_note', e.target.value)} placeholder="О чём напомнить..." />
          </Field>
        </div>
      </Section>

      {/* Комментарий */}
      <Section title="Комментарий" icon="MessageSquare">
        <textarea rows={4} className={TEXTAREA} value={client.comment} onChange={e => onChange('comment', e.target.value)} placeholder="Общие заметки по клиенту..." />
      </Section>
    </div>
  );
}

// ── Вкладка: Данные ────────────────────────────────────────────
function TabData({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string) => void }) {
  return (
    <div className="space-y-4">
      {/* ФИО */}
      <Section title="Личные данные" icon="User">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Фамилия">
              <input className={INPUT} value={client.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Иванов" />
            </Field>
            <Field label="Имя">
              <input className={INPUT} value={client.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="Иван" />
            </Field>
            <Field label="Отчество">
              <input className={INPUT} value={client.middle_name} onChange={e => onChange('middle_name', e.target.value)} placeholder="Иванович" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Телефон (основной)">
              <input className={INPUT} value={client.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+7 (___) ___-__-__" />
            </Field>
            <Field label="Телефон (доп.)">
              <input className={INPUT} value={client.phone2} onChange={e => onChange('phone2', e.target.value)} placeholder="+7 (___) ___-__-__" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Мессенджер">
              <select className={SELECT} value={client.messenger} onChange={e => onChange('messenger', e.target.value)}>
                {['WhatsApp', 'Telegram', 'Viber', 'Звонок'].map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Email">
              <input className={INPUT} value={client.email} onChange={e => onChange('email', e.target.value)} placeholder="email@example.com" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Паспорт */}
      <Section title="Паспортные данные" icon="CreditCard">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Серия">
              <input className={INPUT} value={client.passport_series} onChange={e => onChange('passport_series', e.target.value)} placeholder="1234" maxLength={4} />
            </Field>
            <Field label="Номер">
              <input className={INPUT} value={client.passport_number} onChange={e => onChange('passport_number', e.target.value)} placeholder="567890" maxLength={6} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата выдачи">
              <input type="date" className={INPUT} value={client.passport_issued_date} onChange={e => onChange('passport_issued_date', e.target.value)} />
            </Field>
            <Field label="Код подразделения">
              <input className={INPUT} value={client.passport_dept_code} onChange={e => onChange('passport_dept_code', e.target.value)} placeholder="123-456" maxLength={7} />
            </Field>
          </div>
          <Field label="Кем выдан">
            <textarea rows={2} className={TEXTAREA} value={client.passport_issued_by} onChange={e => onChange('passport_issued_by', e.target.value)} placeholder="ОУФМС России..." />
          </Field>
        </div>
      </Section>

      {/* Адрес регистрации */}
      <Section title="Адрес регистрации (по паспорту)" icon="MapPin">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Город / нас. пункт">
              <input className={INPUT} value={client.reg_city} onChange={e => onChange('reg_city', e.target.value)} placeholder="Москва" />
            </Field>
            <Field label="Улица">
              <input className={INPUT} value={client.reg_street} onChange={e => onChange('reg_street', e.target.value)} placeholder="ул. Ленина" />
            </Field>
            <Field label="Дом / корп.">
              <input className={INPUT} value={client.reg_house} onChange={e => onChange('reg_house', e.target.value)} placeholder="12А" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Квартира">
              <input className={INPUT} value={client.reg_apt} onChange={e => onChange('reg_apt', e.target.value)} placeholder="45" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Адрес доставки */}
      <Section title="Адрес доставки" icon="Truck">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Город">
              <input className={INPUT} value={client.delivery_city} onChange={e => onChange('delivery_city', e.target.value)} placeholder="Москва" />
            </Field>
            <Field label="Улица">
              <input className={INPUT} value={client.delivery_street} onChange={e => onChange('delivery_street', e.target.value)} placeholder="ул. Ленина" />
            </Field>
            <Field label="Дом / корп.">
              <input className={INPUT} value={client.delivery_house} onChange={e => onChange('delivery_house', e.target.value)} placeholder="12А" />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Квартира">
              <input className={INPUT} value={client.delivery_apt} onChange={e => onChange('delivery_apt', e.target.value)} placeholder="45" />
            </Field>
            <Field label="Подъезд">
              <input className={INPUT} value={client.delivery_entrance} onChange={e => onChange('delivery_entrance', e.target.value)} placeholder="2" />
            </Field>
            <Field label="Этаж">
              <input className={INPUT} value={client.delivery_floor} onChange={e => onChange('delivery_floor', e.target.value)} placeholder="5" />
            </Field>
            <Field label="Лифт">
              <select className={SELECT} value={client.delivery_elevator} onChange={e => onChange('delivery_elevator', e.target.value)}>
                <option value="нет">Нет</option>
                <option value="есть">Есть</option>
                <option value="грузовой">Грузовой</option>
              </select>
            </Field>
          </div>
          <Field label="Доп. инструкции (домофон, шлагбаум...)">
            <textarea rows={2} className={TEXTAREA} value={client.delivery_note} onChange={e => onChange('delivery_note', e.target.value)} placeholder="Домофон 45, въезд со двора..." />
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ── Вкладка: Договор ───────────────────────────────────────────
function TabContract({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string | number | object) => void }) {
  const addProduct = () => {
    const products = [...(client.products || []), { id: Date.now().toString(), name: '', qty: 1 }];
    onChange('products', products);
  };
  const removeProduct = (id: string) => onChange('products', client.products.filter(p => p.id !== id));
  const updateProduct = (id: string, field: 'name' | 'qty', value: string | number) => {
    onChange('products', client.products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const showBalance = client.payment_type === '50% предоплата' || client.payment_type === 'Рассрочка';

  return (
    <div className="space-y-4">
      {/* Договор */}
      <Section title="Договор" icon="FileText">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Номер договора">
            <input className={INPUT} value={client.contract_number} onChange={e => onChange('contract_number', e.target.value)} placeholder="№ договора" />
          </Field>
          <Field label="Дата заключения">
            <input type="date" className={INPUT} value={client.contract_date} onChange={e => onChange('contract_date', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Изделия */}
      <Section title="Изделия" icon="Package">
        <div className="space-y-2">
          {client.products?.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input className={INPUT + ' flex-1'} value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)} placeholder="Наименование изделия" />
              <input type="number" min={1} className={INPUT + ' w-20 text-center'} value={p.qty} onChange={e => updateProduct(p.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))} />
              <button onClick={() => removeProduct(p.id)} className="p-2 text-[hsl(var(--text-muted))] hover:text-red-400 transition-colors">
                <Icon name="Trash2" size={13} />
              </button>
            </div>
          ))}
          <button onClick={addProduct} className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center">
            <Icon name="Plus" size={13} /> Добавить изделие
          </button>
        </div>
      </Section>

      {/* Оплата */}
      <Section title="Оплата" icon="CreditCard">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Сумма договора (₽)">
              <input type="number" min={0} className={INPUT} value={client.total_amount || ''} onChange={e => onChange('total_amount', parseFloat(e.target.value) || 0)} placeholder="0" />
            </Field>
            <Field label="Схема оплаты">
              <select className={SELECT} value={client.payment_type} onChange={e => onChange('payment_type', e.target.value)}>
                {['100% предоплата', '50% предоплата', 'Рассрочка', 'Своя схема'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          {showBalance && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Внесено (₽)">
                <input type="number" min={0} className={INPUT} value={client.prepaid_amount || ''} onChange={e => onChange('prepaid_amount', parseFloat(e.target.value) || 0)} placeholder="0" />
              </Field>
              <Field label="Остаток (₽)">
                <input type="number" readOnly className={INPUT + ' opacity-60'} value={Math.max(0, client.total_amount - client.prepaid_amount)} />
              </Field>
            </div>
          )}
          {client.payment_type === 'Своя схема' && (
            <Field label="Описание схемы">
              <textarea rows={2} className={TEXTAREA} value={client.custom_payment_scheme} onChange={e => onChange('custom_payment_scheme', e.target.value)} placeholder="Опишите схему оплаты..." />
            </Field>
          )}
        </div>
      </Section>

      {/* Сроки */}
      <Section title="Сроки" icon="Calendar">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Дата доставки">
            <input type="date" className={INPUT} value={client.delivery_date} onChange={e => onChange('delivery_date', e.target.value)} />
          </Field>
          <Field label="Срок изготовления (дни)">
            <input type="number" min={0} className={INPUT} value={client.production_days || ''} onChange={e => onChange('production_days', parseInt(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Срок монтажа (дни)">
            <input type="number" min={0} className={INPUT} value={client.assembly_days || ''} onChange={e => onChange('assembly_days', parseInt(e.target.value) || 0)} placeholder="0" />
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ── Вкладка: Фото ──────────────────────────────────────────────
function TabPhotos({ clientId, photos, onUpload, onDelete }: {
  clientId: string;
  photos: import('./types').ClientPhoto[];
  onUpload: (file: File, category: 'measure' | 'render' | 'done') => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<'measure' | 'render' | 'done'>('measure');
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const CATS = [
    { id: 'measure' as const, label: 'Замер', icon: 'Ruler' },
    { id: 'render' as const, label: 'Рендер / проект', icon: 'Image' },
    { id: 'done' as const, label: 'Готовая работа', icon: 'CheckCircle' },
  ];

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await onUpload(file, category);
    }
    setUploading(false);
  };

  const byCategory = (cat: string) => photos.filter(p => p.category === cat && p.url);

  return (
    <div className="space-y-4">
      {/* Загрузка */}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
          <Icon name="Upload" size={13} />Загрузить фото
        </div>
        <div className="flex items-center gap-3 mb-3">
          {CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${category === c.id ? 'bg-gold/20 border-gold/40 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            >
              <Icon name={c.icon} size={11} />{c.label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-gold/40 ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--text-muted))]">
              <Icon name="Loader2" size={18} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <>
              <Icon name="ImagePlus" size={24} className="text-[hsl(var(--text-muted))] mx-auto mb-2" />
              <p className="text-sm text-[hsl(var(--text-muted))]">Перетащите фото или <span className="text-gold">нажмите для выбора</span></p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">JPG, PNG, WEBP — несколько файлов сразу</p>
            </>
          )}
        </div>
      </div>

      {/* Галерея по категориям */}
      {CATS.map(cat => {
        const catPhotos = byCategory(cat.id);
        if (catPhotos.length === 0) return null;
        return (
          <div key={cat.id} className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
              <Icon name={cat.icon} size={13} />{cat.label}
              <span className="ml-auto bg-[hsl(220,12%,18%)] rounded-full px-1.5 py-0.5">{catPhotos.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {catPhotos.map(photo => (
                <div key={photo.id} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setPreview(photo.url)}
                  />
                  <button
                    onClick={() => onDelete(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <Icon name="X" size={11} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {photos.filter(p => p.url).length === 0 && (
        <div className="text-center text-[hsl(var(--text-muted))] text-sm py-8">
          Фотографий пока нет
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Вкладка: История ───────────────────────────────────────────
function TabHistory({ history }: { history: import('./types').ClientHistoryItem[] }) {
  const ACTION_ICONS: Record<string, string> = {
    created: 'UserPlus',
    updated: 'Edit3',
    status_changed: 'ArrowRight',
    photo_added: 'Image',
    comment_added: 'MessageSquare',
  };

  if (history.length === 0) {
    return <div className="text-center text-[hsl(var(--text-muted))] text-sm py-12">История действий пуста</div>;
  }

  return (
    <div className="space-y-1">
      {history.map(item => (
        <div key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(220,12%,13%)] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[hsl(220,12%,16%)] flex items-center justify-center shrink-0 mt-0.5">
            <Icon name={ACTION_ICONS[item.action] || 'Clock'} size={12} className="text-[hsl(var(--text-muted))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground">{item.description}</div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[hsl(var(--text-muted))]">
              <span>{item.user_name || 'Система'}</span>
              <span>·</span>
              <span>{new Date(item.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Главный компонент карточки ─────────────────────────────────
type Tab = 'overview' | 'data' | 'contract' | 'photos' | 'history';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Сводка',   icon: 'LayoutDashboard' },
  { id: 'data',      label: 'Данные',   icon: 'User' },
  { id: 'contract',  label: 'Договор',  icon: 'FileText' },
  { id: 'photos',    label: 'Фото',     icon: 'Image' },
  { id: 'history',   label: 'История',  icon: 'Clock' },
];

export default function ClientCard({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const { client, photos, history, loading, saving, save, changeStatus, uploadPhoto, deletePhoto } = useClient(clientId);
  const [tab, setTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState<Client | null>(null);
  const [saved, setSaved] = useState(false);

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

  if (loading || !current) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-[hsl(var(--text-muted))]">
        <Icon name="Loader2" size={18} className="animate-spin" />
        <span className="text-sm">Загрузка...</span>
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
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors">
            <Icon name="ChevronLeft" size={14} />
            Клиенты
          </button>
          <span className="text-[hsl(var(--text-muted))] text-xs">/</span>
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
            <div className="flex items-center gap-2 mt-0.5">
              {statusInfo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: statusInfo.color + '22', color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              )}
              {current.phone && <span className="text-xs text-[hsl(var(--text-muted))]">{current.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
          {tab === 'overview'  && <TabOverview client={current} onChange={onChange} onStatusChange={handleStatusChange} />}
          {tab === 'data'      && <TabData client={current} onChange={onChange} />}
          {tab === 'contract'  && <TabContract client={current} onChange={onChange} />}
          {tab === 'photos'    && <TabPhotos clientId={clientId} photos={photos} onUpload={uploadPhoto} onDelete={deletePhoto} />}
          {tab === 'history'   && <TabHistory history={history} />}
        </div>
      </div>
    </div>
  );
}
