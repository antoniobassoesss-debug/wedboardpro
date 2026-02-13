-- Fix: Create team_members for existing teams and ensure trigger works
-- Run this in Supabase SQL Editor

-- Step 1: Create team_members for all existing teams
INSERT INTO team_members (team_id, user_id, role, joined_at)
SELECT t.id, t.owner_id, 'owner', t.created_at
FROM teams t
WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.team_id = t.id
);

-- Step 2: Check if trigger exists and recreate if needed
DROP TRIGGER IF EXISTS on_auth_user_created_create_team ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_team_for_user();

CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  INSERT INTO public.teams (owner_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Team'))
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE TRIGGER on_auth_user_created_create_team
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_team_for_user();

-- Step 3: Verify
SELECT 
  'Teams' as table_name,
  (SELECT COUNT(*) FROM teams) as total_count,
  (SELECT COUNT(*) FROM team_members) as members_count
UNION ALL
SELECT 
  'Team Members' as table_name,
  (SELECT COUNT(*) FROM teams) as total_count,
  (SELECT COUNT(*) FROM team_members) as members_count;
