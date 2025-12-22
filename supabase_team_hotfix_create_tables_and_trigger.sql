-- Hotfix: Fix "Database error saving new user" caused by auth.users trigger referencing teams.
-- Run this in Supabase SQL Editor.
--
-- What it does:
-- 1) Ensures pgcrypto exists (gen_random_uuid/gen_random_bytes)
-- 2) Creates public.teams + public.team_members if missing
-- 3) Recreates the auth.users trigger function with a safe search_path and schema-qualified inserts

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

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

DROP TRIGGER IF EXISTS on_auth_user_created_create_team ON auth.users;
CREATE TRIGGER on_auth_user_created_create_team
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_team_for_user();


