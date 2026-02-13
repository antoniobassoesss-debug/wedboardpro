-- Add missing permission columns to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_billing BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_usage BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_create_events BOOLEAN DEFAULT TRUE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_view_all_events BOOLEAN DEFAULT TRUE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS can_delete_events BOOLEAN DEFAULT FALSE;

-- Set all permissions to TRUE for owners
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

-- Verify columns now exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position;

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'team_members';

SELECT 'DONE - columns added and owner permissions set' as status;
