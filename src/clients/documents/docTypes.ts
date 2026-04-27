export const API = 'https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7';

export function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}

export function apiUrl(action: string, clientId: string, doc: string) {
  return `${API}/?action=${action}&client_id=${clientId}&doc=${doc}&token=${encodeURIComponent(getToken())}`;
}

export type DocType =
  | 'contract' | 'act' | 'tech' | 'delivery' | 'assembly' | 'rules'
  | 'act_delivery' | 'act_assembly' | 'addendum' | 'delivery_calc'
  | 'delivery_lift' | 'assembly_calc' | 'assembly_extra' | 'tech_spec';

export interface DocDef {
  id: DocType;
  title: string;
  subtitle: string;
  icon: string;
  appendix: string;
  group: string;
}

export const DOCS: DocDef[] = [
  { id: 'contract',       title: 'Договор бытового подряда',   subtitle: 'Основной договор на изготовление мебели',             icon: 'FileText',       appendix: '',        group: 'Изготовление' },
  { id: 'tech',           title: 'Технический проект',          subtitle: 'Приложение № 1 — характеристики изделия',             icon: 'Ruler',          appendix: 'Прил. №1', group: 'Изготовление' },
  { id: 'act',            title: 'Акт выполненных работ',       subtitle: 'Приложение № 4 — приёмка мебели',                     icon: 'ClipboardCheck', appendix: 'Прил. №4', group: 'Изготовление' },
  { id: 'rules',          title: 'Правила эксплуатации',        subtitle: 'Приложение № 3 — уход за мебелью и гарантия',         icon: 'BookOpen',       appendix: 'Прил. №3', group: 'Изготовление' },
  { id: 'delivery',       title: 'Договор доставки',            subtitle: 'Договор на оказание услуг по доставке мебели',        icon: 'Truck',          appendix: '',        group: 'Доставка и монтаж' },
  { id: 'act_delivery',   title: 'Акт приёма доставки',         subtitle: 'Приёмка мебели по факту доставки',                    icon: 'PackageCheck',   appendix: '',        group: 'Доставка и монтаж' },
  { id: 'assembly',       title: 'Договор монтажа',             subtitle: 'Договор на сборку и монтаж мебели',                   icon: 'Wrench',         appendix: '',        group: 'Доставка и монтаж' },
  { id: 'act_assembly',   title: 'Акт приёма сборки',           subtitle: 'Приёмка выполненных работ по монтажу',                icon: 'ClipboardList',  appendix: '',        group: 'Доставка и монтаж' },
  { id: 'delivery_calc',  title: 'Калькуляция доставки',        subtitle: 'Приложение № 1 к договору доставки',                  icon: 'Calculator',     appendix: 'Прил. №1', group: 'Доставка и монтаж' },
  { id: 'delivery_lift',  title: 'Прайс подъём мебели',         subtitle: 'Приложение № 2 к договору доставки',                  icon: 'ArrowUpFromLine',appendix: 'Прил. №2', group: 'Доставка и монтаж' },
  { id: 'assembly_calc',  title: 'Калькуляция сборки',          subtitle: 'Приложение № 1 к договору монтажа',                   icon: 'Calculator',     appendix: 'Прил. №1', group: 'Сборка' },
  { id: 'assembly_extra', title: 'Прайс доп. работ',            subtitle: 'Приложение № 2 к договору монтажа',                   icon: 'ListPlus',       appendix: 'Прил. №2', group: 'Сборка' },
  { id: 'addendum',       title: 'Дополнительное соглашение',   subtitle: 'К договору бытового подряда на изготовление мебели',  icon: 'FilePlus2',      appendix: '',        group: 'Прочее' },
  { id: 'tech_spec',      title: 'Спецификация на технику',     subtitle: 'Приложение к договору бытового подряда',              icon: 'Tv',             appendix: '',        group: 'Прочее' },
];

export const DOC_GROUPS = [
  { name: 'Изготовление',    icon: 'Package' },
  { name: 'Доставка и монтаж', icon: 'Truck' },
  { name: 'Сборка',          icon: 'Wrench' },
  { name: 'Прочее',          icon: 'FolderOpen' },
] as const;
