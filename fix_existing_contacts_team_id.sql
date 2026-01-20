-- Fix existing contacts to have team_id set based on creator's team
-- Run this in your Supabase SQL Editor if you have existing contacts that need team_id backfilled

-- Step 1: Check how many contacts need team_id
SELECT 
  COUNT(*) as contacts_without_team_id,
  COUNT(DISTINCT created_by) as unique_creators
FROM team_contacts 
WHERE team_id IS NULL AND visibility = 'team';

-- Step 2: Update contacts to set team_id based on creator's current team
-- This will set team_id for contacts where:
-- - team_id is NULL
-- - visibility is 'team' (or should be team-shared)
-- - The creator is currently a member of a team
UPDATE team_contacts tc
SET team_id = tm.team_id
FROM team_members tm
WHERE tc.created_by = tm.user_id
  AND tc.team_id IS NULL
  AND tc.visibility = 'team';

-- Step 3: For contacts where creator is not in a team, set visibility to 'private'
-- (These contacts can't be team-shared if the creator has no team)
UPDATE team_contacts
SET visibility = 'private'
WHERE team_id IS NULL 
  AND visibility = 'team'
  AND created_by NOT IN (SELECT user_id FROM team_members);

-- Step 4: Verify the results
SELECT 
  visibility,
  COUNT(*) as count,
  COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as with_team_id,
  COUNT(CASE WHEN team_id IS NULL THEN 1 END) as without_team_id
FROM team_contacts
GROUP BY visibility;



