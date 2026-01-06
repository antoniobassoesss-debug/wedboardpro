-- Chat Unread Tracking System
-- Tracks the last time each user read each conversation (team or direct)
-- Run this in Supabase SQL Editor

-- Create conversation_reads table to track last read timestamp per conversation
CREATE TABLE IF NOT EXISTS conversation_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one read tracker per user per conversation
  -- recipient_id NULL = team conversation, recipient_id set = direct message conversation
  UNIQUE(user_id, team_id, recipient_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversation_reads_user ON conversation_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reads_team ON conversation_reads(team_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reads_recipient ON conversation_reads(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_reads_lookup ON conversation_reads(user_id, team_id, recipient_id);

-- RLS Policies: Users can only manage their own read status
ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

-- Users can read their own conversation read status
CREATE POLICY "Users can read own conversation reads"
  ON conversation_reads FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own conversation read status
CREATE POLICY "Users can insert own conversation reads"
  ON conversation_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own conversation read status
CREATE POLICY "Users can update own conversation reads"
  ON conversation_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_reads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS conversation_reads_updated_at ON conversation_reads;
CREATE TRIGGER conversation_reads_updated_at
  BEFORE UPDATE ON conversation_reads
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_reads_updated_at();

-- Helper function to mark conversation as read (upsert pattern)
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_user_id UUID,
  p_team_id UUID,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_reads (user_id, team_id, recipient_id, last_read_at)
  VALUES (p_user_id, p_team_id, p_recipient_id, NOW())
  ON CONFLICT (user_id, team_id, recipient_id)
  DO UPDATE SET last_read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get unread count for a conversation
CREATE OR REPLACE FUNCTION get_unread_count(
  p_user_id UUID,
  p_team_id UUID,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_last_read_at TIMESTAMP WITH TIME ZONE;
  v_unread_count INTEGER;
BEGIN
  -- Get last read timestamp for this conversation
  SELECT last_read_at INTO v_last_read_at
  FROM conversation_reads
  WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND (
      (recipient_id IS NULL AND p_recipient_id IS NULL) OR
      (recipient_id = p_recipient_id)
    );

  -- If never read, count all messages
  IF v_last_read_at IS NULL THEN
    IF p_recipient_id IS NULL THEN
      -- Team conversation: count all team messages
      SELECT COUNT(*)::INTEGER INTO v_unread_count
      FROM messages
      WHERE team_id = p_team_id
        AND recipient_id IS NULL
        AND user_id != p_user_id; -- Don't count own messages as unread
    ELSE
      -- Direct conversation: count messages from/to this partner
      SELECT COUNT(*)::INTEGER INTO v_unread_count
      FROM messages
      WHERE team_id = p_team_id
        AND (
          (user_id = p_recipient_id AND recipient_id = p_user_id) OR
          (user_id = p_user_id AND recipient_id = p_recipient_id)
        )
        AND user_id != p_user_id; -- Don't count own messages as unread
    END IF;
  ELSE
    -- Count messages after last read timestamp
    IF p_recipient_id IS NULL THEN
      -- Team conversation
      SELECT COUNT(*)::INTEGER INTO v_unread_count
      FROM messages
      WHERE team_id = p_team_id
        AND recipient_id IS NULL
        AND user_id != p_user_id
        AND created_at > v_last_read_at;
    ELSE
      -- Direct conversation
      SELECT COUNT(*)::INTEGER INTO v_unread_count
      FROM messages
      WHERE team_id = p_team_id
        AND (
          (user_id = p_recipient_id AND recipient_id = p_user_id) OR
          (user_id = p_user_id AND recipient_id = p_recipient_id)
        )
        AND user_id != p_user_id
        AND created_at > v_last_read_at;
    END IF;
  END IF;

  RETURN COALESCE(v_unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count(UUID, UUID, UUID) TO authenticated;

-- Verify the table was created
SELECT 'conversation_reads table created successfully' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_reads');
