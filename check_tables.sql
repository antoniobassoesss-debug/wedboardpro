-- STEP 1: Just check what tables exist
SELECT '=== TABLES ===' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- STEP 2: Check if teams table exists
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'teams'
) THEN 'teams table EXISTS' ELSE 'teams table MISSING' END as teams_status;

-- STEP 3: Check if team_members table exists
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members'
) THEN 'team_members table EXISTS' ELSE 'team_members table MISSING' END as team_members_status;
