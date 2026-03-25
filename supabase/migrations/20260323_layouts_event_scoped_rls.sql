-- Layouts are event-scoped: any team member on an event can read/write all layouts
-- for that event. account_id-based ownership is replaced by team membership.
--
-- Run AFTER:
--   1. Confirming team_members table has (team_id, user_id) columns
--   2. Confirming events table has a team_id column
--
-- Run BEFORE: the orphan cleanup and NOT NULL constraint migrations.

DROP POLICY IF EXISTS "layouts_account_owner" ON layouts;
DROP POLICY IF EXISTS "layouts_team_event_access" ON layouts;

CREATE POLICY "layouts_team_event_access" ON layouts
FOR ALL USING (
  event_id IN (
    SELECT e.id FROM events e
    JOIN team_members tm ON tm.team_id = e.team_id
    WHERE tm.user_id = auth.uid()
  )
);
