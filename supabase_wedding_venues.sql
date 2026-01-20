-- Wedding Venues schema for WedBoardPro
-- Run this in the Supabase SQL editor.

-- =========================================================
-- 1) Wedding Venues table (one per event/wedding)
-- =========================================================
CREATE TABLE IF NOT EXISTS wedding_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Venue Details
  venue_name TEXT,
  venue_address TEXT,
  venue_latitude DECIMAL(10, 8),
  venue_longitude DECIMAL(11, 8),
  venue_capacity INTEGER,
  venue_type TEXT CHECK (
    venue_type IS NULL OR
    venue_type IN ('indoor', 'outdoor', 'both')
  ),

  -- Wedding Date (stored here for quick access, also on events table)
  wedding_date DATE,

  -- Venue Contact Info
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Site Visit Notes
  site_visit_notes TEXT,

  -- Contract
  contract_file_url TEXT,
  contract_status TEXT DEFAULT 'not_uploaded' CHECK (
    contract_status IN ('not_uploaded', 'pending', 'signed')
  ),

  -- Deposit Tracking (amount in cents)
  deposit_amount INTEGER DEFAULT 0,
  deposit_due_date DATE,
  deposit_paid_date DATE,

  -- Venue Restrictions (array of strings)
  restrictions TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wedding_venues_event_unique UNIQUE (event_id),
  CONSTRAINT restrictions_max_20 CHECK (
    array_length(restrictions, 1) IS NULL OR array_length(restrictions, 1) <= 20
  )
);

-- Index for fast lookup by event_id
CREATE INDEX IF NOT EXISTS idx_wedding_venues_event_id ON wedding_venues(event_id);

-- =========================================================
-- 2) Auto-update updated_at timestamp trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_wedding_venues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wedding_venues_updated_at ON wedding_venues;
CREATE TRIGGER trg_wedding_venues_updated_at
  BEFORE UPDATE ON wedding_venues
  FOR EACH ROW
  EXECUTE FUNCTION set_wedding_venues_updated_at();

-- =========================================================
-- 3) Enable Realtime for this table
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE wedding_venues;

-- =========================================================
-- 4) Create storage bucket for contracts (private)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-contracts', 'wedding-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 5) Storage policies for contract files
-- =========================================================

-- Allow authenticated users to upload contracts
CREATE POLICY "Authenticated users can upload venue contracts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wedding-contracts');

-- Allow authenticated users to read contracts (for download)
CREATE POLICY "Authenticated users can read venue contracts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wedding-contracts');

-- Allow authenticated users to update contracts
CREATE POLICY "Authenticated users can update venue contracts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wedding-contracts');

-- Allow authenticated users to delete contracts
CREATE POLICY "Authenticated users can delete venue contracts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wedding-contracts');
