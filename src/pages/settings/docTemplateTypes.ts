import { API_URLS } from '@/config/api';

export const API = API_URLS.docTemplates;

export function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}

export function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

export const DOC_TYPES = [
  { id: 'contract',      label: 'Договор бытового подряда' },
  { id: 'tech',          label: 'Технический проект' },
  { id: 'rules',         label: 'Правила эксплуатации' },
  { id: 'act',           label: 'Акт выполненных работ' },
  { id: 'delivery',      label: 'Договор доставки' },
  { id: 'delivery_calc', label: 'Калькуляция доставки' },
  { id: 'delivery_lift', label: 'Прайс доп. услуг доставки' },
  { id: 'act_delivery',  label: 'Акт приёма доставки' },
  { id: 'assembly',      label: 'Договор сборки' },
  { id: 'assembly_calc', label: 'Калькуляция сборки' },
  { id: 'assembly_extra',label: 'Прайс доп. услуг сборки' },
  { id: 'act_assembly',  label: 'Акт выполненных работ сборки' },
  { id: 'addendum',     label: 'Дополнительное соглашение' },
  { id: 'tech_spec',    label: 'Спецификация на технику' },
];

export const VAR_GROUPS: { label: string; vars: { key: string; desc: string; preview: string }[] }[] = [
  {
    label: 'Клиент — основное',
    vars: [
      { key: '{{имя_клиента}}',        desc: 'ФИО клиента',                    preview: 'Иванов Иван Иванович' },
      { key: '{{имя_клиента_рп}}',     desc: 'ФИО в родительном падеже',       preview: 'Иванова Ивана Ивановича' },
      { key: '{{фамилия}}',            desc: 'Фамилия',                        preview: 'Иванов' },
      { key: '{{имя}}',                desc: 'Имя',                            preview: 'Иван' },
      { key: '{{отчество}}',           desc: 'Отчество',                       preview: 'Иванович' },
      { key: '{{телефон_клиента}}',    desc: 'Телефон клиента',                preview: '+7 (999) 123-45-67' },
      { key: '{{телефон2_клиента}}',   desc: 'Доп. телефон',                   preview: '+7 (999) 765-43-21' },
      { key: '{{email_клиента}}',      desc: 'Email клиента',                  preview: 'ivanov@mail.ru' },
      { key: '{{мессенджер}}',         desc: 'Мессенджер (WhatsApp и т.д.)',   preview: 'WhatsApp' },
    ],
  },
  {
    label: 'Паспорт',
    vars: [
      { key: '{{паспорт}}',            desc: 'Серия и номер паспорта',         preview: '4520 123456' },
      { key: '{{паспорт_серия}}',      desc: 'Серия паспорта',                 preview: '4520' },
      { key: '{{паспорт_номер}}',      desc: 'Номер паспорта',                 preview: '123456' },
      { key: '{{паспорт_выдан}}',      desc: 'Кем выдан паспорт',             preview: 'ОУФМС по г. Москве' },
      { key: '{{паспорт_дата}}',       desc: 'Дата выдачи паспорта',          preview: '15.03.2015' },
      { key: '{{паспорт_код}}',        desc: 'Код подразделения',              preview: '770-001' },
    ],
  },
  {
    label: 'Адреса клиента',
    vars: [
      { key: '{{адрес_регистрации}}',  desc: 'Адрес регистрации (полный)',     preview: 'г. Москва, ул. Ленина, д. 5, кв. 12' },
      { key: '{{город_клиента}}',      desc: 'Город клиента',                  preview: 'г. Москва' },
      { key: '{{адрес_доставки}}',     desc: 'Адрес доставки (полный)',        preview: 'г. Москва, ул. Садовая, д. 3, кв. 8' },
      { key: '{{город_доставки}}',     desc: 'Город доставки',                 preview: 'г. Москва' },
      { key: '{{улица_доставки}}',     desc: 'Улица доставки',                 preview: 'ул. Садовая' },
      { key: '{{дом_доставки}}',       desc: 'Дом доставки',                   preview: 'д. 3' },
      { key: '{{квартира_доставки}}',  desc: 'Квартира доставки',              preview: 'кв. 8' },
      { key: '{{этаж_доставки}}',      desc: 'Этаж доставки',                  preview: '5' },
      { key: '{{подъезд_доставки}}',   desc: 'Подъезд доставки',              preview: '2' },
      { key: '{{примечание_доставки}}',desc: 'Примечание к доставке',          preview: 'Домофон 85' },
    ],
  },
  {
    label: 'Договор и оплата',
    vars: [
      { key: '{{номер_договора}}',     desc: 'Номер договора',                 preview: '877' },
      { key: '{{дата_договора}}',      desc: 'Дата договора (полная)',         preview: '02 мая 2026 г.' },
      { key: '{{дата_договора_кратко}}',desc: 'Дата договора (ДД.ММ.ГГГГ)',   preview: '02.05.2026' },
      { key: '{{сумма}}',              desc: 'Итоговая сумма',                 preview: '350 000' },
      { key: '{{сумма_прописью}}',     desc: 'Сумма прописью',                preview: 'триста пятьдесят тысяч рублей' },
      { key: '{{аванс}}',              desc: 'Сумма предоплаты',               preview: '175 000' },
      { key: '{{аванс_прописью}}',     desc: 'Аванс прописью',                preview: 'сто семьдесят пять тысяч рублей' },
      { key: '{{остаток}}',            desc: 'Остаток к оплате',               preview: '175 000' },
      { key: '{{остаток_прописью}}',   desc: 'Остаток прописью',              preview: 'сто семьдесят пять тысяч рублей' },
      { key: '{{тип_оплаты}}',         desc: 'Тип оплаты',                     preview: 'наличные' },
      { key: '{{схема_оплаты}}',       desc: 'Своя схема оплаты',             preview: '50% аванс, 50% при сдаче' },
      { key: '{{стоимость_доставки}}', desc: 'Стоимость доставки',             preview: '3 000' },
      { key: '{{доставка_прописью}}',  desc: 'Стоимость доставки прописью',   preview: 'три тысячи рублей' },
      { key: '{{стоимость_сборки}}',   desc: 'Стоимость сборки',               preview: '8 000' },
      { key: '{{сборка_прописью}}',    desc: 'Стоимость сборки прописью',     preview: 'восемь тысяч рублей' },
    ],
  },
  {
    label: 'Сроки',
    vars: [
      { key: '{{срок_изготовления}}',  desc: 'Срок изготовления (дней)',       preview: '30' },
      { key: '{{срок_сборки}}',        desc: 'Срок сборки (дней)',             preview: '2' },
      { key: '{{дата_доставки}}',      desc: 'Дата доставки (полная)',         preview: '15 июня 2026 г.' },
      { key: '{{дата_доставки_полная}}',desc: 'Дата доставки (полная)',        preview: '15 июня 2026 г.' },
    ],
  },
  {
    label: 'Рассрочка / кредит',
    vars: [
      { key: '{{номер_кредита}}',      desc: 'Номер кредитного договора',      preview: 'КД-12345' },
      { key: '{{дата_кредита}}',       desc: 'Дата кредитного договора',       preview: '02 мая 2026 г.' },
      { key: '{{банк_кредита}}',       desc: 'Банк рассрочки',                 preview: 'Сбербанк' },
      { key: '{{аванс_кредит}}',       desc: 'Аванс по кредиту',               preview: '175 000' },
      { key: '{{остаток_кредит}}',     desc: 'Остаток по кредиту',             preview: '175 000' },
    ],
  },
  {
    label: 'Технический проект',
    vars: [
      { key: '{{фото_проекта}}',       desc: 'Фото рендера из карточки клиента', preview: '(url фото)' },
      { key: '{{корпус}}',             desc: 'Корпус 1',                       preview: 'ЛДСП Белый 16мм' },
      { key: '{{корпус2}}',            desc: 'Корпус 2',                       preview: 'ЛДСП Дуб Сонома' },
      { key: '{{фасад}}',              desc: 'Фасад 1',                        preview: 'МДФ Белый матовый' },
      { key: '{{фасад2}}',             desc: 'Фасад 2',                        preview: 'Стекло чёрное' },
      { key: '{{столешница}}',         desc: 'Столешница',                     preview: 'Кварц Белый 20мм' },
      { key: '{{стеновая}}',           desc: 'Стеновая панель',                preview: 'Стекло с фотопечатью' },
      { key: '{{подсветка}}',          desc: 'Тип подсветки',                  preview: 'LED лента' },
      { key: '{{цвет_подсветки}}',     desc: 'Цвет подсветки',                 preview: 'Тёплый белый' },
      { key: '{{фрезеровка}}',         desc: 'Фрезеровка',                     preview: 'Милано' },
    ],
  },
  {
    label: 'Компания',
    vars: [
      { key: '{{компания}}',           desc: 'Название компании',              preview: 'ООО «Интерьерные Решения»' },
      { key: '{{город}}',              desc: 'Город компании',                 preview: 'г. Саратов' },
      { key: '{{инн}}',                desc: 'ИНН компании',                   preview: '6450106826' },
      { key: '{{огрн}}',               desc: 'ОГРН / ОГРНИП',                  preview: '1196451012251' },
      { key: '{{кпп}}',                desc: 'КПП компании',                   preview: '645001001' },
      { key: '{{инн_кпп}}',            desc: 'ИНН/КПП',                        preview: '6450106826/645001001' },
      { key: '{{адрес_компании}}',     desc: 'Юридический адрес компании',     preview: 'г. Саратов, ул. Рабочая, д. 1' },
      { key: '{{телефон_компании}}',   desc: 'Телефон компании',               preview: '+7 (845) 000-00-00' },
      { key: '{{email_компании}}',     desc: 'Email компании',                 preview: 'info@company.ru' },
      { key: '{{сайт_компании}}',      desc: 'Сайт компании',                  preview: 'www.company.ru' },
      { key: '{{директор}}',           desc: 'ФИО директора',                  preview: 'Петров Алексей Владимирович' },
      { key: '{{должность_директора}}',desc: 'Должность директора',            preview: 'Генеральный директор' },
      { key: '{{банк}}',               desc: 'Банк компании',                  preview: 'ПАО Сбербанк' },
      { key: '{{бик}}',                desc: 'БИК банка',                      preview: '042401645' },
      { key: '{{расчётный_счёт}}',     desc: 'Расчётный счёт (р/с)',           preview: '40702810300000012345' },
      { key: '{{корр_счёт}}',          desc: 'Корреспондентский счёт (к/с)',   preview: '30101810200000000645' },
    ],
  },
  {
    label: 'Ответственные',
    vars: [
      { key: '{{менеджер}}',              desc: 'Имя менеджера',                   preview: 'Сазонов Василий Николаевич' },
      { key: '{{менеджер_рп}}',           desc: 'Имя менеджера (род. падеж)',      preview: 'Сазонова Василия Николаевича' },
      { key: '{{номер_доверенности}}',    desc: 'Номер доверенности менеджера',   preview: '20' },
      { key: '{{дата_доверенности}}',     desc: 'Дата доверенности менеджера',    preview: '12.01.2026' },
      { key: '{{дизайнер}}',              desc: 'Имя дизайнера',                  preview: 'Петрова Анна Сергеевна' },
      { key: '{{замерщик}}',              desc: 'Имя замерщика',                  preview: 'Козлов Дмитрий Игоревич' },
    ],
  },
  {
    label: 'Прописи',
    vars: [
      { key: '{{срок_изготовления_прописью}}', desc: 'Срок изготовления прописью', preview: 'тридцать' },
      { key: '{{срок_сборки_прописью}}',       desc: 'Срок сборки прописью',       preview: 'два' },
    ],
  },
];

