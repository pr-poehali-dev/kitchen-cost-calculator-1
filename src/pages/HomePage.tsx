import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import Icon from '@/components/ui/icon';

interface ProductItem {
  id: string;
  name: string;
  qty: number;
}

interface ClientCard {
  contractNumber: string;
  contractDate: string;
  clientInfo: string;
  phone: string;
  messenger: 'WhatsApp' | 'Telegram' | 'Viber' | 'Звонок';
  deliveryAddress: string;
  products: ProductItem[];
  totalAmount: number;
  paymentType: '100% предоплата' | '50% предоплата' | 'Рассрочка' | 'Своя схема';
  customPaymentScheme: string;
  partialPaid: number;
  assemblyAmount: number;
  extraServicesAmount: number;
  extraServicesPaymentType: 'Предоплата' | 'На сборке' | 'Частично';
  extraServicesPaid: number;
  deliveryDate: string;
  manufacturingPeriod: string;
  assemblyPeriod: string;
  designedBy: string;
  measuredBy: string;
}

const defaultCard = (): ClientCard => ({
  contractNumber: '',
  contractDate: '',
  clientInfo: '',
  phone: '',
  messenger: 'WhatsApp',
  deliveryAddress: '',
  products: [],
  totalAmount: 0,
  paymentType: '100% предоплата',
  customPaymentScheme: '',
  partialPaid: 0,
  assemblyAmount: 0,
  extraServicesAmount: 0,
  extraServicesPaymentType: 'Предоплата',
  extraServicesPaid: 0,
  deliveryDate: '',
  manufacturingPeriod: '',
  assemblyPeriod: '',
  designedBy: '',
  measuredBy: '',
});

