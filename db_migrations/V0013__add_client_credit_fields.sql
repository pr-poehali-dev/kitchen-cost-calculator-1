ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS credit_contract_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credit_contract_date    DATE,
  ADD COLUMN IF NOT EXISTS credit_bank             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credit_prepaid          NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_balance          NUMERIC(12,2) NOT NULL DEFAULT 0;
