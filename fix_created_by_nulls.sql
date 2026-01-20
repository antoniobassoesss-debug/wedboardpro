-- Fix NULL created_by values before running the migration
-- Run this FIRST in your Supabase SQL Editor

-- Step 1: Check how many NULLs exist
SELECT COUNT(*) as null_count FROM events WHERE created_by IS NULL;

-- Step 2: Backfill NULL values with planner_id
UPDATE events 
SET created_by = planner_id 
WHERE created_by IS NULL;

-- Step 3: Verify all rows now have created_by set
SELECT COUNT(*) as remaining_nulls FROM events WHERE created_by IS NULL;
-- This should return 0

-- Step 4: If there are any events without a planner_id, you may need to set them manually
-- Check for problematic rows:
SELECT id, planner_id, created_by 
FROM events 
WHERE created_by IS NULL OR planner_id IS NULL;

