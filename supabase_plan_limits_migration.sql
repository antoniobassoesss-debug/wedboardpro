-- ============================================================================
-- PLAN LIMITS MIGRATION
-- Adds limits JSONB column to subscription_plans and populates with values
-- from PLAN_LIMITS.md
-- ============================================================================

-- Add limits column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;

-- Update Starter plan limits
UPDATE subscription_plans 
SET limits = '{
  "events": {
    "maxActive": 8
  },
  "team": {
    "maxMembers": 1,
    "canInvite": true
  },
  "contacts": {
    "teamShared": false
  },
  "suppliers": {
    "teamShared": false
  },
  "tasks": {
    "maxPerEvent": 30,
    "assignment": false
  },
  "chat": {
    "enabled": false
  },
  "crm": {
    "maxDeals": 150
  }
}'::jsonb,
monthly_price_cents = 2900,
max_team_members = 1,
max_events = 8
WHERE name = 'starter';

-- Update Professional plan limits
UPDATE subscription_plans 
SET limits = '{
  "events": {
    "maxActive": 30
  },
  "team": {
    "maxMembers": 8,
    "canInvite": true
  },
  "contacts": {
    "teamShared": true
  },
  "suppliers": {
    "teamShared": true
  },
  "tasks": {
    "maxPerEvent": 150,
    "assignment": true
  },
  "chat": {
    "enabled": true
  },
  "crm": {
    "maxDeals": 1000
  }
}'::jsonb,
monthly_price_cents = 6900,
max_team_members = 8,
max_events = 30
WHERE name = 'professional';

-- Update Enterprise plan limits (-1 means unlimited)
UPDATE subscription_plans 
SET limits = '{
  "events": {
    "maxActive": -1
  },
  "team": {
    "maxMembers": 25,
    "canInvite": true
  },
  "contacts": {
    "teamShared": true
  },
  "suppliers": {
    "teamShared": true
  },
  "tasks": {
    "maxPerEvent": -1,
    "assignment": true
  },
  "chat": {
    "enabled": true
  },
  "crm": {
    "maxDeals": -1
  }
}'::jsonb,
monthly_price_cents = 14900,
max_team_members = 25,
max_events = NULL
WHERE name = 'enterprise';

-- Verify the updates
SELECT name, monthly_price_cents, max_team_members, max_events, limits 
FROM subscription_plans 
ORDER BY sort_order;



