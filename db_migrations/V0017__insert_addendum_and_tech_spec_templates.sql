INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5',
  'addendum',
  'Основной шаблон',
  true,
  '[
    {"id":"blk_add_1","type":"header","label":"Заголовок","content":"ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"blk_add_2","type":"paragraph","label":"Подзаголовок","content":"к договору бытового подряда № {{номер_договора}} от {{дата_договора}}","enabled":true,"align":"center"},
    {"id":"blk_add_3","type":"paragraph","label":"Город и дата","content":"г. ____________                                                   «____» ____________ 20___ г.","enabled":true},
    {"id":"blk_add_4","type":"paragraph","label":"Преамбула","content":"{{компания}}, именуемый «Подрядчик», и гр. {{имя_клиента}}, именуемый «Заказчик», заключили настоящее соглашение:","enabled":true,"align":"justify"},
    {"id":"blk_add_5","type":"section","label":"Раздел 1","content":"1. ПРЕДМЕТ СОГЛАШЕНИЯ","enabled":true,"bold":true,"align":"left"},
    {"id":"blk_add_6","type":"paragraph","label":"1.1","content":"1.1. Стороны договорились внести следующие изменения в Договор:","enabled":true},
    {"id":"blk_add_7","type":"lines","label":"Строки для изменений","content":"6","enabled":true},
    {"id":"blk_add_8","type":"section","label":"Раздел 2","content":"2. ПРОЧИЕ УСЛОВИЯ","enabled":true,"bold":true,"align":"left"},
    {"id":"blk_add_9","type":"paragraph","label":"2.1","content":"2.1. Настоящее соглашение является неотъемлемой частью Договора и вступает в силу с момента подписания.","enabled":true,"align":"justify"},
    {"id":"blk_add_10","type":"paragraph","label":"2.2","content":"2.2. В остальной части условия Договора остаются без изменений.","enabled":true,"align":"justify"},
    {"id":"blk_add_11","type":"paragraph","label":"2.3","content":"2.3. Соглашение составлено в двух экземплярах.","enabled":true,"align":"justify"},
    {"id":"blk_add_12","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: {{менеджер}}\nПодпись: ______________________________\nМ.П.","enabled":true},
    {"id":"blk_add_13","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
),
(
  '5',
  'tech_spec',
  'Основной шаблон',
  true,
  '[
    {"id":"blk_ts_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение к договору бытового подряда № {{номер_договора}} от {{дата_договора}}","enabled":true,"align":"right"},
    {"id":"blk_ts_2","type":"header","label":"Заголовок","content":"«СПЕЦИФИКАЦИЯ НА ПОСТАВКУ ТЕХНИКИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"blk_ts_3","type":"table","label":"Таблица спецификации","content":"Наименование;Ед. изм.;Кол-во;Цена, руб.;Стоимость, руб.\n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ;шт.; ; ; \n ; ; ;ИТОГО:; ","enabled":true},
    {"id":"blk_ts_4","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
    {"id":"blk_ts_5","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);