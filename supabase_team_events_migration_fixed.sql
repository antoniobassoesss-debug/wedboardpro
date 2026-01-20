-- Team Events Migration (Fixed - handles existing NULL values)
-- Run this in your Supabase SQL Editor

-- Step 1: Add team_id column (nullable - NULL means personal event)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Step 2: Add created_by column if it doesn't exist (as nullable first)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE events 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Backfill created_by for any existing NULL values
UPDATE events 
SET created_by = planner_id 
WHERE created_by IS NULL;

-- Step 4: Check if there are any NULLs left (should be 0)
-- If this query returns rows, you need to fix them manually
DO $$ 
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM events WHERE created_by IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with NULL created_by. Please fix these manually before continuing.', null_count;
  END IF;
END $$;

-- Step 5: Now make created_by NOT NULL (safe since all rows are backfilled)
DO $$ 
BEGIN
  -- Check current constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'created_by'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE events 
    ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_team_created_by ON events(team_id, created_by) WHERE team_id IS NOT NULL;

-- Step 7: Update RLS policies to support team events
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can view team and personal events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can update team and personal events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Users can delete team and personal events" ON events;

-- Policy: Users can view team events (if they're team members) OR their personal events
CREATE POLICY "Users can view team and personal events"
  ON events FOR SELECT
  USING (
    -- Team event: user must be a member of the team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = events.team_id 
      AND team_members.user_id = auth.uid()
    ))
    OR
    -- Personal event: user must be the creator
    (team_id IS NULL AND created_by = auth.uid())
  );

-- Policy: Users can create events (team or personal)
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (
    -- For team events: user must be a member of the team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = events.team_id 
      AND team_members.user_id = auth.uid()
    ))
    OR
    -- For personal events: user must be the creator
    (team_id IS NULL AND created_by = auth.uid())
  );

-- Policy: Users can update team events (if team member) OR their personal events
CREATE POLICY "Users can update team and personal events"
  ON events FOR UPDATE
  USING (
    -- Team event: user must be a member of the team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = events.team_id 
      AND team_members.user_id = auth.uid()
    ))
    OR
    -- Personal event: user must be the creator
    (team_id IS NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    -- Same conditions for the updated row
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = events.team_id 
      AND team_members.user_id = auth.uid()
    ))
    OR
    (team_id IS NULL AND created_by = auth.uid())
  );

-- Policy: Users can delete team events (if team member) OR their personal events
CREATE POLICY "Users can delete team and personal events"
  ON events FOR DELETE
  USING (
    -- Team event: user must be a member of the team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = events.team_id 
      AND team_members.user_id = auth.uid()
    ))
    OR
    -- Personal event: user must be the creator
    (team_id IS NULL AND created_by = auth.uid())
  );



