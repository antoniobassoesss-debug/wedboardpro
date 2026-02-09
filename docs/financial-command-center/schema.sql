-- ============================================================================
-- FINANCIAL COMMAND CENTER DATABASE SCHEMA
-- Supabase/PostgreSQL for WedBoardPro Budget Management
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE ENUMS
-- ============================================================================

CREATE TYPE budget_category_type AS ENUM (
    'venue',
    'catering',
    'photography',
    'videography',
    'florals',
    'entertainment',
    'decoration',
    'transportation',
    'accommodation',
    'attire',
    'beauty',
    'stationery',
    ' cakes',
    'rental',
    'insurance',
    'legal',
    'marketing',
    'miscellaneous',
    'taxes',
    'fees'
);

CREATE TYPE payment_status AS ENUM (
    'planned',
    'quoted',
    'contracted',
    'partially_paid',
    'paid',
    'cancelled',
    'refunded',
    'disputed'
);

CREATE TYPE payer_entity_type AS ENUM (
    'client_direct',
    'agency_reimbursable',
    'vendor',
    'internal'
);

CREATE TYPE visibility_mode AS ENUM (
    'client_visible',
    'internal_only'
);

CREATE TYPE installment_status AS ENUM (
    'scheduled',
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled'
);

CREATE TYPE approval_status AS ENUM (
    'draft',
    'pending_review',
    'pending_client_approval',
    'approved',
    'rejected',
    'amended'
);

-- ============================================================================
-- MASTER BUDGET TABLE (Header)
-- ============================================================================

CREATE TABLE budget_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Currency & Localization
    currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
    exchange_rate_base DECIMAL(10, 6) DEFAULT 1.0,
    last_fx_update TIMESTAMPTZ,

    -- Budget Summary (Auto-calculated via triggers)
    total_target_budget_cents BIGINT NOT NULL DEFAULT 0,
    total_contracted_cents BIGINT NOT NULL DEFAULT 0,
    total_paid_cents BIGINT NOT NULL DEFAULT 0,
    total_actual_spent_cents BIGINT NOT NULL DEFAULT 0,

    -- Markup & Profit (Internal Only)
    default_markup_percentage DECIMAL(5, 2) DEFAULT 0.0,
    agency_fee_percentage DECIMAL(5, 2) DEFAULT 0.0,
    tax_rate_default DECIMAL(5, 2) DEFAULT 0.0,

    -- Version Control
    budget_version INTEGER NOT NULL DEFAULT 1,
    baseline_version INTEGER,
    is_baseline_locked BOOLEAN DEFAULT FALSE,
    baseline_locked_at TIMESTAMPTZ,
    baseline_locked_by UUID,

    -- Approval Workflow
    approval_status approval_status DEFAULT 'draft',
    client_approval_token VARCHAR,
    client_approval_url VARCHAR,
    client_approved_at TIMESTAMPTZ,
    client_approved_signature TEXT,

    -- Client Mode
    is_client_mode_active BOOLEAN DEFAULT FALSE,
    client_mode_token UUID DEFAULT uuid_generate_v4(),
    client_mode_expires_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_positive_budget CHECK (total_target_budget_cents >= 0)
);

-- Indexes
CREATE INDEX idx_budget_headers_wedding ON budget_headers(wedding_id);
CREATE INDEX idx_budget_headers_planner ON budget_headers(planner_id);
CREATE INDEX idx_budget_headers_approval ON budget_headers(approval_status);

-- ============================================================================
-- BUDGET LINE ITEMS (Detail)
-- ============================================================================

