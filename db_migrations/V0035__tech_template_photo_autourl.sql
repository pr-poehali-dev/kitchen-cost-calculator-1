-- V0035: Обновляем блок фото в шаблоне техпроекта — автофото из карточки, большой размер
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET blocks = (
  SELECT jsonb_agg(
    CASE
      WHEN b->>'id' = 'photo' THEN
        b
        || jsonb_build_object('content', '{{фото_проекта}}')
        || jsonb_build_object('imageWidth',  170)
        || jsonb_build_object('imageHeight', 100)
        || jsonb_build_object('align', 'center')
      ELSE b
    END
  )
  FROM jsonb_array_elements(blocks) b
),
updated_at = now()
WHERE doc_type = 'tech' AND is_default = true;
