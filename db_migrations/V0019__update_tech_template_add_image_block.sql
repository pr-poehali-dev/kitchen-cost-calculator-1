UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"tech_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 1 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}","enabled":true,"align":"right"},
  {"id":"tech_2","type":"header","label":"Заголовок","content":"«Технический проект»","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"tech_3","type":"table","label":"Характеристики материалов","content":"Корпус:; ;Столешница:; \nФасад 1:; ;Стеновая панель:; \nФасад 2:; ;Подсветка:; \nФрезеровка:; ; ; ","enabled":true},
  {"id":"tech_4","type":"image","label":"Фото технического проекта","content":"","enabled":true,"align":"center"},
  {"id":"tech_5","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"tech_6","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'tech' AND user_id = '5';