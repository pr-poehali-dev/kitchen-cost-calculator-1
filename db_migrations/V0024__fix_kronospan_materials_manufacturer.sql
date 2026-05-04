-- 1. Восстанавливаем Kronospan (снимаем archived)
UPDATE t_p24868917_kitchen_cost_calcula.catalog_manufacturers 
SET archived = false 
WHERE id = 'mfr1777918562945';

-- 2. Переназначаем все материалы Kronospan с BOYARD на правильного производителя
UPDATE t_p24868917_kitchen_cost_calcula.catalog_materials 
SET manufacturer_id = 'mfr1777918562945'
WHERE name ILIKE '%kronospan%' AND manufacturer_id = 'mfr1777798559270';
