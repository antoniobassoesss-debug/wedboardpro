-- Fix: Google Account in Multiple Teams
-- This user has 2 team memberships when they should have 1

-- Step 1: Identify which teams the Google user is in
SELECT
  tm.id as membership_id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  t.name as team_name,
  t.owner_id,
  (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) as total_members_in_team
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
ORDER BY tm.joined_at;

-- Step 2: See which team has the other 2 members
SELECT
  t.id as team_id,
  t.name as team_name,
  t.owner_id,
  COUNT(tm.id) as member_count,
  ARRAY_AGG(au.email) as member_emails
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
LEFT JOIN auth.users au ON au.id = tm.user_id
GROUP BY t.id, t.name, t.owner_id
HAVING COUNT(tm.id) >= 2  -- Teams with 2 or more members
ORDER BY member_count DESC;

-- Step 3: Once you identify the CORRECT team, delete the wrong membership
-- IMPORTANT: Replace 'WRONG_TEAM_ID' with the ID of the team that has only 1 member
-- DELETE FROM team_members
-- WHERE user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
--   AND team_id = 'WRONG_TEAM_ID';

-- Step 4: Verify the fix
-- After deleting the wrong membership, run this to verify:
-- SELECT
--   tm.*,
--   au.email,
--   (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) as team_size
-- FROM team_members tm
-- JOIN auth.users au ON au.id = tm.user_id
-- WHERE tm.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55';
