import Icon from '@/components/ui/icon';
import type { Client } from '../types';
import { INPUT, SELECT, TEXTAREA, Field, Section } from '../ClientCardShared';
import { useStore } from '@/store/useStore';

export function TabContract({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string | number | object) => void }) {
  const store = useStore();

  const addProduct = () => {
    const products = [...(client.products || []), { id: Date.now().toString(), name: '', qty: 1 }];
    onChange('products', products);
  };
  const removeProduct = (id: string) => onChange('products', client.products.filter(p => p.id !== id));
  const updateProduct = (id: string, field: 'name' | 'qty', value: string | number) => {
    onChange('products', client.products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const showBalance = client.payment_type === '50% предоплата' || client.payment_type === 'Рассрочка';

  const handleGenContractNumber = () => {
    const prefix = store.settings.company?.contractPrefix || 'К-';
    const year = new Date().getFullYear();
    const num = String(Date.now()).slice(-4);
    onChange('contract_number', `${prefix}${year}-${num}`);
    if (!client.contract_date) {
      onChange('contract_date', new Date().toISOString().slice(0, 10));
    }
  };

  return (
    <div className="space-y-4">
      {/* Договор */}
      <Section title="Договор" icon="FileText">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Номер договора">
            <div className="flex gap-1.5">
              <input className={INPUT + ' flex-1'} value={client.contract_number} onChange={e => onChange('contract_number', e.target.value)} placeholder="№ договора" />
              {!client.contract_number && (
                <button
                  onClick={handleGenContractNumber}
                  title="Сгенерировать номер"
                  className="px-2.5 py-2 bg-[hsl(220,12%,20%)] border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/50 transition-all shrink-0"
                >
                  <Icon name="Wand2" size={13} />
                </button>
              )}
            </div>
          </Field>
          <Field label="Дата заключения">
            <input type="date" className={INPUT} value={client.contract_date} onChange={e => onChange('contract_date', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Изделия */}
      <Section title="Изделия" icon="Package">
        <div className="space-y-2">
          {(client.products || []).length === 0 && (
            <div className="text-xs text-[hsl(var(--text-muted))] text-center py-2 opacity-60">Изделия не добавлены</div>
          )}
          {client.products?.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-2 bg-[hsl(220,12%,13%)] border border-[hsl(220,12%,18%)] rounded-lg px-3 py-2 group">
              <span className="text-[10px] font-bold text-[hsl(var(--text-muted))] w-5 text-center shrink-0 opacity-50">
                {idx + 1}
              </span>
              <input
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-[hsl(var(--text-muted))] outline-none border-b border-transparent focus:border-gold/40 transition-colors min-w-0"
                value={p.name}
                onChange={e => updateProduct(p.id, 'name', e.target.value)}
                placeholder="Наименование изделия"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateProduct(p.id, 'qty', Math.max(1, p.qty - 1))}
                  className="w-6 h-6 rounded flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,20%)] transition-colors"
                >
                  <Icon name="Minus" size={11} />
                </button>
                <input
                  type="number"
                  min={1}
                  className="w-10 text-center bg-transparent text-sm text-foreground outline-none"
                  value={p.qty}
                  onChange={e => updateProduct(p.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button
                  onClick={() => updateProduct(p.id, 'qty', p.qty + 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,20%)] transition-colors"
                >
                  <Icon name="Plus" size={11} />
                </button>
              </div>
              <button
                onClick={() => removeProduct(p.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Icon name="Trash2" size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addProduct}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[hsl(220,12%,22%)] rounded-lg text-sm text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all w-full justify-center"
          >
            <Icon name="Plus" size={13} /> Добавить изделие
          </button>
        </div>
      </Section>

      {/* Оплата */}
      <Section title="Оплата" icon="CreditCard">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Стоимость услуг */}
      <Section title="Стоимость доставки и монтажа" icon="Truck">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Стоимость доставки (₽)">
            <input type="number" min={0} className={INPUT} value={client.delivery_cost || ''} onChange={e => onChange('delivery_cost', parseFloat(e.target.value) || 0)} placeholder="0" />
          </Field>
          <Field label="Стоимость монтажа (₽)">
            <input type="number" min={0} className={INPUT} value={client.assembly_cost || ''} onChange={e => onChange('assembly_cost', parseFloat(e.target.value) || 0)} placeholder="0" />
          </Field>
        </div>
      </Section>
    </div>
  );
}