const LABEL = 'text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider mb-1';
const INPUT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors';
const TEXTAREA = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors resize-none';
const SELECT = 'w-full bg-[hsl(220,12%,14%)] border border-border rounded px-3 py-2 text-sm outline-none focus:border-gold transition-colors';

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
      <div className="text-xs uppercase tracking-wider text-[hsl(var(--text-muted))] mb-4 flex items-center gap-2">
        <Icon name={icon} size={13} />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={LABEL}>{label}</div>
      {children}
    </div>
  );
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function HomePage() {
  const store = useStore();
  const project = store.getActiveProject();
  const projectId = project?.id ?? null;

  const [card, setCard] = useState<ClientCard>(() => {
    if (!projectId) return defaultCard();
    try {
      const saved = localStorage.getItem(`client-card-${projectId}`);
      if (saved) return JSON.parse(saved) as ClientCard;
    } catch (_e) {
      return defaultCard();
    }
    return defaultCard();
  });

  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`client-card-${projectId}`);
      setCard(saved ? (JSON.parse(saved) as ClientCard) : defaultCard());
    } catch (_e) {
      setCard(defaultCard());
    }
  }, [projectId]);

  const save = useCallback(
    (updated: ClientCard) => {
      if (!projectId) return;
      localStorage.setItem(`client-card-${projectId}`, JSON.stringify(updated));
    },
    [projectId],
  );

  const set = <K extends keyof ClientCard>(key: K, value: ClientCard[K]) => {
    setCard(prev => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  };

  const addProduct = () => {
    const updated: ClientCard = {
      ...card,
      products: [...card.products, { id: genId(), name: '', qty: 1 }],
    };
    setCard(updated);
    save(updated);
  };

  const removeProduct = (id: string) => {
    const updated: ClientCard = { ...card, products: card.products.filter(p => p.id !== id) };
    setCard(updated);
    save(updated);
  };

  const updateProduct = (id: string, field: 'name' | 'qty', value: string | number) => {
    const updated: ClientCard = {
      ...card,
      products: card.products.map(p => (p.id === id ? { ...p, [field]: value } : p)),
    };
    setCard(updated);
    save(updated);
  };

  const balanceDue =
    card.paymentType === '50% предоплата'
      ? Math.max(0, card.totalAmount - card.totalAmount * 0.5)
      : card.paymentType === 'Рассрочка'
      ? Math.max(0, card.totalAmount - card.partialPaid)
      : 0;

  const extraBalance = Math.max(0, card.extraServicesAmount - card.extraServicesPaid);

  const showBalance = card.paymentType === '50% предоплата' || card.paymentType === 'Рассрочка';
  const showCustomScheme = card.paymentType === 'Своя схема';
  const showExtraPartial = card.extraServicesPaymentType === 'Частично';

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
        <p className="text-[hsl(var(--text-muted))] text-sm">Нет активного проекта</p>
        <button
          onClick={() => store.createProject()}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded font-medium text-sm hover:opacity-90"
        >
          <Icon name="Plus" size={14} /> Создать проект
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground">Главная</h1>
          <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5 truncate">Карточка клиента для проекта</p>
        </div>
        <button
          onClick={() => store.createProject()}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0"
        >
          <Icon name="Plus" size={14} /> Новый проект
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
          <Section icon="FileText" title="Договор">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Номер договора">
                <input
                  className={INPUT}
                  value={card.contractNumber}
                  onChange={e => set('contractNumber', e.target.value)}
                  placeholder="№ договора"
                />
              </Field>
              <Field label="Дата заключения договора">
                <input
                  type="date"
                  className={INPUT}
                  value={card.contractDate}
                  onChange={e => set('contractDate', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section icon="User" title="Клиент">
            <div className="space-y-4">
              <Field label="ФИО / паспортные данные">
                <textarea
                  rows={2}
                  className={TEXTAREA}
                  value={card.clientInfo}
                  onChange={e => set('clientInfo', e.target.value)}
                  placeholder="Фамилия Имя Отчество, серия/номер паспорта..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Телефон">
                  <input
                    className={INPUT}
                    value={card.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                  />
                </Field>
                <Field label="Мессенджер для связи">
                  <select
                    className={SELECT}
                    value={card.messenger}
                    onChange={e => set('messenger', e.target.value as ClientCard['messenger'])}
                  >
                    <option>WhatsApp</option>
                    <option>Telegram</option>
                    <option>Viber</option>
                    <option>Звонок</option>
                  </select>
                </Field>
              </div>
              <Field label="Адрес доставки — подъезд, этаж, лифт и т.д.">
                <textarea
                  rows={3}
                  className={TEXTAREA}
                  value={card.deliveryAddress}
                  onChange={e => set('deliveryAddress', e.target.value)}
                  placeholder="Город, улица, дом, подъезд, этаж, лифт (да/нет)..."
                />
              </Field>
            </div>
          </Section>

          <Section icon="Package" title="Изделия">
            <div className="space-y-3">
              {card.products.length > 0 && (
                <div className="space-y-2">
                  {card.products.map(product => (
                    <div key={product.id} className="flex items-center gap-3">
                      <input
                        className={INPUT + ' flex-1'}
                        value={product.name}
                        onChange={e => updateProduct(product.id, 'name', e.target.value)}
                        placeholder="Наименование изделия"
                      />
                      <input
                        type="number"
                        min={1}
                        className={INPUT + ' w-20 text-center'}
                        value={product.qty}
                        onChange={e => updateProduct(product.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 text-[hsl(var(--text-muted))] hover:text-red-400 transition-colors shrink-0"
                        title="Удалить изделие"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {card.products.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))] px-0.5">
                  <span className="flex-1 pl-1">Наименование</span>
                  <span className="w-20 text-center">Кол-во</span>
                  <span className="w-8" />
                </div>
              )}
              <button
                onClick={addProduct}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(var(--surface-3))] rounded text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold transition-all w-full justify-center"
              >
                <Icon name="Plus" size={14} /> Добавить изделие
              </button>
            </div>
          </Section>

          <Section icon="CreditCard" title="Оплата">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Сумма покупки">
                  <input
                    type="number"
                    min={0}
                    className={INPUT}
                    value={card.totalAmount || ''}
                    onChange={e => set('totalAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Тип оплаты">
                  <select
                    className={SELECT}
                    value={card.paymentType}
                    onChange={e => set('paymentType', e.target.value as ClientCard['paymentType'])}
                  >
                    <option>100% предоплата</option>
                    <option>50% предоплата</option>
                    <option>Рассрочка</option>
                    <option>Своя схема</option>
                  </select>
                </Field>
              </div>

              {showCustomScheme && (
                <Field label="Схема оплаты">
                  <textarea
                    rows={2}
                    className={TEXTAREA}
                    value={card.customPaymentScheme}
                    onChange={e => set('customPaymentScheme', e.target.value)}
                    placeholder="Опишите схему оплаты..."
                  />
                </Field>
              )}

              {showBalance && (
                <div className="grid grid-cols-2 gap-4">
                  {card.paymentType === 'Рассрочка' && (
                    <Field label="Оплачено">
                      <input
                        type="number"
                        min={0}
                        className={INPUT}
                        value={card.partialPaid || ''}
                        onChange={e => set('partialPaid', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </Field>
                  )}
                  <Field label="Остаток к оплате">
                    <input
                      readOnly
                      className={INPUT + ' opacity-60 cursor-default'}
                      value={balanceDue.toLocaleString('ru-RU')}
                    />
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Сумма сборки">
                  <input
                    type="number"
                    min={0}
                    className={INPUT}
                    value={card.assemblyAmount || ''}
                    onChange={e => set('assemblyAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Сумма дополнительных услуг">
                  <input
                    type="number"
                    min={0}
                    className={INPUT}
                    value={card.extraServicesAmount || ''}
                    onChange={e => set('extraServicesAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Тип оплаты доп. услуг">
                <select
                  className={SELECT}
                  value={card.extraServicesPaymentType}
                  onChange={e => set('extraServicesPaymentType', e.target.value as ClientCard['extraServicesPaymentType'])}
                >
                  <option>Предоплата</option>
                  <option>На сборке</option>
                  <option>Частично</option>
                </select>
              </Field>

              {showExtraPartial && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Оплачено (доп. услуги)">
                    <input
                      type="number"
                      min={0}
                      className={INPUT}
                      value={card.extraServicesPaid || ''}
                      onChange={e => set('extraServicesPaid', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Остаток (доп. услуги)">
                    <input
                      readOnly
                      className={INPUT + ' opacity-60 cursor-default'}
                      value={extraBalance.toLocaleString('ru-RU')}
                    />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <Section icon="CalendarClock" title="Сроки">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Дата поставки изделия">
                <input
                  type="date"
                  className={INPUT}
                  value={card.deliveryDate}
                  onChange={e => set('deliveryDate', e.target.value)}
                />
              </Field>
              <Field label="Срок изготовления">
                <input
                  className={INPUT}
                  value={card.manufacturingPeriod}
                  onChange={e => set('manufacturingPeriod', e.target.value)}
                  placeholder="Например: 21 рабочий день"
                />
              </Field>
              <Field label="Срок сборки">
                <input
                  className={INPUT}
                  value={card.assemblyPeriod}
                  onChange={e => set('assemblyPeriod', e.target.value)}
                  placeholder="Например: 1–2 дня"
                />
              </Field>
            </div>
          </Section>

          <Section icon="Users" title="Ответственные">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Кто делал проект / дизайн">
                <input
                  className={INPUT}
                  value={card.designedBy}
                  onChange={e => set('designedBy', e.target.value)}
                  placeholder="Имя специалиста"
                />
              </Field>
              <Field label="Кто делал замер">
                <input
                  className={INPUT}
                  value={card.measuredBy}
                  onChange={e => set('measuredBy', e.target.value)}
                  placeholder="Имя специалиста"
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}