-- Add recipient_id to messages table for direct messages
-- Run this in Supabase SQL Editor

ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for direct message queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_team_recipient ON messages(team_id, recipient_id) WHERE recipient_id IS NOT NULL;

-- Update RLS policy to allow reading direct messages
DROP POLICY IF EXISTS "Users can read team messages" ON messages;
CREATE POLICY "Users can read team messages"
  ON messages FOR SELECT
  USING (
    -- Team messages (recipient_id IS NULL)
    (recipient_id IS NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    OR
    -- Direct messages (recipient_id is set)
    (recipient_id IS NOT NULL AND (user_id = auth.uid() OR recipient_id = auth.uid()))
  );

-- Update insert policy to allow sending direct messages
DROP POLICY IF EXISTS "Users can insert team messages" ON messages;
CREATE POLICY "Users can insert team messages"
  ON messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Team message
      (recipient_id IS NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
      OR
      -- Direct message (both users must be in same team)
      (recipient_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    )
  );

-- Enable realtime for direct messages (already enabled for team messages)
-- No additional changes needed if messages table is already in supabase_realtime publication

