-- Обновляем пустые/почти пустые существующие шаблоны

-- assembly (Договор сборки)
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"asm_1","type":"header","label":"Заголовок","content":"ДОГОВОР","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"asm_2","type":"paragraph","label":"Подзаголовок","content":"на оказание услуг по сборке и монтажу мебели","enabled":true,"align":"center"},
  {"id":"asm_3","type":"paragraph","label":"Город и дата","content":"г. ____________                                                   «____» ____________ 20___ г.","enabled":true},
  {"id":"asm_4","type":"paragraph","label":"Преамбула","content":"{{компания}}, именуемый «Исполнитель», и гр. {{имя_клиента}}, именуемый «Заказчик», заключили настоящий Договор:","enabled":true,"align":"justify"},
  {"id":"asm_5","type":"section","label":"Раздел 1","content":"1. ПРЕДМЕТ ДОГОВОРА","enabled":true,"bold":true,"align":"left"},
  {"id":"asm_6","type":"paragraph","label":"1.1","content":"1.1. Исполнитель обязуется выполнить работы по сборке и монтажу мебели по договору подряда № {{номер_договора}} от {{дата_договора}}.","enabled":true,"align":"justify"},
  {"id":"asm_7","type":"paragraph","label":"1.2","content":"1.2. Адрес выполнения работ: _____________________________.","enabled":true,"align":"justify"},
  {"id":"asm_8","type":"paragraph","label":"1.3","content":"1.3. Ориентировочная дата начала работ: _____________. Срок выполнения: _____ рабочих дней.","enabled":true,"align":"justify"},
  {"id":"asm_9","type":"paragraph","label":"1.4","content":"1.4. В объём работ входит: сборка корпусных элементов, установка фасадов и фурнитуры, регулировка петель, монтаж столешницы и стеновых панелей, подключение подсветки (при наличии).","enabled":true,"align":"justify"},
  {"id":"asm_10","type":"section","label":"Раздел 2","content":"2. ПРАВА И ОБЯЗАННОСТИ СТОРОН","enabled":true,"bold":true,"align":"left"},
  {"id":"asm_11","type":"paragraph","label":"2.1","content":"2.1. Исполнитель обязан: выполнить монтаж качественно; убрать строительный мусор; уведомить о дефектах мебели или помещения.","enabled":true,"align":"justify"},
  {"id":"asm_12","type":"paragraph","label":"2.2","content":"2.2. Заказчик обязан: обеспечить доступ и электроснабжение; принять работы; оплатить согласно условиям.","enabled":true,"align":"justify"},
  {"id":"asm_13","type":"section","label":"Раздел 3","content":"3. СТОИМОСТЬ И ОПЛАТА","enabled":true,"bold":true,"align":"left"},
  {"id":"asm_14","type":"paragraph","label":"3.1","content":"3.1. Стоимость работ по сборке и монтажу составляет _____________________________ рублей.","enabled":true,"align":"justify"},
  {"id":"asm_15","type":"paragraph","label":"3.2","content":"3.2. Оплата производится в день завершения монтажных работ до подписания Акта приёмки.","enabled":true,"align":"justify"},
  {"id":"asm_16","type":"section","label":"Раздел 4","content":"4. ОТВЕТСТВЕННОСТЬ","enabled":true,"bold":true,"align":"left"},
  {"id":"asm_17","type":"paragraph","label":"4.1","content":"4.1. Исполнитель несёт ответственность за качество монтажных работ в течение 12 месяцев.","enabled":true,"align":"justify"},
  {"id":"asm_18","type":"paragraph","label":"4.2","content":"4.2. Гарантия не распространяется на дефекты от нарушения правил эксплуатации или механических повреждений.","enabled":true,"align":"justify"},
  {"id":"asm_19","type":"section","label":"Раздел 5","content":"5. ПРОЧИЕ УСЛОВИЯ","enabled":true,"bold":true,"align":"left"},
  {"id":"asm_20","type":"paragraph","label":"5.1","content":"5.1. Приёмка работ оформляется подписанием Акта приёмки. 5.2. Договор в двух экземплярах.","enabled":true,"align":"justify"},
  {"id":"asm_21","type":"paragraph","label":"Реквизиты исполнителя","content":"Исполнитель: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"asm_22","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'assembly' AND user_id = '5';

-- act_assembly (Акт выполненных работ сборки)
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"acasm_1","type":"paragraph","label":"Ссылка на договор","content":"к договору на оказание услуг по сборке и монтажу мебели от {{дата_договора}}","enabled":true,"align":"right"},
  {"id":"acasm_2","type":"header","label":"Заголовок","content":"«АКТ ПРИЁМА-ПЕРЕДАЧИ ВЫПОЛНЕННЫХ РАБОТ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"acasm_3","type":"paragraph","label":"Город и дата","content":"г. ____________                                                   «____» ____________ 20___ г.","enabled":true},
  {"id":"acasm_4","type":"paragraph","label":"Преамбула","content":"{{компания}}, именуемый «Исполнитель», и гр. {{имя_клиента}}, именуемый «Заказчик», составили настоящий Акт:","enabled":true,"align":"justify"},
  {"id":"acasm_5","type":"paragraph","label":"Пункт 1","content":"1. Исполнитель выполнил работы по сборке и монтажу мебели по адресу: _____________________________.","enabled":true,"align":"justify"},
  {"id":"acasm_6","type":"table","label":"Таблица мебели","content":"№;Наименование мебели;Ед. изм.;Кол-во\n1;Кухонный гарнитур;шт.;1","enabled":true},
  {"id":"acasm_7","type":"paragraph","label":"Пункт 2","content":"2. Объём работ: сборка корпусных элементов, установка фасадов, регулировка петель, монтаж столешницы.","enabled":true,"align":"justify"},
  {"id":"acasm_8","type":"paragraph","label":"Пункт 3","content":"3. Заказчик произвёл проверку. Фурнитура проверена. Претензий нет.","enabled":true,"align":"justify"},
  {"id":"acasm_9","type":"paragraph","label":"Пункт 4 - стоимость","content":"4. Стоимость работ: _____________________________ рублей. Оплата произведена.","enabled":true,"align":"justify"},
  {"id":"acasm_10","type":"paragraph","label":"Пункт 5 - гарантия","content":"5. Гарантийный срок на монтажные работы — 12 месяцев.","enabled":true,"align":"justify"},
  {"id":"acasm_11","type":"paragraph","label":"Реквизиты исполнителя","content":"Исполнитель: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"acasm_12","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'act_assembly' AND user_id = '5';

-- delivery (Договор доставки) - обновляем оба
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"del_1","type":"header","label":"Заголовок","content":"ДОГОВОР","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"del_2","type":"paragraph","label":"Подзаголовок","content":"на оказание услуг по доставке мебели","enabled":true,"align":"center"},
  {"id":"del_3","type":"paragraph","label":"Город и дата","content":"г. ____________                                                   «____» ____________ 20___ г.","enabled":true},
  {"id":"del_4","type":"paragraph","label":"Преамбула","content":"{{компания}}, в лице менеджера {{менеджер}}, именуемый «Исполнитель», и гр. {{имя_клиента}}, именуемый «Заказчик», заключили настоящий Договор:","enabled":true,"align":"justify"},
  {"id":"del_5","type":"section","label":"Раздел 1","content":"1. ПРЕДМЕТ ДОГОВОРА","enabled":true,"bold":true,"align":"left"},
  {"id":"del_6","type":"paragraph","label":"1.1","content":"1.1. Исполнитель обязуется доставить мебель по договору подряда № {{номер_договора}} от {{дата_договора}}.","enabled":true,"align":"justify"},
  {"id":"del_7","type":"paragraph","label":"1.2","content":"1.2. Адрес доставки: _____________________________. Этаж: ___. Лифт: ___.","enabled":true,"align":"justify"},
  {"id":"del_8","type":"paragraph","label":"1.3","content":"1.3. Дата доставки: _____________. Конкретное время согласовывается дополнительно.","enabled":true,"align":"justify"},
  {"id":"del_9","type":"paragraph","label":"1.4","content":"1.4. Доставка осуществляется в разобранном виде.","enabled":true,"align":"justify"},
  {"id":"del_10","type":"section","label":"Раздел 2","content":"2. ПРАВА И ОБЯЗАННОСТИ СТОРОН","enabled":true,"bold":true,"align":"left"},
  {"id":"del_11","type":"paragraph","label":"2.1","content":"2.1. Исполнитель обязан: доставить в срок по указанному адресу; обеспечить сохранность при транспортировке; уведомить об изменении времени не менее чем за 2 часа.","enabled":true,"align":"justify"},
  {"id":"del_12","type":"paragraph","label":"2.2","content":"2.2. Заказчик обязан: обеспечить доступ к месту доставки; оплатить услуги; при обнаружении повреждений сообщить до подписания акта.","enabled":true,"align":"justify"},
  {"id":"del_13","type":"paragraph","label":"2.3","content":"2.3. Исполнитель вправе однократно предоставить скидку в размере стоимости доставки (8 000 руб.) при доставке в пределах г. Саратова и г. Энгельса.","enabled":true,"align":"justify"},
  {"id":"del_14","type":"section","label":"Раздел 3","content":"3. СТОИМОСТЬ И ОПЛАТА","enabled":true,"bold":true,"align":"left"},
  {"id":"del_15","type":"paragraph","label":"3.1","content":"3.1. Стоимость услуг определяется Приложением № 1.","enabled":true,"align":"justify"},
  {"id":"del_16","type":"paragraph","label":"3.2","content":"3.2. Оплата производится в день доставки до начала разгрузки.","enabled":true,"align":"justify"},
  {"id":"del_17","type":"section","label":"Раздел 4","content":"4. ОТВЕТСТВЕННОСТЬ","enabled":true,"bold":true,"align":"left"},
  {"id":"del_18","type":"paragraph","label":"4.1","content":"4.1. При повреждении мебели по вине Исполнителя при транспортировке — Исполнитель возмещает ущерб.","enabled":true,"align":"justify"},
  {"id":"del_19","type":"paragraph","label":"4.2","content":"4.2. При отказе от доставки менее чем за 24 часа Исполнитель вправе удержать фактически понесённые расходы.","enabled":true,"align":"justify"},
  {"id":"del_20","type":"section","label":"Раздел 5","content":"5. ПРОЧИЕ УСЛОВИЯ","enabled":true,"bold":true,"align":"left"},
  {"id":"del_21","type":"paragraph","label":"5.1","content":"5.1. Договор вступает в силу с момента подписания. Составлен в двух экземплярах.","enabled":true,"align":"justify"},
  {"id":"del_22","type":"paragraph","label":"Реквизиты исполнителя","content":"Исполнитель: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"del_23","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'delivery' AND user_id = '5';

-- delivery_calc (Калькуляция доставки)
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"dcalc_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 1 к договору на оказание услуг по доставке мебели","enabled":true,"align":"right"},
  {"id":"dcalc_2","type":"header","label":"Заголовок","content":"«КАЛЬКУЛЯЦИЯ НА ВЫПОЛНЕНИЕ УСЛУГ ПО ДОСТАВКЕ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"dcalc_3","type":"table","label":"Таблица калькуляции","content":"Наименование работ и услуг;Ед. изм.;Кол-во;Цена, руб.;Стоимость, руб.\nДоставка в пределах г. Саратова и г. Энгельса *;1 услуга;1;8 000;8 000\nДоставка за пределы г. Саратова и г. Энгельса **;1 км;;70;\n;;Итого:;;8 000\n;;Скидка ***:;;8 000\n;;Итого со скидкой:;;0","enabled":true},
  {"id":"dcalc_4","type":"paragraph","label":"Сноска 1","content":"* Исполнитель вправе однократно предоставить скидку в размере 8 000 руб.","enabled":true},
  {"id":"dcalc_5","type":"paragraph","label":"Сноска 2","content":"** Километраж от склада Исполнителя до адреса Заказчика по Яндекс.Картам.","enabled":true},
  {"id":"dcalc_6","type":"paragraph","label":"Сноска 3","content":"*** Размер скидки определяется Исполнителем индивидуально.","enabled":true},
  {"id":"dcalc_7","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"dcalc_8","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'delivery_calc' AND user_id = '5';

-- delivery_lift (Прайс доп. услуг доставки) - обновляем оба пустых
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = '[
  {"id":"dlift_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 2 к договору на оказание услуг по доставке мебели","enabled":true,"align":"right"},
  {"id":"dlift_2","type":"header","label":"Заголовок","content":"«ПРАЙС НА ВЫПОЛНЕНИЕ УСЛУГ ПО ПОДЪЁМУ И ЗАНОСУ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
  {"id":"dlift_3","type":"paragraph","label":"Пояснение","content":"Подъём мебели при отсутствии лифта и занос при невозможности парковки вплотную к подъезду.","enabled":true,"bold":true,"align":"justify"},
  {"id":"dlift_4","type":"table","label":"Прайс-лист","content":"Наименование;Ед. изм.;Кол-во (этаж);Цена, руб.\nКвадратура корпуса до 20 кв.м;руб./этаж;;550\nКвадратура корпуса 20–25 кв.м;руб./этаж;;650\nКвадратура корпуса более 25 кв.м;руб./этаж;;750\nПеремещение вручную при невозможности подъезда;1 м;;30\nПодъём столешницы;1 уп./1 этаж;;350\nПодъём стеновой панели;1 уп./1 этаж;;250\nПодъём крупных частей корпуса;1 уп./1 этаж;;250\nПодъём дверей-купе;1 дверь/1 этаж;;150","enabled":true},
  {"id":"dlift_5","type":"paragraph","label":"Примечание 1","content":"1. Подъём на лифте — бесплатно. 2. Занос на 1 этаж — бесплатно при парковке вплотную.","enabled":true},
  {"id":"dlift_6","type":"paragraph","label":"Примечание 2","content":"* Услуги рассчитываются по факту оказания.","enabled":true},
  {"id":"dlift_7","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
  {"id":"dlift_8","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
]'::jsonb,
updated_at = NOW()
WHERE doc_type = 'delivery_lift' AND user_id = '5';

-- Добавляем новые шаблоны которых нет совсем

-- act_delivery (Акт приёма доставки)
INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5', 'act_delivery', 'Основной шаблон', true,
  '[
    {"id":"adel_1","type":"paragraph","label":"Ссылка на договор","content":"к договору на оказание услуг по доставке мебели от {{дата_договора}}","enabled":true,"align":"right"},
    {"id":"adel_2","type":"header","label":"Заголовок","content":"«АКТ ПРИЁМА-ПЕРЕДАЧИ ДОСТАВКИ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"adel_3","type":"paragraph","label":"Город и дата","content":"г. ____________                                                   «____» ____________ 20___ г.","enabled":true},
    {"id":"adel_4","type":"paragraph","label":"Преамбула","content":"{{компания}}, именуемый «Исполнитель», и гр. {{имя_клиента}}, именуемый «Заказчик», составили настоящий Акт:","enabled":true,"align":"justify"},
    {"id":"adel_5","type":"paragraph","label":"Пункт 1","content":"1. Исполнитель доставил Заказчику мебель по адресу: _____________________________.","enabled":true,"align":"justify"},
    {"id":"adel_6","type":"paragraph","label":"Пункт 2","content":"2. Дата доставки: _____________.","enabled":true,"align":"justify"},
    {"id":"adel_7","type":"paragraph","label":"Пункт 3","content":"3. Мебель доставлена в полном объёме, внешних механических повреждений не выявлено.","enabled":true,"align":"justify"},
    {"id":"adel_8","type":"paragraph","label":"Пункт 4","content":"4. Заказчик произвёл осмотр мебели в момент приёмки. Претензий нет.","enabled":true,"align":"justify"},
    {"id":"adel_9","type":"paragraph","label":"Пункт 5 - стоимость","content":"5. Стоимость услуг по доставке: _____________________________ рублей. Оплата произведена.","enabled":true,"align":"justify"},
    {"id":"adel_10","type":"paragraph","label":"Пункт 6","content":"6. Услуги по доставке выполнены в полном объёме.","enabled":true,"align":"justify"},
    {"id":"adel_11","type":"paragraph","label":"Реквизиты исполнителя","content":"Исполнитель: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
    {"id":"adel_12","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);

-- assembly_calc (Калькуляция сборки)
INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5', 'assembly_calc', 'Основной шаблон', true,
  '[
    {"id":"acalc_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 1 к договору на оказание услуг по сборке и монтажу мебели","enabled":true,"align":"right"},
    {"id":"acalc_2","type":"header","label":"Заголовок","content":"«КАЛЬКУЛЯЦИЯ НА ВЫПОЛНЕНИЕ УСЛУГ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"acalc_3","type":"table","label":"Таблица калькуляции","content":"Наименование работ и услуг;Ед. изм.;Кол-во;Цена, руб.;Стоимость, руб.\nСборка и монтаж кухонного гарнитура;1 услуга;1;;\nРегулировка фурнитуры;1 услуга;1;;\nМонтаж столешницы;1 услуга;1;;\nМонтаж стеновой панели;1 услуга;1;;\nПодключение подсветки;1 услуга;;;;\n;;ИТОГО:;;","enabled":true},
    {"id":"acalc_4","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
    {"id":"acalc_5","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);

-- assembly_extra (Прайс доп. услуг сборки)
INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5', 'assembly_extra', 'Основной шаблон', true,
  '[
    {"id":"aext_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 2 к договору на оказание услуг по сборке и монтажу мебели","enabled":true,"align":"right"},
    {"id":"aext_2","type":"header","label":"Заголовок","content":"«ПРАЙС НА ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"aext_3","type":"table","label":"Прайс-лист","content":"Наименование;Ед. изм.;Цена, руб.\nВынос строительного мусора;1 услуга;500\nПодключение мойки;1 услуга;1 500\nМонтаж встроенной техники;1 ед.;1 000\nУстановка карниза;1 пог.м;300\nМонтаж подсветки;1 услуга;800\nРегулировка петель (выезд);1 услуга;500","enabled":true},
    {"id":"aext_4","type":"paragraph","label":"Примечание","content":"* Стоимость дополнительных услуг определяется по факту выполнения.","enabled":true},
    {"id":"aext_5","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
    {"id":"aext_6","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);

-- rules (Правила эксплуатации)
INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5', 'rules', 'Основной шаблон', true,
  '[
    {"id":"rul_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 3 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}","enabled":true,"align":"right"},
    {"id":"rul_2","type":"header","label":"Заголовок","content":"«ПРАВИЛА ЭКСПЛУАТАЦИИ МЕБЕЛИ»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"rul_3","type":"section","label":"Раздел 1","content":"1. ОБЩИЕ УСЛОВИЯ","enabled":true,"bold":true,"align":"left"},
    {"id":"rul_4","type":"paragraph","label":"1.1","content":"1.1. Срок службы мебели при соблюдении настоящих правил — не менее 10 лет.","enabled":true,"align":"justify"},
    {"id":"rul_5","type":"paragraph","label":"1.2","content":"1.2. Гарантийный срок на корпус — 18 месяцев, на фурнитуру — 12 месяцев с даты подписания Акта выполненных работ.","enabled":true,"align":"justify"},
    {"id":"rul_6","type":"section","label":"Раздел 2","content":"2. УСЛОВИЯ ЭКСПЛУАТАЦИИ","enabled":true,"bold":true,"align":"left"},
    {"id":"rul_7","type":"paragraph","label":"2.1","content":"2.1. Не допускается воздействие на мебель температур выше +70°С и ниже −10°С.","enabled":true,"align":"justify"},
    {"id":"rul_8","type":"paragraph","label":"2.2","content":"2.2. Не допускается длительное воздействие влаги на торцы и поверхности корпуса.","enabled":true,"align":"justify"},
    {"id":"rul_9","type":"paragraph","label":"2.3","content":"2.3. Рекомендуется поддерживать влажность воздуха 45–70% и температуру +15…+25°С.","enabled":true,"align":"justify"},
    {"id":"rul_10","type":"paragraph","label":"2.4","content":"2.4. Не допускается применение абразивных, спиртосодержащих и агрессивных чистящих средств.","enabled":true,"align":"justify"},
    {"id":"rul_11","type":"section","label":"Раздел 3","content":"3. УХОД ЗА МЕБЕЛЬЮ","enabled":true,"bold":true,"align":"left"},
    {"id":"rul_12","type":"paragraph","label":"3.1","content":"3.1. Для чистки использовать мягкую влажную ткань. После протирания насухо вытереть поверхность.","enabled":true,"align":"justify"},
    {"id":"rul_13","type":"paragraph","label":"3.2","content":"3.2. Фасады из МДФ и плёнки ПВХ чистить нейтральными моющими средствами без растворителей.","enabled":true,"align":"justify"},
    {"id":"rul_14","type":"section","label":"Раздел 4","content":"4. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА","enabled":true,"bold":true,"align":"left"},
    {"id":"rul_15","type":"paragraph","label":"4.1","content":"4.1. Гарантия не распространяется на: повреждения от неправильной эксплуатации; механические повреждения; следы от горячей посуды и бытовой химии.","enabled":true,"align":"justify"},
    {"id":"rul_16","type":"paragraph","label":"4.2","content":"4.2. При обнаружении дефектов в гарантийный период обратиться к менеджеру для составления акта осмотра.","enabled":true,"align":"justify"},
    {"id":"rul_17","type":"paragraph","label":"Подпись клиента","content":"С правилами эксплуатации ознакомлен(а) и согласен(на):\n\n{{имя_клиента}}\n\nПодпись: ______________________________        Дата: _____________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);

-- tech (Технический проект)
INSERT INTO t_p24868917_kitchen_cost_calcula.doc_templates (user_id, doc_type, name, is_default, blocks, settings)
VALUES (
  '5', 'tech', 'Основной шаблон', true,
  '[
    {"id":"tech_1","type":"paragraph","label":"Ссылка на договор","content":"Приложение № 1 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}","enabled":true,"align":"right"},
    {"id":"tech_2","type":"header","label":"Заголовок","content":"«Технический проект»","enabled":true,"bold":true,"align":"center","fontSize":12},
    {"id":"tech_3","type":"table","label":"Характеристики материалов","content":"Корпус:;  ;Столешница:;  \nФасад 1:;  ;Стеновая панель:;  \nФасад 2:;  ;Подсветка:;  \nФрезеровка:;  ;  ;  ","enabled":true},
    {"id":"tech_4","type":"paragraph","label":"Фото проекта","content":"[Фото технического проекта размещается при генерации документа]","enabled":true,"align":"center"},
    {"id":"tech_5","type":"paragraph","label":"Реквизиты подрядчика","content":"Подрядчик: {{компания}}\n\nМенеджер: ______________________________\nМ.П.","enabled":true},
    {"id":"tech_6","type":"paragraph","label":"Реквизиты заказчика","content":"Заказчик: {{имя_клиента}}\n\nПодпись: ______________________________","enabled":true}
  ]'::jsonb,
  '{"fontSize": 9.5, "lineHeight": 1.0, "marginMm": 10}'::jsonb
);