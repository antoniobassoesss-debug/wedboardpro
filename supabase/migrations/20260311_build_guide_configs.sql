-- Build Guide Configuration Table
-- Stores PDF export configuration per event

CREATE TABLE IF NOT EXISTS build_guide_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Per-layout settings array
  layout_configs JSONB NOT NULL DEFAULT '[]',
  
  -- Supplier timeline entries
  timeline_rows JSONB NOT NULL DEFAULT '[]',
  
  -- Contact entries
  contacts JSONB NOT NULL DEFAULT '[]',
  
  -- Document settings (cover, formatting, footer)
  document_settings JSONB NOT NULL DEFAULT '{}',
  
  -- Version control
  version_label TEXT NOT NULL DEFAULT 'v1',
  
  -- Timestamps
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One config per event
  UNIQUE(event_id)
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_build_guide_configs_event_id ON build_guide_configs(event_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_build_guide_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_build_guide_configs_updated_at ON build_guide_configs;
CREATE TRIGGER trigger_build_guide_configs_updated_at
  BEFORE UPDATE ON build_guide_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_build_guide_configs_updated_at();

-- ============================================================================
-- Add layout_notes field to layouts table
-- ============================================================================

ALTER TABLE layouts ADD COLUMN IF NOT EXISTS layout_notes TEXT;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE build_guide_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access configs for their own events
DROP POLICY IF EXISTS "Users can access own build guide configs" ON build_guide_configs;
CREATE POLICY "Users can access own build guide configs"
  ON build_guide_configs FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events WHERE planner_id = auth.uid()
    )
  );
