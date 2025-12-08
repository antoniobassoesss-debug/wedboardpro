-- Calendar events schema (run in Supabase SQL Editor)
-- Defines a production-ready calendar_events table with basic indexes and updated_at trigger.

-- 1) Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL, -- FK to your account/workspace table
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT NOT NULL DEFAULT 'event', -- e.g. event | task | meeting
  project_id UUID NULL, -- optional FK to projects/pipeline
  status TEXT NOT NULL DEFAULT 'planned', -- planned | confirmed | done | cancelled
  color TEXT NULL CHECK (color IN ('red','orange','yellow','green','blue','purple')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_account_start ON calendar_events(account_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_account_end ON calendar_events(account_id, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility ON calendar_events(visibility);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION set_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_calendar_events_updated_at();

-- 4) Shared users table for custom visibility
CREATE TABLE IF NOT EXISTS calendar_event_shared_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_event_shared_event ON calendar_event_shared_users(event_id);
CREATE INDEX IF NOT EXISTS idx_cal_event_shared_user ON calendar_event_shared_users(user_id);

-- 4) (Optional) RLS — adjust to your auth model.
-- Uncomment and tailor to your account/session model.
-- ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "cal_ev_read" ON calendar_events;
-- CREATE POLICY "cal_ev_read" ON calendar_events
--   FOR SELECT USING (account_id = auth.uid());
-- DROP POLICY IF EXISTS "cal_ev_write" ON calendar_events;
-- CREATE POLICY "cal_ev_write" ON calendar_events
--   FOR INSERT WITH CHECK (account_id = auth.uid());
-- DROP POLICY IF EXISTS "cal_ev_update" ON calendar_events;
-- CREATE POLICY "cal_ev_update" ON calendar_events
--   FOR UPDATE USING (account_id = auth.uid()) WITH CHECK (account_id = auth.uid());
-- DROP POLICY IF EXISTS "cal_ev_delete" ON calendar_events;
-- CREATE POLICY "cal_ev_delete" ON calendar_events
--   FOR DELETE USING (account_id = auth.uid());

