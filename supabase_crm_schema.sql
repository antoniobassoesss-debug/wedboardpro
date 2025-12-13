-- ============================================================
-- CRM Module Schema for WedBoarPro
-- Tables: crm_pipelines, crm_stages, crm_contacts, crm_deals,
--         crm_activities, crm_deal_tasks, crm_deal_files
-- ============================================================

-- 1. CRM Pipelines (for future multiple pipelines)
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_account ON crm_pipelines(account_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_crm_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_pipelines_updated_at ON crm_pipelines;
CREATE TRIGGER trg_crm_pipelines_updated_at
  BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION update_crm_pipelines_updated_at();

-- RLS for crm_pipelines
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account pipelines" ON crm_pipelines;
CREATE POLICY "Users can view their account pipelines"
  ON crm_pipelines FOR SELECT
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert pipelines for their account" ON crm_pipelines;
CREATE POLICY "Users can insert pipelines for their account"
  ON crm_pipelines FOR INSERT
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their account pipelines" ON crm_pipelines;
CREATE POLICY "Users can update their account pipelines"
  ON crm_pipelines FOR UPDATE
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their account pipelines" ON crm_pipelines;
CREATE POLICY "Users can delete their account pipelines"
  ON crm_pipelines FOR DELETE
  USING (account_id = auth.uid());


-- 2. CRM Stages (columns on kanban board)
CREATE TABLE IF NOT EXISTS crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT NULL, -- optional color for stage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON crm_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_position ON crm_stages(pipeline_id, position);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_stages_updated_at ON crm_stages;
CREATE TRIGGER trg_crm_stages_updated_at
  BEFORE UPDATE ON crm_stages
  FOR EACH ROW EXECUTE FUNCTION update_crm_stages_updated_at();

-- RLS for crm_stages (inherit from pipeline ownership)
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view stages of their pipelines" ON crm_stages;
CREATE POLICY "Users can view stages of their pipelines"
  ON crm_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_pipelines p
      WHERE p.id = crm_stages.pipeline_id AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert stages to their pipelines" ON crm_stages;
CREATE POLICY "Users can insert stages to their pipelines"
  ON crm_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_pipelines p
      WHERE p.id = crm_stages.pipeline_id AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update stages of their pipelines" ON crm_stages;
CREATE POLICY "Users can update stages of their pipelines"
  ON crm_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM crm_pipelines p
      WHERE p.id = crm_stages.pipeline_id AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete stages of their pipelines" ON crm_stages;
CREATE POLICY "Users can delete stages of their pipelines"
  ON crm_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crm_pipelines p
      WHERE p.id = crm_stages.pipeline_id AND p.account_id = auth.uid()
    )
  );


-- 3. CRM Contacts (couples / clients)
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  primary_first_name TEXT,
  primary_last_name TEXT,
  partner_first_name TEXT,
  partner_last_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  event_id UUID NULL, -- optional link to existing event/project
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(account_id, email);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_contacts_updated_at();

-- RLS for crm_contacts
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account contacts" ON crm_contacts;
CREATE POLICY "Users can view their account contacts"
  ON crm_contacts FOR SELECT
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert contacts for their account" ON crm_contacts;
CREATE POLICY "Users can insert contacts for their account"
  ON crm_contacts FOR INSERT
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their account contacts" ON crm_contacts;
CREATE POLICY "Users can update their account contacts"
  ON crm_contacts FOR UPDATE
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their account contacts" ON crm_contacts;
CREATE POLICY "Users can delete their account contacts"
  ON crm_contacts FOR DELETE
  USING (account_id = auth.uid());


