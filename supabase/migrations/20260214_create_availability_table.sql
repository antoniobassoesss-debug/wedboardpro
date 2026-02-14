-- Create availability/unavailability table
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT DEFAULT 'unavailable' CHECK (type IN ('available', 'unavailable')),
  reason TEXT,
  start_time TIME,
  end_time TIME,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, type)
);

-- Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to availability" ON availability
  FOR SELECT USING (true);

-- Allow authenticated insert/update/delete
CREATE POLICY "Allow auth users to manage availability" ON availability
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_availability_date ON availability(date);

COMMENT ON TABLE availability IS 'Manages unavailable dates for demo bookings';
COMMENT ON COLUMN availability.type IS 'available = date is open for bookings, unavailable = date is blocked';