CREATE TABLE budget_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,

    -- Hierarchical Structure
    parent_item_id UUID REFERENCES budget_line_items(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL DEFAULT 0,
    depth INTEGER NOT NULL DEFAULT 0,
    is_group_header BOOLEAN DEFAULT FALSE,

    -- Core Fields
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_type budget_category_type NOT NULL,
    sub_category VARCHAR(100),

    -- Money Fields (All stored in cents for precision)
    target_budget_cents BIGINT NOT NULL DEFAULT 0,
    contracted_amount_cents BIGINT NOT NULL DEFAULT 0,
    actual_spent_cents BIGINT NOT NULL DEFAULT 0,
    paid_to_date_cents BIGINT NOT NULL DEFAULT 0,

    -- Tax
    is_taxable BOOLEAN DEFAULT FALSE,
    tax_rate DECIMAL(5, 2) DEFAULT 0.0,
    tax_amount_cents BIGINT GENERATED ALWAYS AS (
        CASE
            WHEN is_taxable AND contracted_amount_cents > 0
            THEN ROUND((contracted_amount_cents * tax_rate / 100)::NUMERIC)
            ELSE 0
        END
    ) STORED,

    -- Markup (Internal Only)
    markup_percentage DECIMAL(5, 2) DEFAULT 0.0,
    markup_amount_cents BIGINT GENERATED ALWAYS AS (
        CASE
            WHEN markup_percentage > 0 AND contracted_amount_cents > 0
            THEN ROUND((contracted_amount_cents * markup_percentage / 100)::NUMERIC)
            ELSE 0
        END
    ) STORED,
    final_client_price_cents BIGINT GENERATED ALWAYS AS (
        contracted_amount_cents + COALESCE(tax_amount_cents, 0) + markup_amount_cents
    ) STORED,

    -- Payment Information
    payment_due_date DATE,
    payment_status payment_status DEFAULT 'planned',
    payer_entity payer_entity_type DEFAULT 'client_direct',

    -- Dates
    event_date DATE,
    invoice_date DATE,
    paid_date DATE,

    -- Visibility
    visibility visibility_mode DEFAULT 'client_visible',

    -- Status
    status payment_status DEFAULT 'planned',

    -- Tags & Notes
    tags TEXT[],
    internal_notes TEXT,
    client_notes TEXT,

    -- Client-facing Description (for Client Mode)
    client_friendly_description TEXT,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_positive_amounts CHECK (target_budget_cents >= 0),
    CONSTRAINT chk_paid_not_exceed_contract CHECK (paid_to_date_cents <= contracted_amount_cents),
    CONSTRAINT chk_depth_nesting CHECK (depth <= 3)
);

-- Indexes
CREATE INDEX idx_budget_items_header ON budget_line_items(budget_header_id);
CREATE INDEX idx_budget_items_vendor ON budget_line_items(vendor_id);
CREATE INDEX idx_budget_items_category ON budget_line_items(category_type);
CREATE INDEX idx_budget_items_due_date ON budget_line_items(payment_due_date);
CREATE INDEX idx_budget_items_status ON budget_line_items(status);
CREATE INDEX idx_budget_items_visibility ON budget_line_items(visibility);

-- ============================================================================
-- INSTALLMENTS (Payment Splitting)
-- ============================================================================

CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,

    -- Installment Details
    installment_number INTEGER NOT NULL,
    percentage_split DECIMAL(5, 2) NOT NULL,
    amount_cents BIGINT NOT NULL,

    -- Timing
    due_date DATE NOT NULL,
    paid_date DATE,

    -- Status
    status installment_status DEFAULT 'scheduled',

    -- Payment Reference
    stripe_payment_intent_id VARCHAR,
    stripe_invoice_id VARCHAR,
    quickbooks_invoice_id VARCHAR,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_positive_installment_amount CHECK (amount_cents >= 0)
);

-- Indexes
CREATE INDEX idx_installments_item ON installments(budget_line_item_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);

-- ============================================================================
-- BUDGET CATEGORIES (Hierarchical)
-- ============================================================================

CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    category_type budget_category_type NOT NULL,
    icon VARCHAR(50),
    color_hex VARCHAR(7) DEFAULT '#6B7280',

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Default Allocations
    default_percentage DECIMAL(5, 2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CHANGE ORDERS / AUDIT LOG
-- ============================================================================

CREATE TABLE budget_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,
    budget_line_item_id UUID REFERENCES budget_line_items(id) ON DELETE SET NULL,

    -- Change Details
    action_type VARCHAR(50) NOT NULL,
    field_changed VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT,

    -- Version Control
    version_number INTEGER NOT NULL,
    baseline_version INTEGER,

    -- Who/When
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Client Communication
    is_client_notified BOOLEAN DEFAULT FALSE,
    client_notification_sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_audit_log_header ON budget_audit_log(budget_header_id);
CREATE INDEX idx_audit_log_item ON budget_audit_log(budget_line_item_id);
CREATE INDEX idx_audit_log_changes ON budget_audit_log(action_type);
CREATE INDEX idx_audit_log_timeline ON budget_audit_log(changed_at);

-- ============================================================================
-- WHAT-IF SCENARIOS (Versioning)
-- ============================================================================

CREATE TABLE budget_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,

    scenario_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,

    -- Snapshot of Header Data
    total_target_budget_cents BIGINT,
    total_contracted_cents BIGINT,
    default_markup_percentage DECIMAL(5, 2),
    scenario_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE budget_scenario_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES budget_scenarios(id) ON DELETE CASCADE,
    original_item_id UUID REFERENCES budget_line_items(id) ON DELETE SET NULL,

    -- Copied Fields (Modified)
    item_name VARCHAR(255),
    target_budget_cents BIGINT,
    contracted_amount_cents BIGINT,
    markup_percentage DECIMAL(5, 2),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI FORECASTING & INSIGHTS
-- ============================================================================

CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,

    -- Insight Details
    insight_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Data
    predicted_overrun_cents BIGINT,
    suggested_buffer_cents BIGINT,
    confidence_score DECIMAL(3, 2),

    -- Actionability
    suggested_action TEXT,
    action_taken BOOLEAN DEFAULT FALSE,
    action_taken_at TIMESTAMPTZ,

    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version VARCHAR(50)
);

-- Indexes
CREATE INDEX idx_ai_insights_header ON ai_insights(budget_header_id);
CREATE INDEX idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX idx_ai_insights_generated ON ai_insights(generated_at);

-- ============================================================================
-- CLIENT SHARING
-- ============================================================================

CREATE TABLE client_budget_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_header_id UUID NOT NULL REFERENCES budget_headers(id) ON DELETE CASCADE,

    -- Session Details
    session_token UUID DEFAULT uuid_generate_v4(),
    access_code VARCHAR(10),

    -- Permissions
    can_view_costs BOOLEAN DEFAULT FALSE,
    can_view_markup BOOLEAN DEFAULT FALSE,
    can_download BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,

    -- Restrictions
    ip_whitelist TEXT[],
    user_agent_restriction TEXT,
    max_access_count INTEGER,
    current_access_count INTEGER DEFAULT 0,

    -- Expiration
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,

    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CURRENCY RATES (Cached)
-- ============================================================================

CREATE TABLE currency_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_code VARCHAR(3) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    rate DECIMAL(12, 6) NOT NULL,
    rate_date DATE NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    UNIQUE(currency_code, base_currency, rate_date)
);

CREATE INDEX idx_currency_rates_lookup ON currency_rates(currency_code, base_currency, rate_date DESC);

-- ============================================================================
-- AUTO-CALCULATION FUNCTIONS
-- ============================================================================