export const VARS = VAR_GROUPS.flatMap(g => g.vars.map(v => v.key));

export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export type ConditionField =
  | 'payment_type'
  | 'has_delivery'
  | 'has_assembly'
  | 'has_credit'
  | 'prepaid_percent'
  | 'total_amount';

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'set' | 'not_set';

export interface BlockCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value?: string;
}

export const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'payment_type',    label: 'Тип оплаты' },
  { value: 'has_delivery',    label: 'Есть доставка' },
  { value: 'has_assembly',    label: 'Есть сборка' },
  { value: 'has_credit',      label: 'Рассрочка / кредит' },
  { value: 'prepaid_percent', label: 'Процент аванса' },
  { value: 'total_amount',    label: 'Сумма договора' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: 'eq',      label: 'равно',              needsValue: true },
  { value: 'neq',     label: 'не равно',           needsValue: true },
  { value: 'gt',      label: 'больше чем',         needsValue: true },
  { value: 'lt',      label: 'меньше чем',         needsValue: true },
  { value: 'set',     label: 'указано',            needsValue: false },
  { value: 'not_set', label: 'не указано',         needsValue: false },
];

export const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash',       label: 'Наличные' },
  { value: 'card',       label: 'Карта' },
  { value: 'transfer',   label: 'Перевод' },
  { value: 'credit',     label: 'Рассрочка' },
  { value: 'installment',label: 'Рассрочка (магазин)' },
];

