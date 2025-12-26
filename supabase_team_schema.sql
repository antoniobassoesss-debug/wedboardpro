-- Team Management Schema for WedBoarPro
-- Run this in your Supabase SQL Editor

-- Ensure required crypto functions are available for gen_random_uuid()/gen_random_bytes()
-- (Supabase typically has this enabled, but this keeps migrations portable.)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create team_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_pending_unique
  ON team_invitations(team_id, email)
  WHERE status = 'pending';

-- Chat messages (team + direct)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for team chat, set for direct DM
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_team_created_at ON chat_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id);

-- New team-scoped chat table (immutable messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_team_created_at ON messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies: team chat (recipient_id IS NULL)
DROP POLICY IF EXISTS "Users can view team chat" ON chat_messages;
CREATE POLICY "Users can view team chat"
  ON chat_messages FOR SELECT
  USING (
    recipient_id IS NULL
    AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send team chat" ON chat_messages;
CREATE POLICY "Users can send team chat"
  ON chat_messages FOR INSERT
  WITH CHECK (
    recipient_id IS NULL
    AND sender_id = auth.uid()
    AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policies for new messages table (team-only)
DROP POLICY IF EXISTS "Users can read team messages" ON messages;
CREATE POLICY "Users can read team messages"
  ON messages FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert team messages" ON messages;
CREATE POLICY "Users can insert team messages"
  ON messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Realtime: clients subscribe to table changes via Postgres Changes; no trigger required.
-- (If you later add a broadcast trigger, ensure your Supabase realtime version exposes realtime.broadcast signature.)

-- Policies: direct messages (recipient_id NOT NULL)
DROP POLICY IF EXISTS "Users can view direct chat" ON chat_messages;
CREATE POLICY "Users can view direct chat"
  ON chat_messages FOR SELECT
  USING (
    recipient_id IS NOT NULL
    AND (
      sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send direct chat" ON chat_messages;
CREATE POLICY "Users can send direct chat"
  ON chat_messages FOR INSERT
  WITH CHECK (
    recipient_id IS NOT NULL
    AND sender_id = auth.uid()
  );

-- 5. Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for teams
-- Users can see teams they own or are members of
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Only owners can create teams
DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owners can update their teams
DROP POLICY IF EXISTS "Owners can update their teams" ON teams;
CREATE POLICY "Owners can update their teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owners can delete their teams
DROP POLICY IF EXISTS "Owners can delete their teams" ON teams;
CREATE POLICY "Owners can delete their teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- 7. RLS Policies for team_members
-- Users can view members of teams they belong to
-- FIXED: Removed circular reference that prevented users from seeing team members
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Team owners and admins can add members
DROP POLICY IF EXISTS "Owners and admins can add members" ON team_members;
CREATE POLICY "Owners and admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Team owners and admins can update members
DROP POLICY IF EXISTS "Owners and admins can update members" ON team_members;
CREATE POLICY "Owners and admins can update members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Team owners and admins can remove members
DROP POLICY IF EXISTS "Owners and admins can remove members" ON team_members;
CREATE POLICY "Owners and admins can remove members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- 8. RLS Policies for team_invitations
-- Users can view invitations for teams they own/admin
DROP POLICY IF EXISTS "Users can view team invitations" ON team_invitations;
CREATE POLICY "Users can view team invitations"
  ON team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_invitations.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
    OR
    -- Users can also see invitations sent to their email
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Team owners and admins can create invitations
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON team_invitations;
CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_invitations.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Team owners and admins can update invitations
DROP POLICY IF EXISTS "Owners and admins can update invitations" ON team_invitations;
CREATE POLICY "Owners and admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_invitations.team_id
      AND (
        teams.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = teams.id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- 9. Function to auto-create a team for new users
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create a default team for the new user
  INSERT INTO public.teams (owner_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Team'))
  RETURNING id INTO new_team_id;
  
  -- Add the user as owner member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 10. Trigger to create team on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_create_team ON auth.users;
CREATE TRIGGER on_auth_user_created_create_team
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_team_for_user();

-- 11. Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- 12. Function to accept invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
  new_member_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user exists with this email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = invitation_record.email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User not found. Please sign up first.');
  END IF;
  
  -- Get the user_id
  DECLARE
    invited_user_id UUID;
  BEGIN
    SELECT id INTO invited_user_id
    FROM auth.users
    WHERE email = invitation_record.email;
    
    -- Check if already a member
    IF EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = invitation_record.team_id
      AND user_id = invited_user_id
    ) THEN
      -- Update invitation status
      UPDATE team_invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = invitation_record.id;
      
      RETURN json_build_object('success', false, 'error', 'Already a team member');
    END IF;
    
    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (invitation_record.team_id, invited_user_id, 'member')
    RETURNING id INTO new_member_id;
    
    -- Update invitation status
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN json_build_object('success', true, 'team_id', invitation_record.team_id, 'member_id', new_member_id);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

