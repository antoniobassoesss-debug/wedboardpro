-- ============================================================
-- CRM Enhancement for Demo Bookings - Simplified
-- ============================================================

-- Add CRM columns to demo_bookings
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS lead_stage TEXT DEFAULT 'meeting_scheduled';
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS estimated_value INTEGER;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ;

-- Lead stages enum (simplified)
DROP TYPE IF EXISTS lead_stage CASCADE;
CREATE TYPE lead_stage AS ENUM (
  'meeting_scheduled',
  'demo_completed',
  'proposal_sent',
  'won',
  'lost'
);

-- Update column to use enum
ALTER TABLE demo_bookings ALTER COLUMN lead_stage TYPE lead_stage USING lead_stage::text::lead_stage;

-- Add indexes for CRM queries
CREATE INDEX IF NOT EXISTS idx_demo_bookings_lead_stage ON demo_bookings(lead_stage);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created_at ON demo_bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);

-- Update trigger
DROP TRIGGER IF EXISTS trg_demo_bookings_crm_updated_at ON demo_bookings;
CREATE TRIGGER trg_demo_bookings_crm_updated_at
  BEFORE UPDATE ON demo_bookings
  FOR EACH ROW EXECUTE FUNCTION update_demo_bookings_updated_at();

-- Comments for documentation
COMMENT ON COLUMN demo_bookings.lead_stage IS 'Sales pipeline stage: meeting_scheduled, demo_completed, proposal_sent, won, lost';
COMMENT ON COLUMN demo_bookings.estimated_value IS 'Estimated deal value in cents';
COMMENT ON COLUMN demo_bookings.phone IS 'Phone number for follow-up';
COMMENT ON COLUMN demo_bookings.source IS 'Lead source: google, referral, social, etc.';
COMMENT ON COLUMN demo_bookings.last_contacted_at IS 'When was the lead last contacted';
COMMENT ON COLUMN demo_bookings.next_followup_at IS 'Scheduled follow-up timestamp';

-- Update existing records to valid simplified stages
UPDATE demo_bookings SET lead_stage = 'meeting_scheduled' WHERE lead_stage IN ('new_lead', 'contacted', 'meeting_scheduled');
UPDATE demo_bookings SET lead_stage = 'demo_completed' WHERE lead_stage = 'demo_completed';
UPDATE demo_bookings SET lead_stage = 'proposal_sent' WHERE lead_stage IN ('proposal_sent', 'negotiation', 'contract_sent');
UPDATE demo_bookings SET lead_stage = 'won' WHERE lead_stage = 'won';
UPDATE demo_bookings SET lead_stage = 'lost' WHERE lead_stage IN ('lost', 'churned');
