-- ============================================================
-- Admin Team Tables (for /team dashboard only)
-- These tables are SEPARATE from user teams (team_members)
-- ============================================================

-- Admin availability settings
CREATE TABLE IF NOT EXISTS admin_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Admin team members (separate from user team_members)
CREATE TABLE IF NOT EXISTS admin_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_availability_active ON admin_availability(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_team_active ON admin_team(is_active);

-- Functions
CREATE OR REPLACE FUNCTION update_admin_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_admin_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_admin_availability_updated_at ON admin_availability;
CREATE TRIGGER trg_admin_availability_updated_at
  BEFORE UPDATE ON admin_availability
  FOR EACH ROW EXECUTE FUNCTION update_admin_availability_updated_at();

DROP TRIGGER IF EXISTS trg_admin_team_updated_at ON admin_team;
CREATE TRIGGER trg_admin_team_updated_at
  BEFORE UPDATE ON admin_team
  FOR EACH ROW EXECUTE FUNCTION update_admin_team_updated_at();

-- Seed default availability (Mon-Fri, 9 AM - 5 PM)
INSERT INTO admin_availability (day_of_week, start_time, end_time, is_active)
VALUES
  (0, '09:00', '17:00', false),
  (1, '09:00', '17:00', true),
  (2, '09:00', '17:00', true),
  (3, '09:00', '17:00', true),
  (4, '09:00', '17:00', true),
  (5, '09:00', '17:00', false),
  (6, '09:00', '17:00', false)
ON CONFLICT (day_of_week) DO NOTHING;

-- Seed founder admin
INSERT INTO admin_team (email, name, role, permissions)
VALUES ('antoniobasso1@gmail.com', 'António Basso', 'founder', '{"all": true}')
ON CONFLICT (email) DO NOTHING;

-- RLS Policies (using env credentials, not this table)
ALTER TABLE admin_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_team ENABLE ROW LEVEL SECURITY;

-- Anyone with env credentials can access (auth is via env, not RLS)
CREATE POLICY "Admin can access availability" ON admin_availability FOR ALL USING (true);
CREATE POLICY "Admin can access team" ON admin_team FOR ALL USING (true);
