-- Hotfix: Disable the auth.users trigger that auto-creates teams on signup.
-- Use this if Supabase Auth shows: "Database error saving new user".
-- The app backend will auto-provision a default team on first API use instead.

DROP TRIGGER IF EXISTS on_auth_user_created_create_team ON auth.users;
DROP FUNCTION IF EXISTS create_default_team_for_user();


