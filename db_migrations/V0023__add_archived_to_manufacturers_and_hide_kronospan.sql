-- Добавляем поле archived в таблицу производителей
ALTER TABLE t_p24868917_kitchen_cost_calcula.catalog_manufacturers 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Помечаем пустой Kronospan как archived
UPDATE t_p24868917_kitchen_cost_calcula.catalog_manufacturers 
SET archived = true 
WHERE id = 'mfr1777918562945';
