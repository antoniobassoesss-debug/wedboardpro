-- Wedding Budget schema for WedBoardPro
-- Run this in the Supabase SQL editor.

-- =========================================================
-- 1) Wedding Budgets table (one per event/wedding)
-- =========================================================
CREATE TABLE IF NOT EXISTS wedding_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Total Budget
  total_budget INTEGER NOT NULL DEFAULT 0, -- stored in cents
  currency TEXT DEFAULT 'EUR' CHECK (currency IN ('USD', 'EUR', 'GBP')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wedding_budgets_event_unique UNIQUE (event_id),
  CONSTRAINT total_budget_non_negative CHECK (total_budget >= 0)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_wedding_budgets_event_id ON wedding_budgets(event_id);

-- =========================================================
-- 2) Budget Categories table (many per wedding)
-- =========================================================
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Category Info
  category_name TEXT NOT NULL CHECK (
    category_name IN (
      'venue', 'catering', 'photography', 'videography', 'flowers',
      'music_dj', 'dress_attire', 'rings', 'invitations', 'favors',
      'transportation', 'accommodation', 'hair_makeup', 'cake',
      'decor', 'rentals', 'officiant', 'planner', 'other'
    )
  ),
  custom_name TEXT, -- For 'other' category or override display name

  -- Amounts (all in cents)
  budgeted_amount INTEGER NOT NULL DEFAULT 0,
  contracted_amount INTEGER, -- Actual vendor quote/contract (nullable)
  paid_amount INTEGER NOT NULL DEFAULT 0,

  -- Payment Schedule (JSONB array)
  -- Format: [{id: "uuid", amount: 500000, due_date: "2026-03-15", paid: false, paid_date: null, description: "Venue deposit"}]
  payment_schedule JSONB DEFAULT '[]'::jsonb,

  -- Vendor Link (future integration)
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  is_contracted BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT budgeted_amount_non_negative CHECK (budgeted_amount >= 0),
  CONSTRAINT contracted_amount_non_negative CHECK (contracted_amount IS NULL OR contracted_amount >= 0),
  CONSTRAINT paid_amount_non_negative CHECK (paid_amount >= 0)
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_budget_categories_event_id ON budget_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_category ON budget_categories(event_id, category_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_categories_vendor ON budget_categories(vendor_id) WHERE vendor_id IS NOT NULL;

-- =========================================================
-- 3) Auto-update updated_at timestamp triggers
-- =========================================================
CREATE OR REPLACE FUNCTION set_wedding_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wedding_budgets_updated_at ON wedding_budgets;
CREATE TRIGGER trg_wedding_budgets_updated_at
  BEFORE UPDATE ON wedding_budgets
  FOR EACH ROW
  EXECUTE FUNCTION set_wedding_budgets_updated_at();

CREATE OR REPLACE FUNCTION set_budget_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_categories_updated_at ON budget_categories;
CREATE TRIGGER trg_budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_budget_categories_updated_at();

-- =========================================================
-- 4) Enable Realtime for these tables
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE wedding_budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE budget_categories;

-- =========================================================
-- 5) RLS Policies (match existing event access patterns)
-- =========================================================
ALTER TABLE wedding_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Wedding Budgets Policies
CREATE POLICY "Users can view budgets for accessible events"
ON wedding_budgets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_budgets.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert budgets for accessible events"
ON wedding_budgets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_budgets.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can update budgets for accessible events"
ON wedding_budgets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_budgets.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

-- Budget Categories Policies
CREATE POLICY "Users can view categories for accessible events"
ON budget_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = budget_categories.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert categories for accessible events"
ON budget_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = budget_categories.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can update categories for accessible events"
ON budget_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = budget_categories.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete categories for accessible events"
ON budget_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = budget_categories.event_id
    AND (
      e.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      OR e.created_by = auth.uid()
    )
  )
);
