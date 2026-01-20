-- Subscription Management Schema for WedBoardPro
-- Run this in your Supabase SQL Editor
-- This schema supports Stripe integration with team-based subscriptions and per-user add-ons

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- Stores the available subscription plans and their Stripe price IDs
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identification
  name TEXT NOT NULL UNIQUE CHECK (name IN ('starter', 'professional', 'enterprise')),
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Stripe Price IDs (configured in Stripe Dashboard)
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  
  -- Pricing (stored in cents for precision)
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  annual_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Plan limits
  max_team_members INTEGER NOT NULL DEFAULT 1,        -- Base included members
  max_events INTEGER,                                  -- NULL = unlimited
  max_storage_gb INTEGER DEFAULT 5,                   -- Storage limit in GB
  
  -- Per-user add-on pricing (for hybrid model)
  additional_user_price_cents INTEGER DEFAULT 0,      -- Monthly price per extra user
  
  -- Features (JSON array of feature keys/descriptions)
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Feature flags for quick checks
  has_advanced_reports BOOLEAN DEFAULT FALSE,
  has_custom_branding BOOLEAN DEFAULT FALSE,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_layout_maker BOOLEAN DEFAULT TRUE,
  has_budget_tools BOOLEAN DEFAULT TRUE,
  has_guest_management BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active plans lookup
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active 
  ON subscription_plans(is_active, sort_order);

-- ============================================================================
-- 2. TEAM SUBSCRIPTIONS TABLE
-- Links teams to their active subscriptions via Stripe
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Team reference
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Plan reference
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Stripe identifiers
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Subscription status (mirrors Stripe statuses)
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN (
    'incomplete',           -- Subscription created but payment pending
    'incomplete_expired',   -- Payment window expired
    'trialing',            -- In trial period
    'active',              -- Paid and active
    'past_due',            -- Payment failed, retrying
    'canceled',            -- Subscription canceled
    'unpaid',              -- Payment failed, not retrying
    'paused'               -- Subscription paused
  )),
  
  -- Billing details
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Trial information
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active subscription per team
  UNIQUE(team_id)
);

-- Indexes for team subscriptions
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_team_id 
  ON team_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_stripe_customer 
  ON team_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_stripe_subscription 
  ON team_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_team_subscriptions_status 
  ON team_subscriptions(status);

-- ============================================================================
-- 3. SUBSCRIPTION ADD-ONS TABLE
-- Tracks per-user add-ons for the hybrid billing model
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent subscription
  team_subscription_id UUID NOT NULL REFERENCES team_subscriptions(id) ON DELETE CASCADE,
  
  -- Add-on type
  addon_type TEXT NOT NULL DEFAULT 'additional_users' CHECK (addon_type IN (
    'additional_users',     -- Extra team members beyond base plan
    'extra_storage',        -- Additional storage
    'premium_support'       -- Priority support add-on
  )),
  
  -- Stripe subscription item (for metered/quantity billing)
  stripe_subscription_item_id TEXT,
  stripe_price_id TEXT,
  
  -- Quantity and pricing
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One add-on type per subscription
  UNIQUE(team_subscription_id, addon_type)
);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription 
  ON subscription_addons(team_subscription_id);

-- ============================================================================
-- 4. PAYMENT HISTORY TABLE
-- Stores payment events from Stripe webhooks for audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  team_subscription_id UUID REFERENCES team_subscriptions(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Stripe identifiers
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  
  -- Invoice details
  invoice_url TEXT,
  invoice_pdf TEXT,
  
  -- Failure information
  failure_code TEXT,
  failure_message TEXT,
  
  -- Metadata
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_team 
  ON subscription_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription 
  ON subscription_payments(team_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice 
  ON subscription_payments(stripe_invoice_id);

-- ============================================================================
-- 5. UPDATE TEAMS TABLE
-- Add quick-lookup columns for subscription status
-- ============================================================================
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' 
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'expired'));

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id);

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for subscription status lookups
CREATE INDEX IF NOT EXISTS idx_teams_subscription_status 
  ON teams(subscription_status);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all subscription tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Everyone can read active plans
DROP POLICY IF EXISTS "Anyone can read active plans" ON subscription_plans;
CREATE POLICY "Anyone can read active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

-- Team Subscriptions: Team members can read their team's subscription
DROP POLICY IF EXISTS "Team members can read own subscription" ON team_subscriptions;
CREATE POLICY "Team members can read own subscription"
  ON team_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_subscriptions.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team Subscriptions: Only service role can insert/update (via webhooks)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON team_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON team_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Subscription Add-ons: Team members can read
DROP POLICY IF EXISTS "Team members can read addons" ON subscription_addons;
CREATE POLICY "Team members can read addons"
  ON subscription_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_subscriptions ts
      JOIN team_members tm ON tm.team_id = ts.team_id
      WHERE ts.id = subscription_addons.team_subscription_id
      AND tm.user_id = auth.uid()
    )
  );

