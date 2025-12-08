-- Tasks table with assignee support
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for unassigned tasks
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_team_assignee ON tasks(team_id, assignee_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks from their teams
DROP POLICY IF EXISTS "Users can view team tasks" ON tasks;
CREATE POLICY "Users can view team tasks"
  ON tasks FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create tasks in their teams
DROP POLICY IF EXISTS "Users can create team tasks" ON tasks;
CREATE POLICY "Users can create team tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    AND (
      assignee_id IS NULL 
      OR assignee_id IN (
        SELECT user_id FROM team_members 
        WHERE team_id = tasks.team_id
      )
    )
  );

-- Policy: Users can update tasks in their teams (creator or assignee can update)
DROP POLICY IF EXISTS "Users can update team tasks" ON tasks;
CREATE POLICY "Users can update team tasks"
  ON tasks FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    AND (
      assignee_id IS NULL 
      OR assignee_id IN (
        SELECT user_id FROM team_members 
        WHERE team_id = tasks.team_id
      )
    )
  );

-- Policy: Users can delete tasks they created
DROP POLICY IF EXISTS "Users can delete their tasks" ON tasks;
CREATE POLICY "Users can delete their tasks"
  ON tasks FOR DELETE
  USING (created_by = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_tasks_updated_at();

