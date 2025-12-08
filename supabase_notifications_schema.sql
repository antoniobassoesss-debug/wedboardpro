-- Notifications table for in-app notifications
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_reassigned', 'task_updated', 'task_completed', 'team_invitation', 'other')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT, -- e.g., 'task', 'team', 'event'
  related_entity_id UUID, -- e.g., task_id, team_id, event_id
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System can create notifications (via service role)
-- Note: This will be handled via backend API with service role
DROP POLICY IF EXISTS "Service can create notifications" ON notifications;
CREATE POLICY "Service can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Backend will use service role

-- Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;
CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Function to create a task assignment notification
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assignee_id is set and different from created_by
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
    INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      'New task assigned to you',
      'You have been assigned to task: ' || NEW.title,
      'task',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create a task reassignment notification
CREATE OR REPLACE FUNCTION notify_task_reassigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify if assignee changed and new assignee is set
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    -- Notify new assignee if assigned
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (
        NEW.assignee_id,
        'task_reassigned',
        'Task reassigned to you',
        'Task "' || NEW.title || '" has been reassigned to you',
        'task',
        NEW.id
      );
    END IF;
    
    -- Notify old assignee if unassigned (optional - can be removed if not needed)
    IF OLD.assignee_id IS NOT NULL AND OLD.assignee_id != NEW.assignee_id THEN
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (
        OLD.assignee_id,
        'task_reassigned',
        'Task unassigned from you',
        'Task "' || NEW.title || '" has been unassigned from you',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new task assignments
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON tasks;
CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION notify_task_assigned();

-- Trigger for task reassignments
DROP TRIGGER IF EXISTS trigger_notify_task_reassigned ON tasks;
CREATE TRIGGER trigger_notify_task_reassigned
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id)
  EXECUTE FUNCTION notify_task_reassigned();

