-- Diagnostic SQL to check team members visibility issue
-- Run this in your Supabase SQL Editor to investigate the problem

-- 1. Check all team_members records
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  t.name as team_name,
  t.owner_id as team_owner,
  au.email as user_email
FROM team_members tm
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN auth.users au ON au.id = tm.user_id
ORDER BY tm.team_id, tm.joined_at;

-- 2. Check for duplicate team memberships (user in multiple teams)
SELECT
  user_id,
  COUNT(*) as team_count,
  ARRAY_AGG(team_id) as teams
FROM team_members
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 3. Check team_members RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'team_members';

-- 4. Test if you can see all team members for a specific team
-- Replace 'YOUR_TEAM_ID_HERE' with your actual team ID
-- SELECT
--   tm.*,
--   p.full_name,
--   p.email as profile_email
-- FROM team_members tm
-- LEFT JOIN profiles p ON p.id = tm.user_id
-- WHERE tm.team_id = 'YOUR_TEAM_ID_HERE'
-- ORDER BY tm.joined_at;

-- 5. Check profiles table accessibility
SELECT
  p.id,
  p.full_name,
  p.email,
  au.email as auth_email
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Check if profiles RLS is blocking access
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';
