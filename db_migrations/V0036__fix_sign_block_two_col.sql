-- V0036: Исправляем блок подписи — убираем пробелы, делаем two_col
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = (
  SELECT jsonb_agg(
    CASE
      WHEN b->>'id' = 's10_sign' THEN
        b
        || '{"type":"two_col"}'::jsonb
        || jsonb_build_object('content', '(подпись)' || chr(10) || '_________________________' || chr(10) || '---' || chr(10) || '(расшифровка подписи от руки)' || chr(10) || '_________________________')
      ELSE b
    END
  )
  FROM jsonb_array_elements(blocks) b
),
updated_at = now()
WHERE doc_type = 'contract' AND is_default = true;