-- Function to update header totals from line items
CREATE OR REPLACE FUNCTION update_budget_header_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE budget_headers
        SET total_target_budget_cents = (
            SELECT COALESCE(SUM(target_budget_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = OLD.budget_header_id
            AND deleted_at IS NULL
        ),
        total_contracted_cents = (
            SELECT COALESCE(SUM(contracted_amount_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = OLD.budget_header_id
            AND deleted_at IS NULL
        ),
        total_paid_cents = (
            SELECT COALESCE(SUM(paid_to_date_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = OLD.budget_header_id
            AND deleted_at IS NULL
        ),
        total_actual_spent_cents = (
            SELECT COALESCE(SUM(actual_spent_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = OLD.budget_header_id
            AND deleted_at IS NULL
        ),
        updated_at = NOW()
        WHERE id = OLD.budget_header_id;
        RETURN OLD;
    ELSE
        UPDATE budget_headers
        SET total_target_budget_cents = (
            SELECT COALESCE(SUM(target_budget_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = NEW.budget_header_id
            AND deleted_at IS NULL
        ),
        total_contracted_cents = (
            SELECT COALESCE(SUM(contracted_amount_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = NEW.budget_header_id
            AND deleted_at IS NULL
        ),
        total_paid_cents = (
            SELECT COALESCE(SUM(paid_to_date_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = NEW.budget_header_id
            AND deleted_at IS NULL
        ),
        total_actual_spent_cents = (
            SELECT COALESCE(SUM(actual_spent_cents), 0)
            FROM budget_line_items
            WHERE budget_header_id = NEW.budget_header_id
            AND deleted_at IS NULL
        ),
        updated_at = NOW()
        WHERE id = NEW.budget_header_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-calculation
CREATE TRIGGER trg_update_header_totals
AFTER INSERT OR UPDATE OR DELETE ON budget_line_items
FOR EACH ROW EXECUTE FUNCTION update_budget_header_totals();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE budget_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Planner policies (users can only see their own data)
CREATE POLICY "Planner can view own budgets"
ON budget_headers FOR SELECT
USING (planner_id = auth.uid());

CREATE POLICY "Planner can manage own budgets"
ON budget_headers FOR ALL
USING (planner_id = auth.uid());

CREATE POLICY "Planner can view own line items"
ON budget_line_items FOR SELECT
USING (wedding_id IN (
    SELECT id FROM weddings WHERE planner_id = auth.uid()
));

CREATE POLICY "Planner can manage own line items"
ON budget_line_items FOR ALL
USING (wedding_id IN (
    SELECT id FROM weddings WHERE planner_id = auth.uid()
));

-- Client sharing policy (via session token)
CREATE POLICY "Client can view shared budget"
ON budget_line_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM client_budget_sessions
        WHERE budget_header_id = budget_line_items.budget_header_id
        AND session_token = current_setting('request.jwt.claimclient_token', true)::UUID
        AND (expires_at IS NULL OR expires_at > NOW())
    )
);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Budget Summary View
CREATE VIEW vw_budget_summary AS
SELECT
    bh.id AS budget_id,
    bh.wedding_id,
    bh.currency_code,
    bh.total_target_budget_cents,
    bh.total_contracted_cents,
    bh.total_paid_cents,
    bh.total_actual_spent_cents,
    bh.total_contracted_cents - bh.total_target_budget_cents AS budget_variance_cents,
    bh.total_contracted_cents - bh.total_paid_cents AS balance_due_cents,
    bh.total_actual_spent_cents - bh.total_contracted_cents AS reconciliation_variance_cents,
    ROUND(
        CASE
            WHEN bh.total_target_budget_cents > 0
            THEN (bh.total_contracted_cents::DECIMAL / bh.total_target_budget_cents * 100)
            ELSE 0
        END, 2
    ) AS budget_utilization_pct,
    bh.approval_status,
    bh.is_baseline_locked,
    w.wedding_name,
    w.wedding_date
FROM budget_headers bh
JOIN weddings w ON bh.wedding_id = w.id;

-- Payment Calendar View
CREATE VIEW vw_payment_calendar AS
SELECT
    bli.id AS line_item_id,
    bli.item_name,
    bli.payment_due_date,
    bli.contracted_amount_cents,
    bli.paid_to_date_cents,
    (bli.contracted_amount_cents - bli.paid_to_date_cents) AS balance_cents,
    bli.payment_status,
    bli.vendor_id,
    bli.category_type,
    bli.payer_entity,
    bh.currency_code,
    v.vendor_name,
    i.id AS installment_id,
    i.installment_number,
    i.amount_cents AS installment_amount,
    i.due_date AS installment_due_date,
    i.status AS installment_status
FROM budget_line_items bli
LEFT JOIN installments i ON bli.id = i.budget_line_item_id
LEFT JOIN budget_headers bh ON bli.budget_header_id = bh.id
LEFT JOIN vendors v ON bli.vendor_id = v.id
WHERE bli.deleted_at IS NULL
AND (bli.payment_due_date IS NOT NULL OR i.due_date IS NOT NULL)
ORDER BY COALESCE(i.due_date, bli.payment_due_date) ASC;

-- Category Breakdown View
CREATE VIEW vw_category_breakdown AS
SELECT
    bh.id AS budget_id,
    bh.wedding_id,
    bli.category_type,
    bli.sub_category,
    COUNT(*) AS item_count,
    SUM(bli.target_budget_cents) AS target_cents,
    SUM(bli.contracted_amount_cents) AS contracted_cents,
    SUM(bli.paid_to_date_cents) AS paid_cents,
    SUM(bli.actual_spent_cents) AS spent_cents,
    SUM(bli.markup_amount_cents) AS total_markup_cents,
    ROUND(
        CASE
            WHEN SUM(bli.target_budget_cents) > 0
            THEN ((SUM(bli.contracted_amount_cents) - SUM(bli.target_budget_cents))::DECIMAL
                  / SUM(bli.target_budget_cents) * 100)
            ELSE 0
        END, 2
    ) AS variance_pct
FROM budget_line_items bli
JOIN budget_headers bh ON bli.budget_header_id = bh.id
WHERE bli.deleted_at IS NULL
GROUP BY bh.id, bh.wedding_id, bli.category_type, bli.sub_category
ORDER BY bh.id, SUM(bli.contracted_amount_cents) DESC;

-- ============================================================================
-- SAMPLE DATA (Categories)
-- ============================================================================

INSERT INTO budget_categories (name, category_type, icon, color_hex, default_percentage, display_order) VALUES
('Venue & Rental', 'venue', 'building', '#8B5CF6', 40, 1),
('Catering & Bar', 'catering', 'utensils', '#F59E0B', 35, 2),
('Photography & Video', 'photography', 'camera', '#EC4899', 12, 3),
('Florals & Decor', 'florals', 'flower', '#10B981', 10, 4),
('Entertainment', 'entertainment', 'music', '#6366F1', 8, 5),
('Transportation', 'transportation', 'car', '#14B8A6', 3, 6),
('Attire & Beauty', 'attire', 'shirt', '#F97316', 5, 7),
('Stationery', 'stationery', 'mail', '#84CC16', 2, 8),
('Cake & Desserts', 'cakes', 'birthday', '#FBBF24', 2, 9),
('Rental Equipment', 'rental', 'box', '#6B7280', 3, 10),
('Insurance & Legal', 'insurance', 'shield', '#0EA5E9', 2, 11),
('Miscellaneous', 'miscellaneous', 'dots', '#9CA3AF', 5, 12);

-- ============================================================================
-- FOREIGN DATA WRAPPER (Optional: QuickBooks/Xero Sync)
-- ============================================================================

-- Placeholder for external accounting integration
-- Would require postgres_fdw extension and external server setup
-- CREATE FOREIGN TABLE quickbooks_invoices (...);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE budget_headers IS 'Master budget record per wedding - stores totals, currency, approval status';
COMMENT ON TABLE budget_line_items IS 'Individual budget items with full financial data, relations to vendors, and visibility controls';
COMMENT ON TABLE installments IS 'Payment splits for large contracts (e.g., 30/30/40 payment schedules)';
COMMENT ON TABLE budget_audit_log IS 'Complete change history for compliance and dispute resolution';
COMMENT ON TABLE budget_scenarios IS 'What-if scenario versions for modeling budget changes';
COMMENT ON TABLE ai_insights IS 'AI-generated forecasts, risk alerts, and suggested optimizations';
COMMENT ON TABLE client_budget_sessions IS 'Secure sharing sessions with configurable permissions and expiration';
