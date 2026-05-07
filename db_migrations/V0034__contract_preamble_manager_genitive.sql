-- V0034: Заменяем {{менеджер}} на {{менеджер_рп}} в преамбуле договора
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = (
  SELECT jsonb_agg(
    CASE
      WHEN b->>'id' = 'intro' THEN
        jsonb_set(b, '{content}',
          to_jsonb(replace(b->>'content', '{{менеджер}}', '{{менеджер_рп}}'))
        )
      ELSE b
    END
  )
  FROM jsonb_array_elements(blocks) b
),
updated_at = now()
WHERE doc_type = 'contract' AND is_default = true;