-- 4. CRM Deals (main entity for kanban cards)
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_stages(id) ON DELETE RESTRICT,
  primary_contact_id UUID NULL REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  wedding_date DATE NULL,
  value_cents BIGINT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  next_action TEXT NULL,
  next_action_due_at DATE NULL, -- due date for next action (for overdue tracking)
  owner_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  lost_reason TEXT NULL,
  position INT NOT NULL DEFAULT 0, -- for ordering within a stage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_account ON crm_deals(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline ON crm_deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON crm_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_wedding_date ON crm_deals(wedding_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage_position ON crm_deals(stage_id, position);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_deals_updated_at ON crm_deals;
CREATE TRIGGER trg_crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_crm_deals_updated_at();

-- RLS for crm_deals
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account deals" ON crm_deals;
CREATE POLICY "Users can view their account deals"
  ON crm_deals FOR SELECT
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert deals for their account" ON crm_deals;
CREATE POLICY "Users can insert deals for their account"
  ON crm_deals FOR INSERT
  WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their account deals" ON crm_deals;
CREATE POLICY "Users can update their account deals"
  ON crm_deals FOR UPDATE
  USING (account_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their account deals" ON crm_deals;
CREATE POLICY "Users can delete their account deals"
  ON crm_deals FOR DELETE
  USING (account_id = auth.uid());


-- 5. CRM Activities (call notes, emails, meetings)
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note')),
  summary TEXT NOT NULL,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_happened_at ON crm_activities(deal_id, happened_at DESC);

-- RLS for crm_activities (inherit from deal ownership)
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activities of their deals" ON crm_activities;
CREATE POLICY "Users can view activities of their deals"
  ON crm_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_activities.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert activities to their deals" ON crm_activities;
CREATE POLICY "Users can insert activities to their deals"
  ON crm_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_activities.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update activities of their deals" ON crm_activities;
CREATE POLICY "Users can update activities of their deals"
  ON crm_activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_activities.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete activities of their deals" ON crm_activities;
CREATE POLICY "Users can delete activities of their deals"
  ON crm_activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_activities.deal_id AND d.account_id = auth.uid()
    )
  );


-- 6. CRM Deal Tasks (link deals to existing tasks module)
CREATE TABLE IF NOT EXISTS crm_deal_tasks (
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_tasks_deal ON crm_deal_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_tasks_task ON crm_deal_tasks(task_id);

-- RLS for crm_deal_tasks
ALTER TABLE crm_deal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deal_tasks of their deals" ON crm_deal_tasks;
CREATE POLICY "Users can view deal_tasks of their deals"
  ON crm_deal_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_tasks.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert deal_tasks to their deals" ON crm_deal_tasks;
CREATE POLICY "Users can insert deal_tasks to their deals"
  ON crm_deal_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_tasks.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete deal_tasks of their deals" ON crm_deal_tasks;
CREATE POLICY "Users can delete deal_tasks of their deals"
  ON crm_deal_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_tasks.deal_id AND d.account_id = auth.uid()
    )
  );


-- 7. CRM Deal Files (link deals to project_files)
CREATE TABLE IF NOT EXISTS crm_deal_files (
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_files_deal ON crm_deal_files(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_files_file ON crm_deal_files(file_id);

-- RLS for crm_deal_files
ALTER TABLE crm_deal_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deal_files of their deals" ON crm_deal_files;
CREATE POLICY "Users can view deal_files of their deals"
  ON crm_deal_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_files.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert deal_files to their deals" ON crm_deal_files;
CREATE POLICY "Users can insert deal_files to their deals"
  ON crm_deal_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_files.deal_id AND d.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete deal_files of their deals" ON crm_deal_files;
CREATE POLICY "Users can delete deal_files of their deals"
  ON crm_deal_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals d
      WHERE d.id = crm_deal_files.deal_id AND d.account_id = auth.uid()
    )
  );


-- ============================================================
-- Helper function to initialize default pipeline and stages
-- Run once per new account or call manually
-- ============================================================
CREATE OR REPLACE FUNCTION init_default_crm_pipeline(p_account_id UUID)
RETURNS UUID AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  -- Create default pipeline
  INSERT INTO crm_pipelines (account_id, name, is_default)
  VALUES (p_account_id, 'Wedding Pipeline', TRUE)
  RETURNING id INTO v_pipeline_id;

  -- Create default stages
  INSERT INTO crm_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'New Lead', 0, '#94a3b8'),
    (v_pipeline_id, 'Discovery Call', 1, '#60a5fa'),
    (v_pipeline_id, 'Proposal Sent', 2, '#fbbf24'),
    (v_pipeline_id, 'Contract Signed', 3, '#34d399'),
    (v_pipeline_id, 'Lost', 4, '#f87171');

  RETURN v_pipeline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


