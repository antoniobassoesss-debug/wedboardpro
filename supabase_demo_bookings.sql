-- ============================================================
-- Demo Bookings Table for Landing Page
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  goal TEXT,
  team_size TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_date ON demo_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created ON demo_bookings(created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demo_bookings_updated_at ON demo_bookings;
CREATE TRIGGER trg_demo_bookings_updated_at
  BEFORE UPDATE ON demo_bookings
  FOR EACH ROW EXECUTE FUNCTION update_demo_bookings_updated_at();

-- RLS for demo_bookings
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;

-- Public can insert (for landing page bookings)
DROP POLICY IF EXISTS "Public can create demo bookings" ON demo_bookings;
CREATE POLICY "Public can create demo bookings"
  ON demo_bookings FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view all bookings (for admin access)
DROP POLICY IF EXISTS "Authenticated users can view demo bookings" ON demo_bookings;
CREATE POLICY "Authenticated users can view demo bookings"
  ON demo_bookings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Owner can update their own bookings
DROP POLICY IF EXISTS "Users can update their demo bookings" ON demo_bookings;
CREATE POLICY "Users can update their demo bookings"
  ON demo_bookings FOR UPDATE
  USING (auth.uid() = account_id);

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_demo_booking()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demo_bookings_soft_delete ON demo_bookings;
CREATE TRIGGER trg_demo_bookings_soft_delete
  BEFORE DELETE ON demo_bookings
  FOR EACH ROW EXECUTE FUNCTION soft_delete_demo_booking();
