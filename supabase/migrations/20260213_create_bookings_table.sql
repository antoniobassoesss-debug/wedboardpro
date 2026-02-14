-- Create bookings table for demo appointments
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  goal TEXT,
  team_size TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for team dashboard)
CREATE POLICY "Allow public read access to bookings" ON bookings
  FOR SELECT USING (true);

-- Allow public insert (anyone can book)
CREATE POLICY "Allow public insert to bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Allow public update (for team to manage)
CREATE POLICY "Allow public update to bookings" ON bookings
  FOR UPDATE USING (true);

-- Create indexes for common queries
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_email ON bookings(email);

-- Create leads table for CRM
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  booking_date DATE,
  booking_time TIME,
  goal TEXT,
  team_size TEXT,
  lead_stage TEXT DEFAULT 'new' CHECK (lead_stage IN ('new', 'meeting_scheduled', 'demo_completed', 'proposal_sent', 'won', 'lost')),
  estimated_value INTEGER DEFAULT 0,
  source TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to leads" ON leads
  FOR SELECT USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert to leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Allow public update
CREATE POLICY "Allow public update to leads" ON leads
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_leads_stage ON leads(lead_stage);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);

-- Add comments
COMMENT ON TABLE bookings IS 'Demo booking appointments from the demo scheduler page';
COMMENT ON COLUMN bookings.status IS 'pending = awaiting confirmation, confirmed = approved by team, cancelled = no-show/cancelled, completed = demo done';
COMMENT ON TABLE leads IS 'CRM leads pipeline';
COMMENT ON COLUMN leads.lead_stage IS 'new = just created, meeting_scheduled = booked demo, demo_completed = demo done, proposal_sent = proposal sent, won = client won, lost = not interested';
