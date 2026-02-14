-- Create blocked time slots table
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to blocked_slots" ON blocked_slots
  FOR SELECT USING (true);

-- Allow authenticated manage
CREATE POLICY "Allow auth users to manage blocked_slots" ON blocked_slots
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_blocked_slots_date ON blocked_slots(date);

COMMENT ON TABLE blocked_slots IS 'Tracks blocked time slots on specific dates';
