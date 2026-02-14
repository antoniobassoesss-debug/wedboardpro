-- Fix layouts foreign key issue
-- First, clear any invalid event_ids that don't exist in events table

-- Step 1: Set invalid event_ids to NULL in layouts
UPDATE layouts
SET event_id = NULL
WHERE event_id IS NOT NULL
AND event_id NOT IN (SELECT id FROM events);

-- Step 2: Now add the foreign key constraint safely
ALTER TABLE layouts
ADD CONSTRAINT IF NOT EXISTS fk_layouts_event
FOREIGN KEY (event_id)
REFERENCES events(id)
ON DELETE SET NULL;

-- Step 3: Create index for layouts.event_id
CREATE INDEX IF NOT EXISTS idx_layouts_event_id ON layouts(event_id);

-- Verify the fix
SELECT
  'layouts' as table_name,
  COUNT(*) as total_layouts,
  COUNT(event_id) as layouts_with_event,
  COUNT(*) - COUNT(event_id) as layouts_without_event
FROM layouts;

-- Check events table
SELECT
  'events' as table_name,
  COUNT(*) as total_events
FROM events;
