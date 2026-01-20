-- Wedding Guests schema for WedBoardPro
-- Run this in the Supabase SQL editor.

-- =========================================================
-- 1) Wedding Guests table (many per event/wedding)
-- =========================================================
CREATE TABLE IF NOT EXISTS wedding_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Guest Details
  guest_name TEXT NOT NULL CHECK (char_length(guest_name) >= 2),
  email TEXT,
  phone TEXT,

  -- Categorization
  side TEXT CHECK (side IS NULL OR side IN ('bride', 'groom', 'both')),
  guest_group TEXT CHECK (guest_group IS NULL OR guest_group IN ('family', 'friends', 'coworkers', 'other')),

  -- RSVP
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'yes', 'no')),

  -- Dietary Restrictions (array of predefined values)
  dietary_restrictions TEXT[] DEFAULT '{}' CHECK (
    array_length(dietary_restrictions, 1) IS NULL OR
    dietary_restrictions <@ ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_allergy', 'kosher', 'halal', 'other']::TEXT[]
  ),
  dietary_notes TEXT, -- For 'other' dietary restrictions

  -- Plus One
  plus_one_allowed BOOLEAN DEFAULT false,
  plus_one_name TEXT,

  -- Special Flags
  is_child BOOLEAN DEFAULT false,
  needs_accessibility BOOLEAN DEFAULT false,
  accessibility_notes TEXT,

  -- Gift Tracking
  gift_received BOOLEAN DEFAULT false,
  gift_notes TEXT,

  -- Seating (future feature)
  table_assignment INTEGER,

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 2) Indexes for fast filtering
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_wedding_guests_event_id ON wedding_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_rsvp_status ON wedding_guests(event_id, rsvp_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_guests_side ON wedding_guests(event_id, side) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_guests_group ON wedding_guests(event_id, guest_group) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_guests_dietary ON wedding_guests USING GIN(dietary_restrictions) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_guests_accessibility ON wedding_guests(event_id) WHERE needs_accessibility = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_guests_children ON wedding_guests(event_id) WHERE is_child = true AND deleted_at IS NULL;

-- =========================================================
-- 3) Auto-update updated_at timestamp trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_wedding_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wedding_guests_updated_at ON wedding_guests;
CREATE TRIGGER trg_wedding_guests_updated_at
  BEFORE UPDATE ON wedding_guests
  FOR EACH ROW
  EXECUTE FUNCTION set_wedding_guests_updated_at();

-- =========================================================
-- 4) Enable Realtime for this table
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE wedding_guests;

-- =========================================================
-- 5) RLS Policies (match existing event access patterns)
-- =========================================================
ALTER TABLE wedding_guests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view guests for events they have access to
CREATE POLICY "Users can view guests for accessible events"
ON wedding_guests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_guests.event_id
    AND (
      e.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
      OR e.created_by = auth.uid()
    )
  )
);

-- Policy: Users can insert guests for events they have access to
CREATE POLICY "Users can insert guests for accessible events"
ON wedding_guests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_guests.event_id
    AND (
      e.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
      OR e.created_by = auth.uid()
    )
  )
);

-- Policy: Users can update guests for events they have access to
CREATE POLICY "Users can update guests for accessible events"
ON wedding_guests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_guests.event_id
    AND (
      e.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
      OR e.created_by = auth.uid()
    )
  )
);

-- Policy: Users can delete guests for events they have access to
CREATE POLICY "Users can delete guests for accessible events"
ON wedding_guests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = wedding_guests.event_id
    AND (
      e.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
      OR e.created_by = auth.uid()
    )
  )
);
