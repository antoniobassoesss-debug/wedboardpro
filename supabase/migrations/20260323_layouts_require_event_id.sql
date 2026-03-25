-- Remove orphaned layout rows that have no event_id.
-- These were created before event-scoped saving was enforced.
-- Run this AFTER confirming all active layouts have been migrated.
DELETE FROM layouts WHERE event_id IS NULL;

-- Prevent future saves without an event_id.
ALTER TABLE layouts ALTER COLUMN event_id SET NOT NULL;
