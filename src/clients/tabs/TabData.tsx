import Icon from '@/components/ui/icon';
import type { Client } from '../types';
import { INPUT, SELECT, TEXTAREA, Field, Section } from '../ClientCardShared';
import { PhoneInput } from './shared';

export function TabData({ client, onChange }: { client: Client; onChange: (f: keyof Client, v: string) => void }) {
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
              <PhoneInput value={client.phone} onChange={v => onChange('phone', v)} />
            </Field>
            <Field label="Телефон (доп.)">
              <PhoneInput value={client.phone2} onChange={v => onChange('phone2', v)} />
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
      <Section title="Адрес доставки" icon="Truck" action={
        <button
          onClick={() => {
            onChange('delivery_city', client.reg_city);
            onChange('delivery_street', client.reg_street);
            onChange('delivery_house', client.reg_house);
            onChange('delivery_apt', client.reg_apt);
          }}
          className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
          title="Скопировать из адреса регистрации"
        >
          <Icon name="Copy" size={12} />
          Как у регистрации
        </button>
      }>
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
