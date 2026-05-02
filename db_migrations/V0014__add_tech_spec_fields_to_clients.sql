ALTER TABLE t_p24868917_kitchen_cost_calcula.clients
  ADD COLUMN IF NOT EXISTS tech_korpus          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_fasad1          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_fasad2          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_stoleshniza     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_stenovaya       text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_podsvetka_type  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_podsvetka_svet  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_frezerovka      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tech_image_url       text NOT NULL DEFAULT '';