export type CalcTableColumn = 'name' | 'qty' | 'unit' | 'price' | 'total' | 'article' | 'manufacturer';

export const CALC_TABLE_COLUMNS: { key: CalcTableColumn; label: string; defaultOn: boolean }[] = [
  { key: 'name',         label: 'Наименование',  defaultOn: true },
  { key: 'qty',          label: 'Кол-во',         defaultOn: true },
  { key: 'unit',         label: 'Ед. изм.',        defaultOn: true },
  { key: 'price',        label: 'Цена',            defaultOn: false },
  { key: 'total',        label: 'Сумма',           defaultOn: true },
  { key: 'article',      label: 'Артикул',         defaultOn: false },
  { key: 'manufacturer', label: 'Производитель',   defaultOn: false },
];

export interface CalcTableSettings {
  columns: CalcTableColumn[];
  showBlockHeaders: boolean;
  showServices: boolean;
  showTotal: boolean;
  priceMode: 'client' | 'base';
}

export const DEFAULT_CALC_TABLE_SETTINGS: CalcTableSettings = {
  columns: ['name', 'qty', 'unit', 'total'],
  showBlockHeaders: true,
  showServices: true,
  showTotal: true,
  priceMode: 'client',
};

export interface Block {
  id: string;
  type: string;
  label: string;
  content: string;
  enabled: boolean;
  condition?: BlockCondition;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: BlockAlign;
  marginTop?: number;
  marginBottom?: number;
  colWidths?: number[];
  rowHeight?: number;
  calcTableSettings?: CalcTableSettings;
  imageWidth?: number;
  imageHeight?: number;
  twoColRightAlign?: boolean;
}

