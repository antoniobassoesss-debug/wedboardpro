-- Create admin_members table (company admins who access the dashboard)
CREATE TABLE IF NOT EXISTS admin_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read access
CREATE POLICY "Allow auth read admin_members" ON admin_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated insert/update/delete (admins only in app logic)
CREATE POLICY "Allow auth manage admin_members" ON admin_members
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_admin_members_email ON admin_members(email);
CREATE INDEX idx_admin_members_role ON admin_members(role);
CREATE INDEX idx_admin_members_active ON admin_members(is_active);

COMMENT ON TABLE admin_members IS 'Company admin profiles for accessing the team dashboard';
COMMENT ON COLUMN admin_members.role IS 'admin = full access, manager = manage bookings/leads, member = view only, viewer = limited access';
COMMENT ON COLUMN admin_members.permissions IS 'JSON object with granular permissions';
