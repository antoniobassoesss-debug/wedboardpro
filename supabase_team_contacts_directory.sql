-- Team Contacts Directory Migration
-- Creates a new team_contacts table for team-global contacts directory
-- Run this in your Supabase SQL Editor

-- Step 1: Create team_contacts table
CREATE TABLE IF NOT EXISTS team_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('team', 'private')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_contacts_team_visibility ON team_contacts(team_id, visibility) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_contacts_created_visibility ON team_contacts(created_by, visibility);
CREATE INDEX IF NOT EXISTS idx_team_contacts_name ON team_contacts(name);
CREATE INDEX IF NOT EXISTS idx_team_contacts_email ON team_contacts(email) WHERE email IS NOT NULL;

-- Step 3: Create updated_at trigger
CREATE OR REPLACE FUNCTION set_team_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_contacts_updated_at ON team_contacts;
CREATE TRIGGER trg_team_contacts_updated_at
  BEFORE UPDATE ON team_contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_team_contacts_updated_at();

-- Note: RLS policies are not added here because the application uses
-- the Supabase service role on the backend. If you later expose these
-- tables directly to the client, add RLS to scope rows by team_id/created_by
-- and visibility rules.



