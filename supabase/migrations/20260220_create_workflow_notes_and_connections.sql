-- Create workflow_notes table
CREATE TABLE IF NOT EXISTS workflow_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  position_x INTEGER DEFAULT 100,
  position_y INTEGER DEFAULT 100,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_connections table (replace localStorage)
-- Note: from_id and to_id are TEXT because project IDs can be simple strings like "1"
CREATE TABLE IF NOT EXISTS workflow_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL,
  from_type TEXT NOT NULL CHECK (from_type IN ('project', 'note')),
  to_id TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ('project', 'note')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_notes
CREATE POLICY "Users can select own event notes" ON workflow_notes
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can insert own event notes" ON workflow_notes
  FOR INSERT WITH CHECK (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can update own event notes" ON workflow_notes
  FOR UPDATE USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can delete own event notes" ON workflow_notes
  FOR DELETE USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

-- RLS Policies for workflow_connections
CREATE POLICY "Users can select own event connections" ON workflow_connections
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can insert own event connections" ON workflow_connections
  FOR INSERT WITH CHECK (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can update own event connections" ON workflow_connections
  FOR UPDATE USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

CREATE POLICY "Users can delete own event connections" ON workflow_connections
  FOR DELETE USING (
    event_id IN (SELECT id FROM events WHERE planner_id = auth.uid())
  );

-- Create indexes
CREATE INDEX idx_workflow_notes_event_id ON workflow_notes(event_id);
CREATE INDEX idx_workflow_connections_event_id ON workflow_connections(event_id);
CREATE INDEX idx_workflow_connections_from_id ON workflow_connections(from_id);
CREATE INDEX idx_workflow_connections_to_id ON workflow_connections(to_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_notes_updated_at BEFORE UPDATE ON workflow_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workflow_notes IS 'Notes on the workflow canvas, linked to events/weddings';
COMMENT ON TABLE workflow_connections IS 'Connections between projects and notes on the workflow canvas';
