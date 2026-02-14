-- Complete fix for layouts foreign key constraint

-- Step 1: Set invalid event_ids to NULL in layouts (cleans up bad data first)
UPDATE layouts
SET event_id = NULL
WHERE event_id IS NOT NULL
AND event_id NOT IN (SELECT id FROM events);

-- Step 2: Drop existing constraint if it exists (PostgreSQL doesn't support IF NOT EXISTS for ALTER TABLE ADD CONSTRAINT)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_layouts_event'
        AND table_name = 'layouts'
    ) THEN
        ALTER TABLE layouts DROP CONSTRAINT fk_layouts_event;
    END IF;
END $$;

-- Step 3: Add the foreign key constraint
ALTER TABLE layouts
ADD CONSTRAINT fk_layouts_event
FOREIGN KEY (event_id)
REFERENCES events(id)
ON DELETE SET NULL;

-- Step 4: Create index for layouts.event_id
CREATE INDEX IF NOT EXISTS idx_layouts_event_id ON layouts(event_id);

-- Verify the fix
SELECT
  'layouts' as table_name,
  COUNT(*) as total_layouts,
  COUNT(event_id) as layouts_with_event,
  COUNT(*) - COUNT(event_id) as layouts_without_event
FROM layouts;

-- Check events table exists
SELECT
  'events' as table_name,
  COUNT(*) as total_events
FROM events;
