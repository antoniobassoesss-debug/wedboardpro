-- Teams module extensions for WedBoardPro
-- Run this in your Supabase SQL editor (separately from supabase_team_schema.sql).
-- This file assumes the core `teams`, `team_members`, `events`, and `stage_tasks`
-- tables already exist.

-- 1) Extend team_members with optional fields useful for the Teams tab
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS position TEXT; -- e.g. 'lead_planner', 'assistant', etc.

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC; -- optional billing rate

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS notes TEXT;


-- 2) Team member permissions / capabilities inside the workspace
CREATE TABLE IF NOT EXISTS team_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  can_edit_events BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_budget BOOLEAN NOT NULL DEFAULT FALSE,
  can_invite_members BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_member_permissions_member_id
  ON team_member_permissions(team_member_id);


-- 3) Assignments linking team members to events (wedding projects)
CREATE TABLE IF NOT EXISTS event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_in_event TEXT NOT NULL, -- e.g. "Day-of coordinator", "Design lead"
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_assignments_event_id
  ON event_assignments(event_id);

CREATE INDEX IF NOT EXISTS idx_event_assignments_team_member_id
  ON event_assignments(team_member_id);


-- 4) Simple availability calendar per team member
CREATE TABLE IF NOT EXISTS team_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'busy', 'on_leave')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_member_id, date)
);

CREATE INDEX IF NOT EXISTS idx_team_availability_member_date
  ON team_availability(team_member_id, date);

CREATE INDEX IF NOT EXISTS idx_team_availability_date
  ON team_availability(date);


-- Note:
-- These tables are intended to be accessed primarily via the backend service client,
-- with authorization enforced in the API layer using the current authenticated user
-- and their team membership. If you later introduce direct client-side Supabase
-- access to these tables, consider adding RLS policies similar to those used for
-- `tasks` and `messages`, scoping rows by the user's team.


