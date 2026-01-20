-- =========================================================
-- WedBoardPro - Vendors Management Tab Enhancement
-- Database Migration for event_suppliers table
-- =========================================================

-- 1. Extend event_suppliers status field to support 8-stage workflow
-- Drop existing constraint if it exists
ALTER TABLE event_suppliers
DROP CONSTRAINT IF EXISTS event_suppliers_status_check;

-- Add new constraint with 8 stages
ALTER TABLE event_suppliers
ADD CONSTRAINT event_suppliers_status_check
CHECK (status IN (
  'potential',           -- Suppliers being considered but not yet contacted
  'contacted',           -- Initial outreach sent, awaiting response
  'quote_requested',     -- Formal quote requested
  'quote_received',      -- Quote received, under review
  'negotiating',         -- In discussion about terms/pricing
  'confirmed',           -- Supplier confirmed and contracted
  'paid_completed',      -- Payment made, service delivered
  'declined_lost'        -- Not moving forward with this supplier
));

-- 2. Add financial tracking fields to event_suppliers
ALTER TABLE event_suppliers
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS deposit_paid_date DATE,
ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS final_payment_paid_date DATE,
ADD COLUMN IF NOT EXISTS budget_allocated NUMERIC,
ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
ADD COLUMN IF NOT EXISTS decision_deadline DATE,
ADD COLUMN IF NOT EXISTS service_delivery_date DATE;

-- 3. Add comments for documentation
COMMENT ON COLUMN event_suppliers.deposit_amount IS 'Deposit amount to be paid to vendor';
COMMENT ON COLUMN event_suppliers.deposit_paid_date IS 'Date when deposit was paid';
COMMENT ON COLUMN event_suppliers.final_payment_amount IS 'Final payment amount';
COMMENT ON COLUMN event_suppliers.final_payment_paid_date IS 'Date when final payment was made';
COMMENT ON COLUMN event_suppliers.budget_allocated IS 'Budget allocated for this vendor category';
COMMENT ON COLUMN event_suppliers.contract_signed_date IS 'Date when contract was signed';
COMMENT ON COLUMN event_suppliers.decision_deadline IS 'Deadline to make decision on this vendor';
COMMENT ON COLUMN event_suppliers.service_delivery_date IS 'Date when service will be delivered';

-- 4. Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_suppliers_status ON event_suppliers(status);
CREATE INDEX IF NOT EXISTS idx_event_suppliers_decision_deadline ON event_suppliers(decision_deadline);
CREATE INDEX IF NOT EXISTS idx_event_suppliers_deposit_paid ON event_suppliers(deposit_paid_date) WHERE deposit_paid_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_suppliers_final_payment_paid ON event_suppliers(final_payment_paid_date) WHERE final_payment_paid_date IS NOT NULL;

-- 5. Create status change history table (optional - for audit trail)
CREATE TABLE IF NOT EXISTS event_supplier_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_supplier_id UUID NOT NULL REFERENCES event_suppliers(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_supplier_status_history_supplier_id ON event_supplier_status_history(event_supplier_id);
CREATE INDEX IF NOT EXISTS idx_event_supplier_status_history_changed_at ON event_supplier_status_history(changed_at DESC);

COMMENT ON TABLE event_supplier_status_history IS 'Audit trail for vendor status changes';

-- 6. Migration notes for existing data
-- Note: Existing records with old status values will need to be mapped:
-- 'researched' -> 'potential'
-- 'shortlisted' -> 'quote_received'
-- 'selected' -> 'confirmed'
-- 'rejected' -> 'declined_lost'

-- Optional: Update existing records to map to new statuses
UPDATE event_suppliers SET status = 'potential' WHERE status = 'researched';
UPDATE event_suppliers SET status = 'quote_received' WHERE status = 'shortlisted';
UPDATE event_suppliers SET status = 'confirmed' WHERE status = 'selected';
UPDATE event_suppliers SET status = 'declined_lost' WHERE status = 'rejected';

-- 7. Verify the migration
-- Run this query to check status distribution:
-- SELECT status, COUNT(*) FROM event_suppliers GROUP BY status ORDER BY status;
