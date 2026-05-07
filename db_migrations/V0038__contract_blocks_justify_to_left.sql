-- V0038: Меняем align justify → left во всех paragraph-блоках шаблона договора
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = (
  SELECT jsonb_agg(
    CASE
      WHEN b->>'type' = 'paragraph' AND b->>'align' = 'justify' THEN
        jsonb_set(b, '{align}', '"left"')
      ELSE b
    END
  )
  FROM jsonb_array_elements(blocks) b
),
updated_at = now()
WHERE doc_type = 'contract' AND is_default = true;
