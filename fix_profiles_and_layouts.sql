-- Fix profiles table missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Verify the columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wedding_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key relationship from layouts to events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_layouts_event'
    AND table_name = 'layouts'
  ) THEN
    ALTER TABLE layouts
    ADD CONSTRAINT fk_layouts_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for layouts.event_id if not exists
CREATE INDEX IF NOT EXISTS idx_layouts_event_id ON layouts(event_id);

-- Verify layouts table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'layouts'
ORDER BY ordinal_position;

-- Verify events table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'events';
