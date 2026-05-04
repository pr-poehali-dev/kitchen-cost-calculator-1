import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { CompanyInfo } from '@/store/types';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { API_URLS } from '@/config/api';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] rounded border border-border p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider mb-4 font-medium text-[hsl(var(--text-muted))]">
        <Icon name={icon} size={13} />{title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function SettingsCompanySection() {
  const store = useStore();
  const [newUnit, setNewUnit] = useState('');
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const stampRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const company: CompanyInfo = store.settings.company || { name: '' };
  const upd = (field: keyof CompanyInfo, value: string | boolean) =>
    store.updateSettings({ company: { ...company, [field]: value } });
  const inp = 'w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors placeholder:text-[hsl(var(--text-muted))]';

  const handleAddUnit = () => {
    if (!newUnit.trim()) return;
    store.addUnit(newUnit.trim());
    setNewUnit('');
  };

  const bankFilled = [company.bank, company.bik, company.rs, company.ks].filter(Boolean).length;

  const uploadAsset = async (file: File, assetType: 'stamp' | 'signature' | 'logo') => {
    const token = localStorage.getItem('kuhni_token') || '';
    const setUploading = assetType === 'stamp' ? setUploadingStamp : assetType === 'logo' ? setUploadingLogo : setUploadingSig;
    setUploading(true);
    try {
      const reader = new FileReader();
      const b64: string = await new Promise((res, rej) => {
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const resp = await fetch(`${API_URLS.clients}/?action=upload_asset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: b64, asset_type: assetType, name: file.name, content_type: file.type }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Ошибка загрузки');
      if (assetType === 'stamp') {
        store.updateSettings({ company: { ...company, stampUrl: data.url, useStamp: true } });
        toast.success('Печать загружена');
      } else if (assetType === 'signature') {
        store.updateSettings({ company: { ...company, signatureUrl: data.url, useSignature: true } });
        toast.success('Подпись загружена');
      } else {
        store.updateSettings({ company: { ...company, logoUrl: data.url } });
        toast.success('Логотип загружен');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* О компании */}
      <Section title="О компании" icon="Building2">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Название компании">
              <input value={company.name || ''} onChange={e => upd('name', e.target.value)} placeholder="ООО «Моя Кухня»" className={inp} />
            </Field>
            <Field label="Город">
              <input value={company.city || ''} onChange={e => upd('city', e.target.value)} placeholder="Саратов" className={inp} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="ИНН">
              <input value={company.inn || ''} onChange={e => upd('inn', e.target.value)} placeholder="7712345678" className={inp} />
            </Field>
            <Field label="ОГРН / ОГРНИП">
              <input value={company.ogrn || ''} onChange={e => upd('ogrn', e.target.value)} placeholder="1196451012251" className={inp} />
            </Field>
            <Field label="КПП">
              <input value={company.kpp || ''} onChange={e => upd('kpp', e.target.value)} placeholder="770101001" className={inp} />
            </Field>
          </div>
          <Field label="Юридический адрес">
            <input value={company.address || ''} onChange={e => upd('address', e.target.value)} placeholder="410018, г. Саратов, ул. Пушкина, д. 1" className={inp} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Директор / ИП (ФИО)">
              <input value={company.director || ''} onChange={e => upd('director', e.target.value)} placeholder="Иванов Иван Иванович" className={inp} />
            </Field>
            <Field label="Должность">
              <input value={company.directorPosition || ''} onChange={e => upd('directorPosition', e.target.value)} placeholder="Генеральный директор" className={inp} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Телефон">
              <input value={company.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+7 (000) 000-00-00" className={inp} />
            </Field>
            <Field label="Email">
              <input value={company.email || ''} onChange={e => upd('email', e.target.value)} placeholder="info@company.ru" className={inp} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Сайт">
              <input value={company.website || ''} onChange={e => upd('website', e.target.value)} placeholder="https://example.ru" className={inp} />
            </Field>
            <Field label="Префикс нумерации договоров">
              <div className="flex items-center gap-2">
                <input value={company.contractPrefix || ''} onChange={e => upd('contractPrefix', e.target.value)} placeholder="К-" className="w-24 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
                <span className="text-xs text-[hsl(var(--text-muted))]">
                  Пример: <span className="font-mono text-foreground">{(company.contractPrefix || 'К-')}{new Date().getFullYear()}-001</span>
                </span>
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Банковские реквизиты */}
      <Section title="Банковские реквизиты" icon="Landmark">
        <div className="space-y-3">
          {bankFilled === 0 && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-400/8 border border-amber-400/25 rounded text-xs text-amber-400/80 mb-3">
              <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
              Реквизиты не заполнены — в договорах будут пустые поля. Заполните для корректной генерации документов.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Банк">
              <input value={company.bank || ''} onChange={e => upd('bank', e.target.value)} placeholder="ПАО Сбербанк" className={inp} />
            </Field>
            <Field label="БИК">
              <input value={company.bik || ''} onChange={e => upd('bik', e.target.value)} placeholder="044525225" className={inp} maxLength={9} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Расчётный счёт (р/с)">
              <input value={company.rs || ''} onChange={e => upd('rs', e.target.value)} placeholder="40702810000000000000" className={inp} maxLength={20} />
            </Field>
            <Field label="Корреспондентский счёт (к/с)">
              <input value={company.ks || ''} onChange={e => upd('ks', e.target.value)} placeholder="30101810400000000225" className={inp} maxLength={20} />
            </Field>
          </div>
          {bankFilled > 0 && (
            <div className="mt-2 p-3 bg-[hsl(220,12%,14%)] rounded text-xs text-[hsl(var(--text-muted))] leading-relaxed font-mono">
              {company.bank && <div>Банк: {company.bank}</div>}
              {company.bik && <div>БИК: {company.bik}</div>}
              {company.rs && <div>р/с: {company.rs}</div>}
              {company.ks && <div>к/с: {company.ks}</div>}
            </div>
          )}
        </div>
      </Section>

      {/* Логотип, печать и подпись — единый блок */}
      <Section title="Логотип и документы" icon="ImageIcon">
        <div className="space-y-4">
          <p className="text-xs text-[hsl(var(--text-muted))]">
            Логотип отображается в шапке КП и договоров. Печать и подпись вставляются в блок реквизитов. Рекомендуется PNG с прозрачным фоном.
          </p>

          {/* Логотип */}
          <div className="rounded-lg border border-border bg-[hsl(220,12%,14%)]">
            <div className="px-3 py-2.5 border-b border-[hsl(220,12%,18%)]">
              <span className="text-sm font-medium">Логотип компании</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-16 h-10 rounded border border-dashed border-border bg-[hsl(220,12%,12%)] flex items-center justify-center shrink-0 overflow-hidden">
                {company.logoUrl
                  ? <img src={company.logoUrl} alt="Логотип" className="w-full h-full object-contain p-0.5" />
                  : <Icon name="ImageIcon" size={16} className="text-[hsl(var(--text-muted))]" />
                }
              </div>
              <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logo'); e.target.value = ''; }} />
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-colors disabled:opacity-50">
                  {uploadingLogo ? <Icon name="Loader" size={11} className="animate-spin" /> : <Icon name="Upload" size={11} />}
                  {uploadingLogo ? 'Загружаю...' : 'Загрузить'}
                </button>
                {company.logoUrl
                  ? <button type="button" onClick={() => store.updateSettings({ company: { ...company, logoUrl: '' } })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-destructive hover:text-destructive transition-colors">
                      <Icon name="Trash2" size={11} /> Удалить
                    </button>
                  : <span className="text-xs text-[hsl(var(--text-muted))]">PNG, JPG, SVG — до 5 МБ</span>
                }
              </div>
            </div>
          </div>

          {/* Печать и подпись */}
          {([
            {
              label: 'Печать организации',
              icon: 'Stamp' as const,
              url: company.stampUrl,
              enabled: !!company.useStamp,
              uploading: uploadingStamp,
              ref: stampRef,
              onToggle: () => upd('useStamp', !company.useStamp),
              onUpload: (f: File) => uploadAsset(f, 'stamp'),
              onDelete: () => store.updateSettings({ company: { ...company, stampUrl: '', useStamp: false } }),
            },
            {
              label: 'Подпись директора',
              icon: 'PenLine' as const,
              url: company.signatureUrl,
              enabled: !!company.useSignature,
              uploading: uploadingSig,
              ref: sigRef,
              onToggle: () => upd('useSignature', !company.useSignature),
              onUpload: (f: File) => uploadAsset(f, 'signature'),
              onDelete: () => store.updateSettings({ company: { ...company, signatureUrl: '', useSignature: false } }),
            },
          ] as const).map(item => (
            <div key={item.label} className="rounded-lg border border-border bg-[hsl(220,12%,14%)]">
              {/* Шапка: название | статус + тоггл */}
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[hsl(220,12%,18%)]">
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">{item.enabled ? 'Включена' : 'Выключена'}</span>
                {/* Тоггл без absolute — через padding */}
                <button
                  type="button"
                  onClick={item.onToggle}
                  className={`shrink-0 w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${item.enabled ? 'bg-gold justify-end' : 'bg-[hsl(220,12%,26%)] justify-start'}`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow block" />
                </button>
              </div>
              {/* Тело: превью + кнопки */}
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-10 h-10 rounded border border-dashed border-border bg-[hsl(220,12%,12%)] flex items-center justify-center shrink-0 overflow-hidden">
                  {item.url
                    ? <img src={item.url} alt={item.label} className="w-full h-full object-contain" />
                    : <Icon name={item.icon} size={16} className="text-[hsl(var(--text-muted))]" />
                  }
                </div>
                <input ref={item.ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) item.onUpload(f); e.target.value = ''; }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => item.ref.current?.click()}
                    disabled={item.uploading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                  >
                    {item.uploading ? <Icon name="Loader" size={11} className="animate-spin" /> : <Icon name="Upload" size={11} />}
                    {item.uploading ? 'Загружаю...' : 'Загрузить'}
                  </button>
                  {item.url ? (
                    <button
                      type="button"
                      onClick={item.onDelete}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-destructive hover:text-destructive transition-colors"
                    >
                      <Icon name="Trash2" size={11} /> Удалить
                    </button>
                  ) : (
                    <span className="text-xs text-[hsl(var(--text-muted))]">PNG с прозрачным фоном, до 5 МБ</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Валюта */}
      <Section title="Валюта" icon="BadgeRussianRuble">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1 block">Символ валюты</label>
            <input value={store.settings.currency} onChange={e => store.updateSettings({ currency: e.target.value })}
              className="w-full bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" placeholder="₽" maxLength={3} />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-[hsl(220,12%,14%)] rounded px-3 py-2 text-sm text-[hsl(var(--text-muted))]">
              Пример: <span className="font-mono text-foreground">152 500 {store.settings.currency}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Единицы измерения */}
      <Section title="Единицы измерения" icon="Ruler">
        <div className="flex flex-wrap gap-2 mb-3">
          {store.settings.units.map(u => (
            <div key={u} className="flex items-center gap-1 bg-[hsl(220,12%,16%)] border border-border rounded pl-3 pr-1.5 py-1">
              <span className="text-sm text-foreground">{u}</span>
              <button onClick={() => store.deleteUnit(u)} className="text-[hsl(var(--text-muted))] hover:text-destructive transition-colors ml-1"><Icon name="X" size={11} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddUnit()} placeholder="Новая единица (напр. пог.м)"
            className="flex-1 bg-[hsl(220,12%,16%)] border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-gold transition-colors" />
          <button onClick={handleAddUnit} className="flex items-center gap-1.5 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90">
            <Icon name="Plus" size={14} /> Добавить
          </button>
        </div>
      </Section>
    </>
  );
}