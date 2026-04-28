ALTER TABLE t_p24868917_kitchen_cost_calcula.app_state
  ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Существующую единственную запись оставляем как есть (потом разберём вручную)
-- Делаем уникальный индекс по user_id
CREATE UNIQUE INDEX IF NOT EXISTS app_state_user_id_idx
  ON t_p24868917_kitchen_cost_calcula.app_state (user_id)
  WHERE user_id IS NOT NULL;
