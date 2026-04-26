CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'new',
  last_name TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone2 TEXT NOT NULL DEFAULT '',
  messenger TEXT NOT NULL DEFAULT 'WhatsApp',
  email TEXT NOT NULL DEFAULT '',
  passport_series TEXT NOT NULL DEFAULT '',
  passport_number TEXT NOT NULL DEFAULT '',
  passport_issued_by TEXT NOT NULL DEFAULT '',
  passport_issued_date TEXT NOT NULL DEFAULT '',
  passport_dept_code TEXT NOT NULL DEFAULT '',
  reg_city TEXT NOT NULL DEFAULT '',
  reg_street TEXT NOT NULL DEFAULT '',
  reg_house TEXT NOT NULL DEFAULT '',
  reg_apt TEXT NOT NULL DEFAULT '',
  delivery_city TEXT NOT NULL DEFAULT '',
  delivery_street TEXT NOT NULL DEFAULT '',
  delivery_house TEXT NOT NULL DEFAULT '',
  delivery_apt TEXT NOT NULL DEFAULT '',
  delivery_entrance TEXT NOT NULL DEFAULT '',
  delivery_floor TEXT NOT NULL DEFAULT '',
  delivery_elevator TEXT NOT NULL DEFAULT 'нет',
  delivery_note TEXT NOT NULL DEFAULT '',
  contract_number TEXT NOT NULL DEFAULT '',
  contract_date TEXT NOT NULL DEFAULT '',
  products JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT '100% предоплата',
  prepaid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  custom_payment_scheme TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL DEFAULT '',
  production_days INTEGER NOT NULL DEFAULT 0,
  assembly_days INTEGER NOT NULL DEFAULT 0,
  designer TEXT NOT NULL DEFAULT '',
  measurer TEXT NOT NULL DEFAULT '',
  project_ids JSONB NOT NULL DEFAULT '[]',
  reminder_date TEXT NOT NULL DEFAULT '',
  reminder_note TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS client_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  category TEXT NOT NULL DEFAULT 'measure',
  url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by INTEGER
);

CREATE TABLE IF NOT EXISTS client_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  user_id INTEGER,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_photos_client_id ON client_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_client_history_client_id ON client_history(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