export interface Template {
  id: string;
  doc_type: string;
  name: string;
  is_default: boolean;
  blocks: Block[];
  settings: Record<string, string | number | boolean>;
}

export function blockStyle(b: Block, globalFontSize: number): string {
  const parts: string[] = [];
  if (b.fontSize)        parts.push(`font-size:${b.fontSize}pt`);
  if (b.bold)            parts.push('font-weight:bold');
  if (b.italic)          parts.push('font-style:italic');
  if (b.underline)       parts.push('text-decoration:underline');
  if (b.align)           parts.push(`text-align:${b.align}`);
  if (b.marginTop)       parts.push(`margin-top:${b.marginTop}mm`);
  if (b.marginBottom)    parts.push(`margin-bottom:${b.marginBottom}mm`);
  if (!b.fontSize && b.type === 'table') parts.push(`font-size:${globalFontSize}pt`);
  return parts.join(';');
}

export function parseTableContent(content: string): string[][] {
  return content.split('\n').filter(r => r.trim()).map(r => r.split(';'));
}

export function serializeTableContent(rows: string[][]): string {
  return rows.map(r => r.join(';')).join('\n');
}

// Превью-логика вынесена в docTemplatePreview.ts
export { buildPreviewHtml, applyPreviewVars } from './docTemplatePreview';