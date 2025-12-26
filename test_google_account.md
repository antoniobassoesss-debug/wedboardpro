# Test Google OAuth Account Team Visibility

## Step 1: Check User Session (Run in Browser Console)

**Login as the Google account** and run this in the browser console (F12):

```javascript
// Check the current session
const session = JSON.parse(localStorage.getItem('wedboarpro_session'));
console.log('=== SESSION INFO ===');
console.log('User ID:', session?.user?.id);
console.log('Email:', session?.user?.email);
console.log('Provider:', session?.user?.app_metadata?.provider);
console.log('Token exists:', !!session?.access_token);

// Test the debug endpoint
fetch('/api/teams/debug', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})
.then(r => r.json())
.then(d => {
  console.log('\n=== DEBUG ENDPOINT ===');
  console.log('My memberships:', d.debug.myMembership.count);
  console.log('Membership data:', d.debug.myMembership.data);
  console.log('All team members:', d.debug.allTeamMembers.count);
  console.log('Team members data:', d.debug.allTeamMembers.data);
  console.log('\nErrors:');
  console.log('Membership error:', d.debug.myMembership.error);
  console.log('Team members error:', d.debug.allTeamMembers.error);
});

// Test team members API
fetch('/api/teams/members', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})
.then(r => r.json())
.then(d => {
  console.log('\n=== TEAM MEMBERS API ===');
  console.log('Members returned:', d.members?.length || 0);
  if (d.error) {
    console.error('Error:', d.error);
  }
  if (d.members) {
    d.members.forEach(m => {
      console.log('- Member:', m.displayName, '(' + m.displayEmail + ')');
    });
  }
});
```

## Step 2: Check Server Logs

After running the above, check your server console for lines like:
```
[GET /api/teams/members] User: xxx Team: xxx
[GET /api/teams/members] Found X members
```

## Step 3: Run SQL Diagnostic

Run `diagnose_google_account.sql` in Supabase SQL Editor.

## Common Issues and Fixes:

### Issue 1: User Not in team_members Table
**Symptoms:** myMembership.count = 0

**Fix:** Add the user manually:
```sql
-- Get the Google user's ID first
SELECT id, email FROM auth.users WHERE email = 'google-user@example.com';

-- Add them to the team (replace IDs)
INSERT INTO team_members (team_id, user_id, role)
VALUES ('YOUR_TEAM_ID', 'GOOGLE_USER_ID', 'member')
ON CONFLICT (team_id, user_id) DO NOTHING;
```

### Issue 2: Wrong team_id
**Symptoms:** myMembership.count > 0 but allTeamMembers.count = 0

**Fix:** Update their team_id:
```sql
-- Check what team they're in
SELECT tm.*, t.name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = 'GOOGLE_USER_ID';

-- If wrong team, update it
UPDATE team_members
SET team_id = 'CORRECT_TEAM_ID'
WHERE user_id = 'GOOGLE_USER_ID';
```

### Issue 3: RLS Policy Not Working for OAuth Users
**Symptoms:** SQL queries work but API returns empty

**Fix:** Check auth.uid() is being set correctly:
```sql
-- Test as the Google user (run while logged in as them)
SELECT
  auth.uid() as my_user_id,
  current_user as postgres_role;

-- If auth.uid() is NULL, there's an authentication issue
```

### Issue 4: Duplicate Memberships
**Symptoms:** Inconsistent behavior

**Fix:**
```sql
-- Remove duplicates
DELETE FROM team_members a
USING team_members b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.team_id = b.team_id;
```
