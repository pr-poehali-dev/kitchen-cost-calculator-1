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
  const stampRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

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

  const uploadAsset = async (file: File, assetType: 'stamp' | 'signature') => {
    const token = localStorage.getItem('kuhni_token') || '';
    const setUploading = assetType === 'stamp' ? setUploadingStamp : setUploadingSig;
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
      } else {
        store.updateSettings({ company: { ...company, signatureUrl: data.url, useSignature: true } });
      }
      toast.success(assetType === 'stamp' ? 'Печать загружена' : 'Подпись загружена');
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

      {/* Доверенность */}
      <Section title="Доверенность" icon="ScrollText">
        <div className="space-y-3">
          <p className="text-xs text-[hsl(var(--text-muted))]">
            Номер и дата автоматически подставляются во все договоры в строку «действующего на основании доверенности №___ от ___».
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Номер доверенности">
              <input value={company.poaNumber || ''} onChange={e => upd('poaNumber', e.target.value)} placeholder="12/2024" className={inp} />
            </Field>
            <Field label="Дата доверенности">
              <input type="date" value={company.poaDate || ''} onChange={e => upd('poaDate', e.target.value)} className={inp} />
            </Field>
          </div>
          {(company.poaNumber || company.poaDate) && (
            <div className="p-3 bg-[hsl(220,12%,14%)] rounded text-xs text-[hsl(var(--text-muted))]">
              В договоре: <span className="text-foreground">«действующего на основании доверенности № {company.poaNumber || '___'} от {company.poaDate ? new Date(company.poaDate).toLocaleDateString('ru') : '___'}»</span>
            </div>
          )}
        </div>
      </Section>

      {/* Печать и подпись */}
      <Section title="Печать и подпись" icon="Stamp">
        <div className="space-y-5">
          <p className="text-xs text-[hsl(var(--text-muted))]">
            Загрузите изображения печати и подписи директора — они будут вставляться в блок реквизитов документов. Рекомендуется PNG с прозрачным фоном.
          </p>

          {/* Печать */}
          <div className="flex items-start gap-4 p-4 bg-[hsl(220,12%,14%)] rounded-lg border border-border">
            <div className="w-20 h-20 rounded border border-dashed border-border bg-[hsl(220,12%,12%)] flex items-center justify-center shrink-0 overflow-hidden">
              {company.stampUrl
                ? <img src={company.stampUrl} alt="Печать" className="w-full h-full object-contain" />
                : <Icon name="Stamp" size={24} className="text-[hsl(var(--text-muted))]" />
              }
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Печать организации</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[hsl(var(--text-muted))]">{company.useStamp ? 'Включена' : 'Выключена'}</span>
                  <button
                    type="button"
                    onClick={() => upd('useStamp', !company.useStamp)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${company.useStamp ? 'bg-gold' : 'bg-[hsl(220,12%,26%)]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${company.useStamp ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
              <div className="flex gap-2">
                <input ref={stampRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'stamp'); e.target.value = ''; }} />
                <button
                  type="button"
                  onClick={() => stampRef.current?.click()}
                  disabled={uploadingStamp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                >
                  {uploadingStamp ? <Icon name="Loader" size={12} className="animate-spin" /> : <Icon name="Upload" size={12} />}
                  {uploadingStamp ? 'Загружаю...' : 'Загрузить'}
                </button>
                {company.stampUrl && (
                  <button
                    type="button"
                    onClick={() => store.updateSettings({ company: { ...company, stampUrl: '', useStamp: false } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-destructive hover:text-destructive transition-colors"
                  >
                    <Icon name="Trash2" size={12} /> Удалить
                  </button>
                )}
              </div>
              {!company.stampUrl && <p className="text-xs text-[hsl(var(--text-muted))]">PNG с прозрачным фоном, до 5 МБ</p>}
            </div>
          </div>

          {/* Подпись */}
          <div className="flex items-start gap-4 p-4 bg-[hsl(220,12%,14%)] rounded-lg border border-border">
            <div className="w-20 h-20 rounded border border-dashed border-border bg-[hsl(220,12%,12%)] flex items-center justify-center shrink-0 overflow-hidden">
              {company.signatureUrl
                ? <img src={company.signatureUrl} alt="Подпись" className="w-full h-full object-contain" />
                : <Icon name="PenLine" size={24} className="text-[hsl(var(--text-muted))]" />
              }
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Подпись директора</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[hsl(var(--text-muted))]">{company.useSignature ? 'Включена' : 'Выключена'}</span>
                  <button
                    type="button"
                    onClick={() => upd('useSignature', !company.useSignature)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${company.useSignature ? 'bg-gold' : 'bg-[hsl(220,12%,26%)]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${company.useSignature ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
              <div className="flex gap-2">
                <input ref={sigRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'signature'); e.target.value = ''; }} />
                <button
                  type="button"
                  onClick={() => sigRef.current?.click()}
                  disabled={uploadingSig}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
                >
                  {uploadingSig ? <Icon name="Loader" size={12} className="animate-spin" /> : <Icon name="Upload" size={12} />}
                  {uploadingSig ? 'Загружаю...' : 'Загрузить'}
                </button>
                {company.signatureUrl && (
                  <button
                    type="button"
                    onClick={() => store.updateSettings({ company: { ...company, signatureUrl: '', useSignature: false } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:border-destructive hover:text-destructive transition-colors"
                  >
                    <Icon name="Trash2" size={12} /> Удалить
                  </button>
                )}
              </div>
              {!company.signatureUrl && <p className="text-xs text-[hsl(var(--text-muted))]">PNG с прозрачным фоном, до 5 МБ</p>}
            </div>
          </div>
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