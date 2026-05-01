CREATE TABLE IF NOT EXISTS catalog_manufacturers (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  telegram TEXT,
  website TEXT,
  note TEXT,
  material_type_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_manufacturers_user_id ON catalog_manufacturers(user_id);

CREATE TABLE IF NOT EXISTS catalog_vendors (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  telegram TEXT,
  website TEXT,
  note TEXT,
  material_type_ids JSONB NOT NULL DEFAULT '[]',
  delivery_days INTEGER,
  min_order_amount NUMERIC,
  delivery_schedule TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_vendors_user_id ON catalog_vendors(user_id);

CREATE TABLE IF NOT EXISTS catalog_materials (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  manufacturer_id TEXT NOT NULL,
  vendor_id TEXT,
  name TEXT NOT NULL,
  type_id TEXT NOT NULL,
  category_id TEXT,
  thickness NUMERIC,
  color TEXT,
  article TEXT,
  unit TEXT NOT NULL DEFAULT 'шт',
  base_price NUMERIC NOT NULL DEFAULT 0,
  variants JSONB NOT NULL DEFAULT '[]',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  price_updated_at TEXT,
  price_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_materials_user_id ON catalog_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_materials_manufacturer_id ON catalog_materials(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_catalog_materials_type_id ON catalog_materials(type_id);
CREATE INDEX IF NOT EXISTS idx_catalog_materials_article ON catalog_materials(article);
