CREATE TABLE t_p24868917_kitchen_cost_calcula.doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  blocks JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);