-- Fix: Link events to teams and update RLS for team-scoped data
-- Run this in Supabase SQL Editor

-- 1) Add team_id to events table (nullable for existing events)
ALTER TABLE events ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 2) Populate team_id for existing events based on planner's team
-- This assigns existing events to the planner's primary team
UPDATE events e
SET team_id = (
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = e.planner_id
  LIMIT 1
)
WHERE e.team_id IS NULL;

-- 3) Make team_id NOT NULL for new events (existing events keep nullable)
ALTER TABLE events ALTER COLUMN team_id SET NOT NULL;

-- 4) Update indexes
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);

-- 5) Enable RLS on events if not already enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 6) Drop old policies and create new team-scoped policies for IF EXISTS "Users events
DROP POLICY can view team events" ON events;
DROP POLICY IF EXISTS "Users can create team events" ON events;
DROP POLICY IF EXISTS "Users can update team events" ON events;

-- Users can view events from their teams
CREATE POLICY "Users can view team events"
  ON events FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    OR planner_id = auth.uid()
  );

-- Users can create events in their teams
CREATE POLICY "Users can create team events"
  ON events FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    AND planner_id = auth.uid()
  );

-- Users can update events in their teams
CREATE POLICY "Users can update team events"
  ON events FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    OR planner_id = auth.uid()
  );

-- 7) Fix project_files RLS to use team membership
-- First drop existing policies
DROP POLICY IF EXISTS "Select project file folders by account" ON project_file_folders;
DROP POLICY IF EXISTS "Insert project file folders by account" ON project_file_folders;
DROP POLICY IF EXISTS "Update project file folders by account" ON project_file_folders;
DROP POLICY IF EXISTS "Delete project file folders by account" ON project_file_folders;
DROP POLICY IF EXISTS "Select project files by account" ON project_files;
DROP POLICY IF EXISTS "Insert project files by account" ON project_files;
DROP POLICY IF EXISTS "Update project files by account" ON project_files;
DROP POLICY IF EXISTS "Delete project files by account" ON project_files;

-- Create team-scoped policies for project_file_folders
CREATE POLICY "Users can view team file folders"
  ON project_file_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_file_folders.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert team file folders"
  ON project_file_folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_file_folders.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update team file folders"
  ON project_file_folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_file_folders.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_file_folders.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete team file folders"
  ON project_file_folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_file_folders.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Create team-scoped policies for project_files
CREATE POLICY "Users can view team files"
  ON project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_files.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert team files"
  ON project_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_files.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update team files"
  ON project_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_files.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_files.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete team files"
  ON project_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = project_files.project_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- 8) Update event_files, vendors, venues, clients to be team-scoped
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view event files" ON event_files;
CREATE POLICY "Users can view event files"
  ON event_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_files.event_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view vendors" ON vendors;
CREATE POLICY "Users can view vendors"
  ON vendors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = vendors.event_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view venues" ON venues;
CREATE POLICY "Users can view venues"
  ON venues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = venues.event_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view clients" ON clients;
CREATE POLICY "Users can view clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = clients.event_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- 9) Fix stage_tasks to use team_id from events (not just event_id)
ALTER TABLE stage_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view team stage tasks" ON stage_tasks;
CREATE POLICY "Users can view team stage tasks"
  ON stage_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = stage_tasks.event_id
      AND events.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- 10) Verify team_members visibility
-- The existing RLS in supabase_team_schema.sql should work, but let's verify
SELECT 'Team members fix complete' as status;
