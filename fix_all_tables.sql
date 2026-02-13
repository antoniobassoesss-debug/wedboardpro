-- ============================================
-- COMPREHENSIVE DATABASE FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check existing tables
SELECT 'Checking tables...' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 2. Create tasks table if missing
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_flagged BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);

-- 3. Create notifications table if missing
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_team_id ON notifications(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 4. Create events table if missing
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- 5. Create pipeline_stages table if missing
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  probability INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_team_id ON pipeline_stages(team_id);

-- 6. Create stage_tasks table if missing
CREATE TABLE IF NOT EXISTS stage_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_tasks_stage_id ON stage_tasks(stage_id);

-- 7. Create deals table if missing
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  title TEXT NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  probability INTEGER DEFAULT 0,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  source TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_team_id ON deals(team_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);

-- 8. Ensure team_members has proper permissions columns
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_billing BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_usage BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_create_events BOOLEAN DEFAULT TRUE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_all_events BOOLEAN DEFAULT TRUE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_delete_events BOOLEAN DEFAULT FALSE;

-- 9. Fix team_members RLS policy
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can insert" ON team_members;
CREATE POLICY "Team members can insert"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. Fix teams RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 11. Ensure owner has all permissions
UPDATE team_members
SET
  can_view_billing = TRUE,
  can_manage_billing = TRUE,
  can_view_usage = TRUE,
  can_manage_team = TRUE,
  can_manage_settings = TRUE,
  can_create_events = TRUE,
  can_view_all_events = TRUE,
  can_delete_events = TRUE
WHERE role = 'owner';

-- 12. Verify data
SELECT '=== VERIFICATION ===' as status;

SELECT 'Teams:' as table_name, COUNT(*) as count FROM teams;
SELECT 'Team Members:' as table_name, COUNT(*) as count FROM team_members;
SELECT 'Tasks:' as table_name, COUNT(*) as count FROM tasks;
SELECT 'Notifications:' as table_name, COUNT(*) as count FROM notifications;
SELECT 'Events:' as table_name, COUNT(*) as count FROM events;
SELECT 'Pipeline Stages:' as table_name, COUNT(*) as count FROM pipeline_stages;
SELECT 'Deals:' as table_name, COUNT(*) as count FROM deals;

SELECT '=== TEAM MEMBERS ===' as status;
SELECT t.name as team_name, tm.role, tm.user_id, tm.joined_at
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
ORDER BY t.name, tm.joined_at;

SELECT '=== DONE ===' as status;
