-- Team-shared Suppliers Migration
-- Adds team_id, created_by, and visibility columns to suppliers table for team sharing
-- Run this in your Supabase SQL Editor

-- Step 1: Add team_id column (nullable - NULL means private or no team)
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Step 2: Add created_by column if it doesn't exist (as nullable first)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Add visibility column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('team', 'private'));
  END IF;
END $$;

-- Step 4: Backfill created_by for any existing NULL values
UPDATE suppliers 
SET created_by = planner_id 
WHERE created_by IS NULL;

-- Step 5: Check if there are any NULLs left (should be 0)
DO $$ 
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM suppliers WHERE created_by IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with NULL created_by. Please fix these manually before continuing.', null_count;
  END IF;
END $$;

-- Step 6: Now make created_by NOT NULL (safe since all rows are backfilled)
DO $$ 
BEGIN
  -- Check current constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'created_by'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE suppliers 
    ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_team_visibility ON suppliers(team_id, visibility) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_created_visibility ON suppliers(created_by, visibility);

-- Note: Existing suppliers will have:
-- - created_by = planner_id (backfilled)
-- - team_id = NULL (not backfilled - safe default)
-- - visibility = 'private' (default, so existing suppliers remain private)



