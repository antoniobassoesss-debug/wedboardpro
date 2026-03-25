-- Drop the unique constraint that incorrectly limits each event to one layout.
-- Events can have multiple layouts (one per tab/project), so this constraint
-- must be removed to support the multi-layout architecture.
ALTER TABLE layouts DROP CONSTRAINT IF EXISTS layouts_event_id_unique;
