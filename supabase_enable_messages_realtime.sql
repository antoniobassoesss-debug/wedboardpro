-- Enable realtime for messages table
-- Run this in Supabase SQL Editor if messages don't appear in real-time

-- Check if realtime is enabled for messages table
-- You should see 'messages' in the tables list
SELECT
  schemaname,
  tablename
FROM
  pg_publication_tables
WHERE
  pubname = 'supabase_realtime';

-- If messages is NOT in the list above, run this to enable it:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify it was added:
SELECT
  schemaname,
  tablename
FROM
  pg_publication_tables
WHERE
  pubname = 'supabase_realtime'
  AND tablename = 'messages';
