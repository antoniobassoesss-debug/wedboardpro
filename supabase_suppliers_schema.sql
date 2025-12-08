-- Suppliers / Vendors schema for WedBoardPro
-- Run this in your Supabase SQL editor.

-- 1) Global suppliers directory
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('flowers','decor','catering','music','photo','video','venue','cake','transport','others')),
  company_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  notes TEXT,
  rating_internal INTEGER CHECK (rating_internal >= 1 AND rating_internal <= 5),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_planner_id ON suppliers(planner_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_favorite ON suppliers(is_favorite);


-- 2) Supplier files (contracts, price lists, portfolios, etc.)
CREATE TABLE IF NOT EXISTS supplier_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('contract','price_list','portfolio','other')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_files_supplier_id ON supplier_files(supplier_id);


-- 3) Event-specific suppliers (link suppliers ↔ events)
CREATE TABLE IF NOT EXISTS event_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- e.g. 'flowers', 'music'
  status TEXT NOT NULL DEFAULT 'researched' CHECK (
    status IN ('researched','quote_requested','quote_received','shortlisted','selected','rejected')
  ),
  quoted_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_suppliers_event_id ON event_suppliers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_suppliers_supplier_id ON event_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_event_suppliers_category ON event_suppliers(category);
CREATE INDEX IF NOT EXISTS idx_event_suppliers_status ON event_suppliers(status);


-- 4) Optional versioned quotes per event supplier
CREATE TABLE IF NOT EXISTS event_supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_supplier_id UUID NOT NULL REFERENCES event_suppliers(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL, -- e.g. 'Initial', 'Revised', 'Final'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_supplier_quotes_supplier_id ON event_supplier_quotes(event_supplier_id);


-- 5) updated_at trigger for suppliers
CREATE OR REPLACE FUNCTION set_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION set_suppliers_updated_at();


-- Note: RLS policies are not added here because the application uses
-- the Supabase service role on the backend. If you later expose these
-- tables directly to the client, add RLS to scope rows by planner_id
-- and the events the current user is allowed to see.


