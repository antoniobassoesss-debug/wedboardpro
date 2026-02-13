-- Check team_members columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members' 
ORDER BY ordinal_position;

-- Check if user has a team
SELECT 
  au.email,
  t.name as team_name,
  tm.role,
  tm.joined_at
FROM auth.users au
LEFT JOIN team_members tm ON tm.user_id = au.id
LEFT JOIN teams t ON t.id = tm.team_id
WHERE au.email = 'YOUR_EMAIL_HERE@domain.com';
