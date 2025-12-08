-- Events / Project Pipeline schema for WedBoardPro
-- Run this in the Supabase SQL editor.

-- 1) Core wedding events (projects)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  current_stage TEXT, -- e.g. pipeline_stages.key
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','delayed','completed')),
  guest_count_expected INTEGER NOT NULL DEFAULT 0,
  guest_count_confirmed INTEGER,
  budget_planned NUMERIC,
  budget_actual NUMERIC,
  notes_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_planner_id ON events(planner_id);
CREATE INDEX IF NOT EXISTS idx_events_wedding_date ON events(wedding_date);


-- 2) Pipeline stages (phases of planning)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  key TEXT NOT NULL, -- e.g. vision_style, venue_date, etc.
  title TEXT NOT NULL,
  description TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  due_date DATE,
  is_blocking BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_event_order ON pipeline_stages(event_id, order_index);


-- 3) Stage tasks / checklists
CREATE TABLE IF NOT EXISTS stage_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_tasks_stage_id ON stage_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_tasks_event_id ON stage_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_stage_tasks_status ON stage_tasks(status);


-- 4) Client data (couple)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  preferences JSONB, -- style, colors, must-have, must-avoid
  communication_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_event_id ON clients(event_id);


-- 5) Venue / space data
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  capacity INTEGER,
  indoor_outdoor TEXT NOT NULL DEFAULT 'mixed' CHECK (indoor_outdoor IN ('indoor','outdoor','mixed')),
  layout_notes TEXT,
  logistics_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_venues_event_id ON venues(event_id);


-- 6) Vendors (suppliers)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('catering','photography','video','music','decor','flowers','cake','transport','others')),
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  contract_status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (contract_status IN ('not_contacted','in_negotiation','contract_signed','cancelled')),
  quote_amount NUMERIC,
  final_amount NUMERIC,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_vendors_event_id ON vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);


-- 7) Files & documents
CREATE TABLE IF NOT EXISTS event_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('contract','layout','menu','photo','other')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_files_event_id ON event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_event_files_category ON event_files(category);


-- 8) Simple activity log
CREATE TABLE IF NOT EXISTS event_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_activity_event_id ON event_activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_event_activity_created_at ON event_activity_log(created_at DESC);


-- 9) updated_at trigger for events
CREATE OR REPLACE FUNCTION set_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_events_updated_at();


