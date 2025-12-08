-- Migration: Add color and visibility columns to existing calendar_events table
-- Run this in Supabase SQL Editor if you already have a calendar_events table without these columns

-- Add color column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'color'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN color TEXT NULL CHECK (color IN ('red','orange','yellow','green','blue','purple'));
  END IF;
END $$;

-- Add visibility column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','custom'));
  END IF;
END $$;

-- Add created_by column if it doesn't exist (for collaboration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
    -- Note: You may want to update existing rows with actual user IDs
    -- ALTER TABLE calendar_events ALTER COLUMN created_by DROP DEFAULT;
  END IF;
END $$;

-- Create calendar_event_shared_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_event_shared_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Add indexes for shared users table
CREATE INDEX IF NOT EXISTS idx_cal_event_shared_event ON calendar_event_shared_users(event_id);
CREATE INDEX IF NOT EXISTS idx_cal_event_shared_user ON calendar_event_shared_users(user_id);

