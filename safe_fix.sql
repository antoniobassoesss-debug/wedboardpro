-- ============================================
-- SAFE DATABASE FIX - Run step by step
-- ============================================

-- STEP 1: Check what tables exist
SELECT '=== EXISTING TABLES ===' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- STEP 2: Check teams table structure
SELECT '=== TEAMS TABLE ===' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;

-- STEP 3: Check team_members table structure  
SELECT '=== TEAM_MEMBERS TABLE ===' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position;

-- STEP 4: Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  can_view_billing BOOLEAN DEFAULT FALSE,
  can_manage_billing BOOLEAN DEFAULT FALSE,
  can_view_usage BOOLEAN DEFAULT FALSE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  can_create_events BOOLEAN DEFAULT TRUE,
  can_view_all_events BOOLEAN DEFAULT TRUE,
  can_delete_events BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- STEP 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- STEP 7: Create tasks table
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

-- STEP 8: Create notifications table
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
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- STEP 9: Create events table
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

-- STEP 10: Create pipeline_stages table
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

-- STEP 11: Create deals table
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

-- STEP 12: Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- STEP 13: Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- STEP 14: Add team_id column to other tables if needed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- STEP 15: Verify
SELECT '=== VERIFICATION ===' as status;
SELECT 'Teams:' as table_name, COUNT(*) as count FROM teams;
SELECT 'Team Members:' as table_name, COUNT(*) as count FROM team_members;
SELECT 'Tasks:' as table_name, COUNT(*) as count FROM tasks;
SELECT 'Notifications:' as table_name, COUNT(*) as count FROM notifications;
SELECT 'Events:' as table_name, COUNT(*) as count FROM events;

SELECT '=== YOUR TEAMS ===' as status;
SELECT t.name as team_name, t.owner_id, tm.role, tm.joined_at
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
ORDER BY t.created_at;
