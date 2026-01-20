-- Custom Vendor Categories for WedBoardPro
-- This allows planners to create their own vendor category types

-- 1) Create custom_vendor_categories table
CREATE TABLE IF NOT EXISTS custom_vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL, -- lowercase slug e.g. 'makeup', 'entertainment'
  label TEXT NOT NULL, -- display name e.g. 'Makeup', 'Entertainment'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(planner_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_vendor_categories_planner_id ON custom_vendor_categories(planner_id);

-- 2) Remove the CHECK constraint on suppliers.category to allow custom categories
ALTER TABLE suppliers
DROP CONSTRAINT IF EXISTS suppliers_category_check;

-- 3) Remove the CHECK constraint on event_suppliers.status and add the new one
ALTER TABLE event_suppliers
DROP CONSTRAINT IF EXISTS event_suppliers_status_check;

ALTER TABLE event_suppliers
ADD CONSTRAINT event_suppliers_status_check
CHECK (status IN (
  'potential',
  'contacted',
  'quote_requested',
  'quote_received',
  'negotiating',
  'confirmed',
  'paid_completed',
  'declined_lost'
));

-- Note: Categories are no longer constrained at the database level.
-- The application will validate against preset + custom categories.
