-- Diagnostic: Check Google OAuth Account Team Membership
-- Run this in Supabase SQL Editor

-- 1. Check all users and their auth providers
SELECT
  au.id,
  au.email,
  au.created_at,
  au.app_metadata->>'provider' as auth_provider,
  au.raw_user_meta_data->>'full_name' as user_full_name,
  COUNT(tm.id) as team_memberships
FROM auth.users au
LEFT JOIN team_members tm ON tm.user_id = au.id
GROUP BY au.id, au.email, au.created_at, au.app_metadata, au.raw_user_meta_data
ORDER BY au.created_at;

-- 2. Check team_members records to see if Google account is there
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  au.email,
  au.app_metadata->>'provider' as provider
FROM team_members tm
LEFT JOIN auth.users au ON au.id = tm.user_id
ORDER BY tm.team_id, tm.joined_at;

-- 3. Test the RLS policy for each user
-- This will show if the policy works correctly
SELECT
  au.email,
  au.id as user_id,
  (
    SELECT COUNT(*)
    FROM team_members tm
    WHERE tm.team_id IN (
      SELECT tm2.team_id
      FROM team_members tm2
      WHERE tm2.user_id = au.id
    )
  ) as visible_members_count
FROM auth.users au
ORDER BY au.email;

-- 4. Check if there are any duplicate team memberships
SELECT
  user_id,
  team_id,
  COUNT(*) as count
FROM team_members
GROUP BY user_id, team_id
HAVING COUNT(*) > 1;
