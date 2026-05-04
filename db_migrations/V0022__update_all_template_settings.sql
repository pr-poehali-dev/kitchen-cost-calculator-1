-- Обновляем настройки всех шаблонов: раздельные поля как в DOCX
UPDATE t_p24868917_kitchen_cost_calcula.doc_templates
SET settings = jsonb_build_object(
  'fontSize', 9.5,
  'lineHeight', 1.0,
  'marginLeft', CASE doc_type WHEN 'rules' THEN 15 ELSE 20 END,
  'marginRight', CASE doc_type WHEN 'rules' THEN 10 ELSE 10 END,
  'marginTop', 10,
  'marginBottom', 10,
  'orientation', 'portrait',
  'fontFamily', 'Times New Roman'
),
updated_at = now()
WHERE is_default = true;
