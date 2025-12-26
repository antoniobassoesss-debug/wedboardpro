-- QUICK FIX: Remove duplicate team membership for Google account
-- This automatically identifies and fixes the issue

-- Step 1: Find which teams the Google user is in and which one has MORE members
WITH user_teams AS (
  SELECT
    tm.id as membership_id,
    tm.team_id,
    tm.joined_at,
    t.name as team_name,
    (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) as team_size
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
  ORDER BY team_size DESC, tm.joined_at ASC
)
SELECT
  'User is in these teams:' as info,
  membership_id,
  team_id,
  team_name,
  team_size,
  joined_at,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY team_size DESC, joined_at ASC) = 1
    THEN '✓ KEEP (largest team)'
    ELSE '✗ DELETE (smaller team)'
  END as action
FROM user_teams;

-- Step 2: DELETE the membership from the SMALLER team
-- The user should be in the team with MORE members (3 members, not 1)
DELETE FROM team_members
WHERE user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
  AND team_id IN (
    -- Find the team with FEWER members
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
    GROUP BY tm.team_id
    HAVING (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) < (
      -- Compare to the largest team this user is in
      SELECT MAX(team_size)
      FROM (
        SELECT (SELECT COUNT(*) FROM team_members WHERE team_id = tm2.team_id) as team_size
        FROM team_members tm2
        WHERE tm2.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55'
      ) sizes
    )
  );

-- Step 3: Verify the fix
SELECT
  'After fix - user memberships:' as status,
  tm.team_id,
  t.name as team_name,
  tm.role,
  (SELECT COUNT(*) FROM team_members WHERE team_id = tm.team_id) as team_has_members
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = 'f8c2c1f8-8f23-40f0-898b-511c4addad55';
