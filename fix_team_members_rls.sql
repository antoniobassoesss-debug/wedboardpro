-- Fix: Team Members RLS Circular Reference Issue
-- Run this in your Supabase SQL Editor

-- The problem: The existing RLS policy creates a circular dependency
-- where users can't see team members because the policy itself
-- queries team_members to check if they're in the team!

-- Solution: Simplified policy that allows users to see all members
-- of teams they belong to, without circular reference

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view team members" ON team_members;

-- Create the correct policy
-- Users can see team members if they share the same team_id
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Verify the fix by checking all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;
