-- Supabase Realtime row-level filters require REPLICA IDENTITY FULL so that
-- the full row (including event_id) is written to the WAL on UPDATE events.
-- Without this, the filter event_id=eq.<uuid> silently drops all events.
ALTER TABLE layouts REPLICA IDENTITY FULL;