-- Payment History: Team owners/admins can read
DROP POLICY IF EXISTS "Team admins can read payments" ON subscription_payments;
CREATE POLICY "Team admins can read payments"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = subscription_payments.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a team has an active subscription
CREATE OR REPLACE FUNCTION check_team_subscription_active(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM team_subscriptions
  WHERE team_id = p_team_id
  AND status IN ('active', 'trialing')
  LIMIT 1;
  
  RETURN v_status IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team's current plan
CREATE OR REPLACE FUNCTION get_team_plan(p_team_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_display_name TEXT,
  status TEXT,
  billing_interval TEXT,
  current_period_end TIMESTAMPTZ,
  max_team_members INTEGER,
  max_events INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.display_name,
    ts.status,
    ts.billing_interval,
    ts.current_period_end,
    sp.max_team_members,
    sp.max_events
  FROM team_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.team_id = p_team_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync team subscription status (called after subscription updates)
CREATE OR REPLACE FUNCTION sync_team_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the teams table with subscription status
  UPDATE teams
  SET 
    subscription_status = CASE
      WHEN NEW.status = 'active' THEN 'active'
      WHEN NEW.status = 'trialing' THEN 'trialing'
      WHEN NEW.status = 'past_due' THEN 'past_due'
      WHEN NEW.status = 'canceled' THEN 'canceled'
      ELSE 'expired'
    END,
    subscription_plan_id = NEW.plan_id,
    stripe_customer_id = NEW.stripe_customer_id,
    updated_at = NOW()
  WHERE id = NEW.team_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync subscription status to teams table
DROP TRIGGER IF EXISTS sync_subscription_status_trigger ON team_subscriptions;
CREATE TRIGGER sync_subscription_status_trigger
  AFTER INSERT OR UPDATE ON team_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_subscription_status();

-- ============================================================================
-- 8. SEED INITIAL PLAN DATA
-- These are placeholder values - update with your actual Stripe Price IDs
-- ============================================================================

INSERT INTO subscription_plans (
  name, 
  display_name, 
  description,
  monthly_price_cents, 
  annual_price_cents,
  max_team_members,
  max_events,
  max_storage_gb,
  additional_user_price_cents,
  features,
  has_advanced_reports,
  has_custom_branding,
  has_api_access,
  has_priority_support,
  sort_order
) VALUES 
(
  'starter',
  'Starter',
  'Perfect for solo planners getting started',
  2900,        -- €29/month
  29000,       -- €290/year (save ~17%)
  2,           -- 2 team members included
  10,          -- Up to 10 active events
  5,           -- 5GB storage
  900,         -- €9/month per additional user
  '[
    "Up to 10 active events",
    "2 team members included",
    "Project Pipeline & Calendar",
    "Basic Budget Tracking",
    "Guest List Management",
    "Layout Maker",
    "Email Support"
  ]'::jsonb,
  FALSE,       -- No advanced reports
  FALSE,       -- No custom branding
  FALSE,       -- No API access
  FALSE,       -- No priority support
  1
),
(
  'professional',
  'Professional',
  'For growing studios managing multiple weddings',
  5900,        -- €59/month
  59000,       -- €590/year (save ~17%)
  5,           -- 5 team members included
  NULL,        -- Unlimited events
  25,          -- 25GB storage
  1200,        -- €12/month per additional user
  '[
    "Unlimited active events",
    "5 team members included",
    "Everything in Starter",
    "Advanced Reports & Analytics",
    "Quote Maker & Proposals",
    "Vendor Management",
    "Priority Email Support",
    "Custom event templates"
  ]'::jsonb,
  TRUE,        -- Has advanced reports
  FALSE,       -- No custom branding
  FALSE,       -- No API access
  TRUE,        -- Has priority support
  2
),
(
  'enterprise',
  'Enterprise',
  'For agencies and large planning teams',
  14900,       -- €149/month
  149000,      -- €1,490/year (save ~17%)
  15,          -- 15 team members included
  NULL,        -- Unlimited events
  100,         -- 100GB storage
  1500,        -- €15/month per additional user
  '[
    "Unlimited everything",
    "15 team members included",
    "Everything in Professional",
    "Custom Branding & White-label",
    "API Access & Integrations",
    "Dedicated Account Manager",
    "Phone & Video Support",
    "Custom onboarding",
    "SLA guarantee"
  ]'::jsonb,
  TRUE,        -- Has advanced reports
  TRUE,        -- Has custom branding
  TRUE,        -- Has API access
  TRUE,        -- Has priority support
  3
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  max_team_members = EXCLUDED.max_team_members,
  max_events = EXCLUDED.max_events,
  max_storage_gb = EXCLUDED.max_storage_gb,
  additional_user_price_cents = EXCLUDED.additional_user_price_cents,
  features = EXCLUDED.features,
  has_advanced_reports = EXCLUDED.has_advanced_reports,
  has_custom_branding = EXCLUDED.has_custom_branding,
  has_api_access = EXCLUDED.has_api_access,
  has_priority_support = EXCLUDED.has_priority_support,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_subscriptions_updated_at ON team_subscriptions;
CREATE TRIGGER update_team_subscriptions_updated_at
  BEFORE UPDATE ON team_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_addons_updated_at ON subscription_addons;
CREATE TRIGGER update_subscription_addons_updated_at
  BEFORE UPDATE ON subscription_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the schema)
-- ============================================================================
-- SELECT * FROM subscription_plans ORDER BY sort_order;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teams' AND column_name LIKE 'subscription%';
-- SELECT * FROM team_subscriptions LIMIT 5;

