-- ============================================================================
-- TEAM ARCHITECTURE MIGRATION
-- Adds granular permissions to team_members and team_invitations
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add new permission columns to team_members
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_billing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_usage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_events BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_view_all_events BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_delete_events BOOLEAN DEFAULT FALSE;

-- Step 2: Add is_owner column (replaces role='owner' check)
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- Step 3: Migrate existing role='owner' to is_owner=true and grant all permissions
UPDATE team_members
SET is_owner = TRUE,
    can_view_billing = TRUE,
    can_manage_billing = TRUE,
    can_view_usage = TRUE,
    can_manage_team = TRUE,
    can_manage_settings = TRUE,
    can_create_events = TRUE,
    can_view_all_events = TRUE,
    can_delete_events = TRUE
WHERE role = 'owner';

-- Step 4: Migrate existing permissions from team_member_permissions table
-- Map: can_edit_events -> can_create_events
-- Map: can_view_financials -> can_view_billing
-- Map: can_invite_members -> can_manage_team
UPDATE team_members tm
SET
    can_create_events = COALESCE(tmp.can_edit_events, tm.can_create_events),
    can_view_billing = COALESCE(tmp.can_view_financials, tm.can_view_billing),
    can_manage_team = COALESCE(tmp.can_invite_members, tm.can_manage_team)
FROM team_member_permissions tmp
WHERE tm.id = tmp.team_member_id
  AND tm.is_owner = FALSE;

-- Step 5: Add permission columns to team_invitations (pre-set for invites)
ALTER TABLE team_invitations
ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_billing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_usage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_events BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_view_all_events BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_delete_events BOOLEAN DEFAULT FALSE;

-- Step 6: Add invited_by tracking to team_members (for audit)
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Step 7: Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_team_members_permissions
ON team_members(team_id, user_id, is_owner);

-- Step 8: Update RLS policies for new permission columns
-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Allow members to see permissions of their teammates
CREATE POLICY "team_members_select_policy" ON team_members
FOR SELECT USING (
    team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
);

-- Only owners or can_manage_team can update member permissions
CREATE POLICY "team_members_update_policy" ON team_members
FOR UPDATE USING (
    team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = auth.uid()
        AND (tm.is_owner = TRUE OR tm.can_manage_team = TRUE)
    )
);

-- Only owners or can_manage_team can delete members
CREATE POLICY "team_members_delete_policy" ON team_members
FOR DELETE USING (
    team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = auth.uid()
        AND (tm.is_owner = TRUE OR tm.can_manage_team = TRUE)
    )
    -- Cannot delete yourself if you're the owner
    AND NOT (user_id = auth.uid() AND is_owner = TRUE)
);

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after the migration to verify it worked
-- ============================================================================

-- Check team_members has new columns and data migrated
SELECT
    'team_members stats' as check_type,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE is_owner = TRUE) as owners,
    COUNT(*) FILTER (WHERE can_manage_team = TRUE) as can_manage_team,
    COUNT(*) FILTER (WHERE can_view_billing = TRUE) as can_view_billing,
    COUNT(*) FILTER (WHERE can_create_events = TRUE) as can_create_events
FROM team_members;

-- Check team_invitations has new columns
SELECT
    'team_invitations stats' as check_type,
    COUNT(*) as total_invites,
    COUNT(*) FILTER (WHERE can_create_events = TRUE) as default_create_events
FROM team_invitations;

-- Sample of team_members with new permissions
SELECT
    tm.id,
    p.full_name,
    tm.role,
    tm.is_owner,
    tm.can_view_billing,
    tm.can_manage_team,
    tm.can_create_events,
    tm.can_delete_events
FROM team_members tm
LEFT JOIN profiles p ON p.id = tm.user_id
LIMIT 10;
