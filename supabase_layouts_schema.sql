-- ============================================================================
-- LAYOUTS MODULE SCHEMA
-- ============================================================================
-- Stores layout projects from the Layout Maker tool.
-- Each layout belongs to an account (user) and optionally links to an event/project.

-- Create the layouts table
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Layout identity
  name TEXT NOT NULL DEFAULT 'Untitled Layout',
  description TEXT,
  category TEXT DEFAULT 'custom',
  tags TEXT[] DEFAULT '{}',
  
  -- Canvas data (the full Layout Maker project data as JSONB)
  canvas_data JSONB NOT NULL DEFAULT '{
    "drawings": [],
    "shapes": [],
    "textElements": [],
    "walls": [],
    "doors": [],
    "viewBox": {"x": 0, "y": 0, "width": 0, "height": 0}
  }'::jsonb,
  
  -- Link to parent event/project (optional - for associating layouts with WedBoardPro projects)
  event_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_layouts_account_id ON layouts(account_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_layouts_status ON layouts(status);

-- Index for filtering by event
CREATE INDEX IF NOT EXISTS idx_layouts_event_id ON layouts(event_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_layouts_updated_at ON layouts;
CREATE TRIGGER trigger_layouts_updated_at
  BEFORE UPDATE ON layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_layouts_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own layouts
DROP POLICY IF EXISTS "Users can view own layouts" ON layouts;
CREATE POLICY "Users can view own layouts"
  ON layouts FOR SELECT
  USING (auth.uid() = account_id);

-- Policy: Users can insert layouts for themselves
DROP POLICY IF EXISTS "Users can insert own layouts" ON layouts;
CREATE POLICY "Users can insert own layouts"
  ON layouts FOR INSERT
  WITH CHECK (auth.uid() = account_id);

-- Policy: Users can update their own layouts
DROP POLICY IF EXISTS "Users can update own layouts" ON layouts;
CREATE POLICY "Users can update own layouts"
  ON layouts FOR UPDATE
  USING (auth.uid() = account_id)
  WITH CHECK (auth.uid() = account_id);

-- Policy: Users can delete their own layouts
DROP POLICY IF EXISTS "Users can delete own layouts" ON layouts;
CREATE POLICY "Users can delete own layouts"
  ON layouts FOR DELETE
  USING (auth.uid() = account_id);

-- ============================================================================
-- HELPER VIEW (optional - for dashboard summaries)
-- ============================================================================

CREATE OR REPLACE VIEW layouts_summary AS
SELECT
  account_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'archived') AS archived_count,
  MAX(updated_at) AS last_updated
FROM layouts
GROUP BY account_id;

