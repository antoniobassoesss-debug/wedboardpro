# WedBoardPro Team & Permissions Architecture

This document defines the complete architecture for team management, user roles, permissions, and multi-team support.

> **Core Principle:** Granular permissions over fixed roles. Owners can customize exactly what each team member can access.

---

## Table of Contents

1. [Overview](#overview)
2. [Account Types](#account-types)
3. [User Types](#user-types)
4. [Permissions System](#permissions-system)
5. [Database Schema](#database-schema)
6. [User Flows](#user-flows)
7. [Multi-Team Support](#multi-team-support)
8. [UI Components](#ui-components)
9. [API Endpoints](#api-endpoints)
10. [Edge Cases](#edge-cases)

---

## Overview

### Key Concepts

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   USER                    ACCOUNT (Team)                        │
│   ────                    ──────────────                        │
│   A person with           A subscription/workspace.             │
│   login credentials.      Has one Owner who pays.               │
│   Can belong to           Can have multiple Members.            │
│   multiple Accounts.                                            │
│                                                                 │
│   ┌───────┐              ┌─────────────────────┐               │
│   │ Sofia │──────────────│  Wedding Dreams     │               │
│   │       │──────┐       │  Owner: Maria       │               │
│   └───────┘      │       │  Plan: Professional │               │
│                  │       └─────────────────────┘               │
│                  │                                              │
│                  │       ┌─────────────────────┐               │
│                  └───────│  Elite Events       │               │
│                          │  Owner: Carlos      │               │
│                          │  Plan: Enterprise   │               │
│                          └─────────────────────┘               │
│                                                                 │
│   Sofia belongs to 2 teams with different permissions in each  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core Rules

| Rule | Description |
|------|-------------|
| One email = One user | Each email address can only have one user account |
| Users can join multiple teams | A user can be member of unlimited accounts/teams |
| Owners pay | Each account has exactly one Owner who manages billing |
| Permissions are per-team | A user's permissions are specific to each team they belong to |
| Invite-only members | Team members can only join via email invitation |

---

## Account Types

### By Plan

| Plan | Team Size | Description |
|------|-----------|-------------|
| **Starter** | 1 (Solo) | No team features. Single user only. |
| **Professional** | 1 + 4 (5 total) | Owner + up to 4 team members |
| **Enterprise** | 1 + 24 (25 total) | Owner + up to 24 team members |

### Starter Plan: Solo Mode

Starter accounts have **no team functionality**. The UI should:

1. **Hide** team-related features entirely (not show them as locked)
2. **Show educational content** about team features in relevant places

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings (Starter Plan)                                        │
│                                                                 │
│  ├── Profile                                                    │
│  ├── Account                                                    │
│  ├── Billing                                                    │
│  ├── Usage                                                      │
│  └── Integrations                                               │
│                                                                 │
│  (No "Team" option - it doesn't exist for Starter)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Educational Prompt (shown in relevant contexts):**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  👥 Work with a Team?                                          │
│                                                                 │
│  Upgrade to Professional to invite up to 4 team members.       │
│  Assign events, share contacts, and collaborate in real-time.  │
│                                                                 │
│  • Invite team members via email                                │
│  • Set custom permissions for each member                       │
│  • Collaborate on events together                               │
│                                                                 │
│  [Learn More]  [Upgrade to Professional]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Types

### Within an Account

| Type | Description | How Created |
|------|-------------|-------------|
| **Owner** | Created the account, pays for subscription, has all permissions (non-editable) | Signs up and chooses plan |
| **Member** | Invited by Owner/authorized member, has customizable permissions | Accepts email invitation |

### Owner Characteristics

- Exactly **one Owner per account** (cannot be changed)
- **All permissions always enabled** (cannot be restricted)
- **Cannot be removed** from the account
- **Responsible for billing** and subscription management
- Can **delete the entire account**

### Member Characteristics

- Joined via **email invitation**
- Permissions are **fully customizable** by Owner (or members with `can_manage_team`)
- Can be **removed** from the account at any time
- Can **leave** the account voluntarily
- Can belong to **multiple accounts** simultaneously

---

## Permissions System

### Available Permissions

```typescript
interface MemberPermissions {
  // Billing & Account
  can_view_billing: boolean;      // View invoices, current plan, payment history
  can_manage_billing: boolean;    // Change plan, update payment method, cancel subscription
  can_view_usage: boolean;        // View limits, consumption, storage used
  
  // Team Management
  can_manage_team: boolean;       // Invite members, remove members, edit permissions
  can_manage_settings: boolean;   // Edit account settings, integrations, branding
  
  // Content & Events
  can_create_events: boolean;     // Create new events
  can_view_all_events: boolean;   // View all events (false = only assigned events)
  can_delete_events: boolean;     // Delete events
}
```

### Permission Descriptions

| Permission | Description | Use Case |
|------------|-------------|----------|
| `can_view_billing` | See invoices, plan details, payment history | Accountant, Office Manager |
| `can_manage_billing` | Change plan, update card, cancel subscription | Business Partner, Co-owner |
| `can_view_usage` | See event count, storage used, limits | Team Lead, Senior Planner |
| `can_manage_team` | Invite/remove members, edit their permissions | HR, Team Lead |
| `can_manage_settings` | Edit account name, integrations, general settings | Office Manager |
| `can_create_events` | Create new events in the system | All Planners |
| `can_view_all_events` | See all events, not just assigned ones | Senior Planner, Coordinator |
| `can_delete_events` | Permanently delete events | Owner, Senior Staff |

### Default Permissions for New Members

When inviting a new member, these are the **default** (pre-checked) permissions:

```typescript
const defaultMemberPermissions = {
  can_view_billing: false,
  can_manage_billing: false,
  can_view_usage: false,
  can_manage_team: false,
  can_manage_settings: false,
  can_create_events: true,      // ✓ Default ON
  can_view_all_events: true,    // ✓ Default ON
  can_delete_events: false,
};
```

### "Full Owner Permissions" Option

When inviting or editing a member, there's a checkbox:

```
☐ Give full owner permissions
  This member will have access to everything, including
  billing, team management, and all settings.
```

When checked, **all permissions are set to `true`**. This is useful for:
- Business partners
- Co-owners
- Trusted senior employees

**Note:** This doesn't make them the Owner (Owner is permanent), but gives them equivalent access.

### Permission Dependencies

Some permissions have logical dependencies:

```typescript
// If can_manage_billing is true, can_view_billing must also be true
if (permissions.can_manage_billing) {
  permissions.can_view_billing = true;
}

// If can_manage_team is true, they should see usage to understand limits
// (This is a recommendation, not enforced)
```

---

## Database Schema

### Tables

```sql
-- ============================================
-- USERS TABLE
-- Stores authentication and profile data
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP,
  
  -- Profile
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);


-- ============================================
-- ACCOUNTS TABLE
-- Stores team/workspace data and subscription
-- ============================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,                    -- "Wedding Dreams"
  slug VARCHAR(100) UNIQUE,                      -- "wedding-dreams" (for URLs)
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES users(id),
  
  -- Subscription
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',   -- starter | professional | enterprise
  plan_period VARCHAR(20) DEFAULT 'monthly',     -- monthly | annual
  
  -- Billing (Stripe)
  billing_email VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_owner ON accounts(owner_id);
CREATE INDEX idx_accounts_slug ON accounts(slug);


-- ============================================
-- ACCOUNT_MEMBERS TABLE
-- Junction table with permissions
-- ============================================
CREATE TABLE account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Permissions (only apply if is_owner = FALSE)
  can_view_billing BOOLEAN DEFAULT FALSE,
  can_manage_billing BOOLEAN DEFAULT FALSE,
  can_view_usage BOOLEAN DEFAULT FALSE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  can_create_events BOOLEAN DEFAULT TRUE,
  can_view_all_events BOOLEAN DEFAULT TRUE,
  can_delete_events BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_members_account ON account_members(account_id);
CREATE INDEX idx_account_members_user ON account_members(user_id);


-- ============================================
-- INVITES TABLE
-- Pending invitations
-- ============================================
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Invite Details
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,            -- Secure random token for magic link
  
  -- Pre-set Permissions (applied when accepted)
  can_view_billing BOOLEAN DEFAULT FALSE,
  can_manage_billing BOOLEAN DEFAULT FALSE,
  can_view_usage BOOLEAN DEFAULT FALSE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  can_create_events BOOLEAN DEFAULT TRUE,
  can_view_all_events BOOLEAN DEFAULT TRUE,
  can_delete_events BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  invited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,                 -- created_at + 14 days
  accepted_at TIMESTAMP,                         -- NULL = pending
  
  -- Constraints
  UNIQUE(account_id, email)                      -- One invite per email per account
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_account ON invites(account_id);
```

### TypeScript Types

```typescript
// User
interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  email_verified_at?: Date;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

// Account
interface Account {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: 'starter' | 'professional' | 'enterprise';
  plan_period: 'monthly' | 'annual';
  billing_email?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  trial_ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Account Member (with permissions)
interface AccountMember {
  id: string;
  account_id: string;
  user_id: string;
  is_owner: boolean;
  
  // Permissions
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
  
  // Metadata
  invited_by?: string;
  invited_at?: Date;
  joined_at: Date;
  
  // Joined data (from queries)
  user?: User;
  account?: Account;
}

// Invite
interface Invite {
  id: string;
  account_id: string;
  email: string;
  token: string;
  
  // Pre-set permissions
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
  
  // Metadata
  invited_by: string;
  created_at: Date;
  expires_at: Date;
  accepted_at?: Date;
  
  // Computed
  is_pending: boolean;
  is_expired: boolean;
}
```

---

## User Flows

### Flow 1: Owner Sign Up

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. LANDING PAGE                                                │
│     └── [Start Free Trial]                                      │
│              │                                                  │
│              ▼                                                  │
│  2. SIGN UP FORM                                                │
│     ┌─────────────────────────────────────┐                    │
│     │ Email *                             │                    │
│     │ ┌─────────────────────────────────┐ │                    │
│     │ │ maria@weddingplanner.pt         │ │                    │
│     │ └─────────────────────────────────┘ │                    │
│     │                                     │                    │
│     │ Password *                          │                    │
│     │ ┌─────────────────────────────────┐ │                    │
│     │ │ ••••••••••••                    │ │                    │
│     │ └─────────────────────────────────┘ │                    │
│     │                                     │                    │
│     │ Your Name *                         │                    │
│     │ ┌─────────────────────────────────┐ │                    │
│     │ │ Maria Santos                    │ │                    │
│     │ └─────────────────────────────────┘ │                    │
│     │                                     │                    │
│     │ Company/Team Name *                 │                    │
│     │ ┌─────────────────────────────────┐ │                    │
│     │ │ Wedding Dreams                  │ │                    │
│     │ └─────────────────────────────────┘ │                    │
│     │                                     │                    │
│     │ [        Create Account         ]   │                    │
│     └─────────────────────────────────────┘                    │
│              │                                                  │
│              ▼                                                  │
│  3. CHOOSE PLAN                                                 │
│     ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│     │  Starter  │  │Pro ⭐ Best│  │Enterprise │               │
│     │   $29/mo  │  │  $69/mo   │  │  $149/mo  │               │
│     │           │  │           │  │           │               │
│     │  Solo     │  │  5 seats  │  │  25 seats │               │
│     │  [Select] │  │  [Select] │  │  [Select] │               │
│     └───────────┘  └───────────┘  └───────────┘               │
│              │                                                  │
│              ▼                                                  │
│  4. PAYMENT (Stripe Checkout)                                   │
│              │                                                  │
│              ▼                                                  │
│  5. DASHBOARD (as Owner)                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Process:**

```typescript
async function signUpOwner(data: SignUpData) {
  // 1. Create user
  const user = await db.users.create({
    email: data.email,
    password_hash: await hash(data.password),
    name: data.name,
  });
  
  // 2. Create account
  const account = await db.accounts.create({
    name: data.companyName,
    slug: generateSlug(data.companyName),
    owner_id: user.id,
    plan: data.selectedPlan,
    trial_ends_at: addDays(new Date(), 14),
  });
  
  // 3. Create membership (as owner)
  await db.account_members.create({
    account_id: account.id,
    user_id: user.id,
    is_owner: true,
    // All permissions true for owner (but is_owner flag is what matters)
    can_view_billing: true,
    can_manage_billing: true,
    can_view_usage: true,
    can_manage_team: true,
    can_manage_settings: true,
    can_create_events: true,
    can_view_all_events: true,
    can_delete_events: true,
    joined_at: new Date(),
  });
  
  return { user, account };
}
```

---

### Flow 2: Invite Team Member

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  OWNER/AUTHORIZED MEMBER INVITES                                │
│                                                                 │
│  Settings → Team → [Invite Member]                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │              Invite Team Member                             ││
│  │                                                             ││
│  │  Email *                                                    ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ sofia@email.com                                     │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  Permissions                                                ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ☐ Give full owner permissions                       │   ││
│  │  │   Full access to billing, team, settings, and all   │   ││
│  │  │   features. Use for business partners or co-owners. │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Billing & Account                                          ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ☐ View Billing       See invoices and plan details  │   ││
│  │  │ ☐ Manage Billing     Change plan, payment methods   │   ││
│  │  │ ☐ View Usage         See limits and consumption     │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Team & Settings                                            ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ☐ Manage Team        Invite/remove team members     │   ││
│  │  │ ☐ Manage Settings    Edit account settings          │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Events                                                     ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ☑ Create Events      Create new events              │   ││
│  │  │ ☑ View All Events    See all team events            │   ││
│  │  │ ☐ Delete Events      Permanently delete events      │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │                           [Cancel]  [Send Invitation]       ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Process:**

```typescript
async function inviteMember(accountId: string, inviterId: string, data: InviteData) {
  // 1. Verify inviter has permission
  const inviter = await db.account_members.findOne({
    account_id: accountId,
    user_id: inviterId,
  });
  
  if (!inviter.is_owner && !inviter.can_manage_team) {
    throw new ForbiddenError('No permission to invite members');
  }
  
  // 2. Check seat limit
  const account = await db.accounts.findOne({ id: accountId });
  const memberCount = await db.account_members.count({ account_id: accountId });
  const seatLimit = getPlanSeatLimit(account.plan);
  
  if (memberCount >= seatLimit) {
    throw new LimitReachedError('Team seat limit reached');
  }
  
  // 3. Check if email already in team
  const existingMember = await db.account_members
    .join('users', 'users.id = account_members.user_id')
    .where({ account_id: accountId, email: data.email })
    .first();
    
  if (existingMember) {
    throw new ConflictError('User already in team');
  }
  
  // 4. Check for existing pending invite
  const existingInvite = await db.invites.findOne({
    account_id: accountId,
    email: data.email,
    accepted_at: null,
  });
  
  if (existingInvite) {
    throw new ConflictError('Invite already pending for this email');
  }
  
  // 5. Create invite
  const invite = await db.invites.create({
    account_id: accountId,
    email: data.email,
    token: generateSecureToken(),
    invited_by: inviterId,
    expires_at: addDays(new Date(), 14),
    // Permissions
    ...data.permissions,
  });
  
  // 6. Send email
  await sendInviteEmail({
    to: data.email,
    inviterName: inviter.user.name,
    accountName: account.name,
    inviteUrl: `${APP_URL}/invite/${invite.token}`,
  });
  
  return invite;
}
```

---

### Flow 3: Accept Invite (New User)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  EMAIL RECEIVED                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Subject: Maria convidou-te para Wedding Dreams             ││
│  │                                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  Olá,                                                       ││
│  │                                                             ││
│  │  Maria Santos convidou-te para fazer parte da equipa        ││
│  │  "Wedding Dreams" no WedBoardPro.                           ││
│  │                                                             ││
│  │  [        Aceitar Convite        ]                          ││
│  │                                                             ││
│  │  Este convite expira em 14 dias.                            ││
│  │                                                             ││
│  │  Se não esperavas este convite, podes ignorar este email.   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                              │                                  │
│                              ▼                                  │
│                                                                 │
│  ACCEPT INVITE PAGE (New User)                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │         🎉 Junta-te a Wedding Dreams                        ││
│  │                                                             ││
│  │         Maria convidou-te para colaborar no                 ││
│  │         WedBoardPro.                                        ││
│  │                                                             ││
│  │  Email                                                      ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ sofia@email.com                      (não editável) │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  O teu nome *                                               ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ Sofia Costa                                         │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Criar password *                                           ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ••••••••••••                                        │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Confirmar password *                                       ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ••••••••••••                                        │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  [      Criar Conta e Juntar à Equipa      ]               ││
│  │                                                             ││
│  │  Ao continuar, aceitas os Termos de Serviço e              ││
│  │  Política de Privacidade.                                   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Accept Invite (Existing User)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ACCEPT INVITE PAGE (User Already Exists)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │         🎉 Junta-te a Wedding Dreams                        ││
│  │                                                             ││
│  │         Maria convidou-te para colaborar no                 ││
│  │         WedBoardPro.                                        ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │  ℹ️  Já tens uma conta WedBoardPro                   │   ││
│  │  │                                                      │   ││
│  │  │  Faz login com a tua conta existente para aceitar   │   ││
│  │  │  o convite e juntar-te à equipa.                    │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Email                                                      ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ sofia@email.com                      (não editável) │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Password *                                                 ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ ••••••••••••                                        │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  [       Login e Juntar à Equipa       ]                   ││
│  │                                                             ││
│  │  Esqueceste a password? [Recuperar]                         ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Process:**

```typescript
async function acceptInvite(token: string, data: AcceptInviteData) {
  // 1. Find and validate invite
  const invite = await db.invites.findOne({ token });
  
  if (!invite) {
    throw new NotFoundError('Invalid invite');
  }
  
  if (invite.accepted_at) {
    throw new ConflictError('Invite already accepted');
  }
  
  if (new Date() > invite.expires_at) {
    throw new ExpiredError('Invite has expired');
  }
  
  // 2. Check if user exists
  let user = await db.users.findOne({ email: invite.email });
  
  if (user) {
    // Existing user - verify password
    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Invalid password');
    }
  } else {
    // New user - create account
    user = await db.users.create({
      email: invite.email,
      password_hash: await hash(data.password),
      name: data.name,
    });
  }
  
  // 3. Create membership with invite's permissions
  await db.account_members.create({
    account_id: invite.account_id,
    user_id: user.id,
    is_owner: false,
    can_view_billing: invite.can_view_billing,
    can_manage_billing: invite.can_manage_billing,
    can_view_usage: invite.can_view_usage,
    can_manage_team: invite.can_manage_team,
    can_manage_settings: invite.can_manage_settings,
    can_create_events: invite.can_create_events,
    can_view_all_events: invite.can_view_all_events,
    can_delete_events: invite.can_delete_events,
    invited_by: invite.invited_by,
    invited_at: invite.created_at,
    joined_at: new Date(),
  });
  
  // 4. Mark invite as accepted
  await db.invites.update({ id: invite.id }, { accepted_at: new Date() });
  
  // 5. Return user and account for session creation
  const account = await db.accounts.findOne({ id: invite.account_id });
  
  return { user, account };
}
```

---

## Multi-Team Support

### Team Switcher

Only shown when user belongs to more than one team.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  HEADER (User in 2+ teams)                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Logo]  Wedding Dreams ▼              🔔  👤 Sofia        ││
│  └──────────────┬──────────────────────────────────────────────┘│
│                 │                                               │
│                 ▼                                               │
│  ┌─────────────────────────┐                                   │
│  │                         │                                   │
│  │  Your Teams             │                                   │
│  │                         │                                   │
│  │  ┌───────────────────┐  │                                   │
│  │  │ ✓ Wedding Dreams  │  │  ← Current (checkmark)            │
│  │  │   Owner: Maria    │  │                                   │
│  │  └───────────────────┘  │                                   │
│  │                         │                                   │
│  │  ┌───────────────────┐  │                                   │
│  │  │ ○ Elite Events    │  │  ← Other team                     │
│  │  │   Owner: Carlos   │  │                                   │
│  │  └───────────────────┘  │                                   │
│  │                         │                                   │
│  └─────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


HEADER (User in only 1 team - NO dropdown)
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Wedding Dreams                   🔔  👤 Sofia         │
└─────────────────────────────────────────────────────────────────┘
        ↑
        No dropdown arrow, not clickable
```

### Context Management

```typescript
// Store current account in session/context
interface AppContext {
  user: User;
  currentAccount: Account;
  membership: AccountMember;  // User's membership in current account
  accounts: Account[];        // All accounts user belongs to
}

// Switching accounts
async function switchAccount(userId: string, accountId: string) {
  // Verify user is member of this account
  const membership = await db.account_members.findOne({
    user_id: userId,
    account_id: accountId,
  });
  
  if (!membership) {
    throw new ForbiddenError('Not a member of this account');
  }
  
  // Update session
  await updateSession({ currentAccountId: accountId });
  
  // Redirect to dashboard
  redirect('/dashboard');
}
```

---

## UI Components

### Sidebar (Dynamic by Permissions)

```typescript
function Sidebar({ membership }: { membership: AccountMember }) {
  const isOwner = membership.is_owner;
  
  const items = [
    { name: 'Dashboard', href: '/dashboard', show: true },
    { name: 'Events', href: '/events', show: true },
    { name: 'Contacts', href: '/contacts', show: true },
    { name: 'Calendar', href: '/calendar', show: true },
    { name: 'Chat', href: '/chat', show: true },
  ];
  
  const settingsItems = [
    { name: 'Profile', href: '/settings/profile', show: true },
    { 
      name: 'Account', 
      href: '/settings/account', 
      show: isOwner || membership.can_manage_settings 
    },
    { 
      name: 'Team', 
      href: '/settings/team', 
      show: isOwner || membership.can_manage_team 
    },
    { 
      name: 'Billing', 
      href: '/settings/billing', 
      show: isOwner || membership.can_view_billing 
    },
    { 
      name: 'Usage', 
      href: '/settings/usage', 
      show: isOwner || membership.can_view_usage 
    },
    { 
      name: 'Integrations', 
      href: '/settings/integrations', 
      show: isOwner || membership.can_manage_settings 
    },
  ];
  
  return (
    <nav>
      {items.filter(i => i.show).map(item => (
        <NavLink key={item.href} href={item.href}>{item.name}</NavLink>
      ))}
      
      <NavSection title="Settings">
        {settingsItems.filter(i => i.show).map(item => (
          <NavLink key={item.href} href={item.href}>{item.name}</NavLink>
        ))}
      </NavSection>
    </nav>
  );
}
```

### Team Members Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Settings → Team                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Team Members                              [Invite Member]  ││
│  │  3 of 5 seats used                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  👤 Maria Santos                                   OWNER    ││
│  │     maria@weddingplanner.pt                                 ││
│  │     ─────────────────────────────────────────────────────   ││
│  │     Full access · Owner permissions cannot be changed       ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  👤 Sofia Costa                           [Edit] [Remove]   ││
│  │     sofia@email.com                                         ││
│  │     ─────────────────────────────────────────────────────   ││
│  │     Billing · Usage · Team · Events                         ││
│  │     (labels showing active permissions)                     ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  👤 João Silva                            [Edit] [Remove]   ││
│  │     joao@email.com                                          ││
│  │     ─────────────────────────────────────────────────────   ││
│  │     Events only                                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Pending Invites                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  ✉️  ana@email.com                      [Resend] [Cancel]   ││
│  │      Invited 2 days ago · Expires in 12 days                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Edit Member Permissions Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Edit Permissions                                          [X]  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  👤 Sofia Costa                                             ││
│  │     sofia@email.com                                         ││
│  │     Member since Jan 15, 2026                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Give full owner permissions                           │   │
│  │   Full access to billing, team, settings, and all       │   │
│  │   features. Use for business partners or co-owners.     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Or customize:                                                  │
│                                                                 │
│  Billing & Account                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ View Billing         See invoices and plan            │   │
│  │ ☐ Manage Billing       Change plan, payments            │   │
│  │ ☑ View Usage           See limits and consumption       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Team & Settings                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Manage Team          Invite/remove members            │   │
│  │ ☐ Manage Settings      Edit account settings            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Events                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Create Events        Create new events                │   │
│  │ ☑ View All Events      See all team events              │   │
│  │ ☐ Delete Events        Permanently delete events        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                    [Cancel]  [Save Changes]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Team Management

```typescript
// GET /api/team/members
// List all members and pending invites
// Required: is_owner OR can_manage_team
{
  members: AccountMember[],
  invites: Invite[],
  seats: { used: number, total: number }
}

// POST /api/team/invite
// Send invitation
// Required: is_owner OR can_manage_team
// Body: { email: string, permissions: Permissions }

// DELETE /api/team/invite/:id
// Cancel pending invite
// Required: is_owner OR can_manage_team

// POST /api/team/invite/:id/resend
// Resend invitation email
// Required: is_owner OR can_manage_team

// PATCH /api/team/members/:id
// Update member permissions
// Required: is_owner OR can_manage_team
// Body: { permissions: Permissions }

// DELETE /api/team/members/:id
// Remove member from team
// Required: is_owner OR can_manage_team
// Cannot remove owner

// POST /api/team/leave
// Leave current team (self)
// Cannot be used by owner
```

### Invite Acceptance

```typescript
// GET /api/invite/:token
// Get invite details (public)
{
  account_name: string,
  inviter_name: string,
  email: string,
  expires_at: Date,
  user_exists: boolean  // If email already has account
}

// POST /api/invite/:token/accept
// Accept invitation
// Body (new user): { name: string, password: string }
// Body (existing): { password: string }
```

### Account Switching

```typescript
// GET /api/accounts
// List user's accounts
{
  accounts: Array<{
    id: string,
    name: string,
    slug: string,
    owner_name: string,
    is_owner: boolean,
    is_current: boolean
  }>
}

// POST /api/accounts/:id/switch
// Switch to different account
// Returns new session/context
```

---

## Edge Cases

### 1. Downgrading Plan with Team

When downgrading from Professional (5 seats) to Starter (1 seat):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Cannot Downgrade                                           │
│                                                                 │
│  You currently have 3 team members. The Starter plan           │
│  is for solo users only.                                       │
│                                                                 │
│  To downgrade to Starter:                                       │
│  1. Remove all team members from Settings → Team                │
│  2. Return here to change your plan                             │
│                                                                 │
│  [Go to Team Settings]                    [Keep Current Plan]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Owner Tries to Leave

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Cannot Leave Team                                          │
│                                                                 │
│  You are the owner of this account. Owners cannot leave.       │
│                                                                 │
│  If you want to close this account:                             │
│  Settings → Account → Delete Account                            │
│                                                                 │
│  [OK]                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Invite to Email Already in Team

```typescript
// Backend returns error
{
  error: 'conflict',
  message: 'This email is already a member of your team',
  code: 'ALREADY_MEMBER'
}
```

### 4. User Removed While Logged In

When a member is removed, on their next API call:

```typescript
// Middleware checks membership
const membership = await getMembership(userId, accountId);

if (!membership) {
  // Clear session's current account
  // If user has other teams, switch to first one
  // If no other teams, show "You've been removed" page
  
  throw new RemovedFromTeamError();
}
```

### 5. Invite Expired

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⏰ Invite Expired                                              │
│                                                                 │
│  This invitation has expired.                                   │
│                                                                 │
│  Please ask Maria to send you a new invitation to join         │
│  Wedding Dreams.                                                │
│                                                                 │
│  [Go to Login]                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Seat Limit Reached

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Team Full                                                  │
│                                                                 │
│  You've reached the limit of 5 team members on the             │
│  Professional plan.                                            │
│                                                                 │
│  Upgrade to Enterprise for up to 25 team members.              │
│                                                                 │
│  [Upgrade to Enterprise]               [Maybe Later]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Permission Checks

Every API endpoint must verify:

1. **Authentication** - User is logged in
2. **Membership** - User belongs to the account
3. **Permission** - User has required permission for action

```typescript
// Middleware example
async function requirePermission(permission: keyof Permissions) {
  return async (req, res, next) => {
    const membership = await getMembership(req.userId, req.accountId);
    
    if (!membership) {
      return res.status(403).json({ error: 'Not a member' });
    }
    
    // Owners always have all permissions
    if (membership.is_owner) {
      return next();
    }
    
    if (!membership[permission]) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permission 
      });
    }
    
    next();
  };
}

// Usage
router.post('/team/invite', 
  requirePermission('can_manage_team'),
  inviteMemberHandler
);
```

### Invite Token Security

- Tokens are cryptographically random (32+ bytes)
- Tokens expire after 14 days
- Tokens are single-use (marked as accepted)
- Tokens are scoped to specific email (cannot be used by different email)

---

## Summary

| Decision | Implementation |
|----------|----------------|
| Team member creation | Invite-only via email |
| Permission system | Granular (not fixed roles) |
| Billing/Usage visibility | Owner by default, customizable |
| Starter plan | Solo only, no team features |
| One email = One account | Yes, enforced |
| Multi-team support | Yes, with team switcher |
| Team switcher visibility | Only if user has 2+ teams |
| Full permissions option | Checkbox to give all owner permissions |

