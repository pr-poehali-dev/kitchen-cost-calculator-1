-- V0033: Заменяем два отдельных блока реквизитов на один two_col (фирма слева, клиент справа)
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = (
  SELECT jsonb_agg(b ORDER BY rn)
  FROM (
    SELECT
      CASE
        WHEN b->>'id' = 's11_req' THEN
          jsonb_build_object(
            'id',      's11_cols',
            'type',    'two_col',
            'label',   'Реквизиты сторон',
            'enabled', true,
            'align',   'left',
            'content',
            E'Подрядчик:\n{{компания}}\nИНН/КПП: {{инн_кпп}}\nОГРН: {{огрн}}\nЮридический и фактический адрес: {{адрес_компании}}\nБанковские реквизиты:\n{{банк}}\nБИК: {{бик}}\nРас/с: {{расчётный_счёт}}\nКорп/с: {{корр_счёт}}\nТелефон: {{телефон_компании}}\nE-mail: {{email_компании}}\n\nМенеджер:\n{{менеджер}}\n\n_________________________          М.П.\n---\nЗаказчик:\n{{имя_клиента}}\nПаспорт. Серия, номер:\n{{паспорт}}\nКем выдан:\n{{паспорт_выдан}}\n\nАдрес прописки:\n{{адрес_регистрации}}\n\nТелефон:\n{{телефон_клиента}}\nПредпочитаемый канал обмена сообщениями:\n{{мессенджер}}\n\n\n_________________________'
          )
        WHEN b->>'id' = 's11_client' THEN NULL
        ELSE b
      END AS b,
      rn
    FROM jsonb_array_elements(blocks) WITH ORDINALITY AS t(b, rn)
  ) sub
  WHERE b IS NOT NULL
),
updated_at = now()
WHERE doc_type = 'contract' AND is_default = true;
