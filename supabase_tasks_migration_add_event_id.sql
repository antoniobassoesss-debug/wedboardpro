-- Migration to add event_id column to existing tasks table
-- Run this in your Supabase SQL Editor if you already have a tasks table

-- Add event_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='tasks' AND column_name='event_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    CREATE INDEX idx_tasks_event_id ON tasks(event_id);
    RAISE NOTICE 'Column event_id added to tasks table';
  ELSE
    RAISE NOTICE 'Column event_id already exists in tasks table';
  END IF;
END $$;
