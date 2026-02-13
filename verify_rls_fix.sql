-- Verify RLS is working for events
SELECT '=== RLS Status ===' as check_name;

-- Check if RLS is enabled on events
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'events';

-- Check events with team_id
SELECT id, title, team_id, planner_id FROM events;

-- Check team_members for current user
SELECT tm.*, t.name as team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = auth.uid();

-- This should only show events from teams you're in
SELECT e.id, e.title, e.team_id
FROM events e
JOIN team_members tm ON tm.team_id = e.team_id
WHERE tm.user_id = auth.uid();
