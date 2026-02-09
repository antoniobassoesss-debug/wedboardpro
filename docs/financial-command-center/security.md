# Security & Compliance Documentation

## Financial Command Center

---

## 1. Data Classification

### Data Sensitivity Levels

| Data Type | Classification | Access Control | Retention |
|-----------|---------------|----------------|-----------|
| Client markup percentages | Confidential | Planner only | Duration + 7 years |
| Actual vendor costs | Internal | Planner, team | Duration + 7 years |
| Budget line items | Internal | Planner, team, client filtered | Duration + 7 years |
| Client-facing totals | Public | Client via portal | Duration + 2 years |
| Payment history | Confidential | Finance role only | 7 years legal |
| Audit logs | Restricted | Admin only | Perpetuity |

---

## 2. Role-Based Access Control

### Role Definitions

```typescript
type BudgetRole = 
  | 'owner'           // Full access to own budgets
  | 'team_member'     // Access per wedding assignment
  | 'finance'         // Payment tracking only
  | 'client'          // Read-only via shared link
  | 'auditor'         // Read-only for compliance
  | 'admin';          // System-wide access
```

### Permission Matrix

| Action | Owner | Team | Finance | Client | Auditor | Admin |
|--------|-------|------|---------|--------|---------|-------|
| Create budget | Yes | No | No | No | No | Yes |
| Edit line items | Yes | Yes | No | No | No | Yes |
| View markup | Yes | Yes | No | No | No | Yes |
| View vendor costs | Yes | Yes | Yes | No | No | Yes |
| Record payments | Yes | Yes | Yes | No | No | Yes |
| Export data | Yes | Yes | No | If enabled | Yes | Yes |
| Lock baseline | Yes | No | No | No | No | Yes |
| Approve budget | Yes | No | No | Via portal | No | Yes |
| View audit log | Yes | No | No | No | Yes | Yes |
| Delete budget | Yes | No | No | No | No | Yes |
| Manage client links | Yes | No | No | N/A | No | Yes |

### Supabase RLS Policies

```sql
-- Budget headers - owners and team members
CREATE POLICY "Owners can fully access own budgets"
ON budget_headers FOR ALL
USING (
  planner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM wedding_team_members
    WHERE wedding_id = budget_headers.wedding_id
    AND user_id = auth.uid()
    AND role IN ('planner', 'coordinator')
  )
);

-- Team members see budgets for assigned weddings
CREATE POLICY "Team members see assigned wedding budgets"
ON budget_headers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM wedding_team_members
    WHERE wedding_id = budget_headers.wedding_id
    AND user_id = auth.uid()
  )
);

-- Finance role sees payment data
CREATE POLICY "Finance role sees payment details"
ON budget_line_items FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'finance'
  )
  OR EXISTS (
    SELECT 1 FROM wedding_team_members
    WHERE wedding_id = budget_line_items.wedding_id
    AND user_id = auth.uid()
  )
);
```

---

## 3. Client Portal Security

### Secure Link Generation

```typescript
interface ClientSession {
  id: UUID;
  budget_header_id: UUID;
  session_token: UUID;
  access_code?: string;
  permissions: {
    can_view_costs: boolean;
    can_view_markup: boolean;
    can_download: boolean;
    can_approve: boolean;
  };
  restrictions: {
    ip_whitelist?: string[];
    user_agent_restriction?: string;
    max_access_count?: number;
    expires_at: Timestamp;
  };
  tracking: {
    created_at: Timestamp;
    created_by: UUID;
    last_accessed_at?: Timestamp;
    access_count: number;
  };
}

function generateClientLink(
  budgetId: UUID,
  permissions: ClientPermissions,
  options: LinkOptions
): ClientSession {
  const session: ClientSession = {
    id: uuidv4(),
    budget_header_id: budgetId,
    session_token: uuidv4(),
    access_code: options.requirePin ? generatePin() : undefined,
    permissions,
    restrictions: {
      ip_whitelist: options.ipWhitelist,
      max_access_count: options.maxViews,
      expires_at: options.expiresAt || addDays(now(), 30),
    },
    tracking: {
      created_at: now(),
      created_by: auth.uid(),
      access_count: 0,
    },
  };

  await insert('client_budget_sessions', session);

  const baseUrl = process.env.CLIENT_PORTAL_URL;
  const url = `${baseUrl}/view/${session.session_token}`;
  
  if (session.access_code) {
    return { ...session, url_with_pin: `${url}?code=${session.access_code}` };
  }
  
  return { ...session, url };
}
```

### Access Control Middleware

```typescript
async function validateClientAccess(
  request: Request,
  sessionToken: UUID
): Promise<ClientAccessResult> {
  const session = await getClientSession(sessionToken);
  
  if (!session) {
    return { allowed: false, reason: 'invalid_session' };
  }

  if (session.restrictions.expires_at < now()) {
    return { allowed: false, reason: 'expired' };
  }

  if (
    session.restrictions.max_access_count &&
    session.tracking.access_count >= session.restrictions.max_access_count
  ) {
    return { allowed: false, reason: 'max_views_exceeded' };
  }

  if (session.restrictions.ip_whitelist?.length) {
    const clientIp = getClientIp(request);
    if (!session.restrictions.ip_whitelist.includes(clientIp)) {
      await logSecurityEvent({
        type: 'ip_mismatch',
        session_id: session.id,
        expected_ips: session.restrictions.ip_whitelist,
        received_ip: clientIp,
      });
      return { allowed: false, reason: 'ip_restricted' };
    }
  }

  const providedCode = request.url.searchParams.get('code');
  if (session.access_code && providedCode !== session.access_code) {
    return { allowed: false, reason: 'invalid_access_code' };
  }

  await update('client_budget_sessions', session.id, {
    tracking: {
      ...session.tracking,
      last_accessed_at: now(),
      access_count: session.tracking.access_count + 1,
    },
  });

  await logClientAccess({
    session_id: session.id,
    accessed_at: now(),
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent'),
  });

  return { 
    allowed: true, 
    permissions: session.permissions,
    budget_id: session.budget_header_id,
  };
}
```

### Data Filtering for Client Mode

```typescript
interface ClientSafeBudget {
  items: ClientSafeLineItem[];
  summary: ClientSafeSummary;
}

function filterForClientMode(
  budget: FullBudget,
  permissions: ClientPermissions
): ClientSafeBudget {
  return {
    items: budget.items
      .filter(item => item.visibility === 'client_visible')
      .map(item => ({
        id: item.id,
        item_name: item.item_name,
        category_type: item.category_type,
        description: item.client_friendly_description || item.description,
        estimated_cost: item.target_budget_cents,
        final_price: item.final_client_price_cents,
        status: item.status,
        vendor_name: permissions.can_view_costs ? item.vendor?.name : undefined,
        payment_due_date: item.payment_due_date,
      })),
    summary: {
      total_budget: budget.total_target_budget_cents,
      total_allocated: budget.total_contracted_cents,
      total_paid: budget.total_paid_cents,
      remaining: budget.total_target_budget_cents - budget.total_contracted_cents,
    },
  };
}
```

---

## 4. GDPR Compliance

### Data Minimization

```typescript
const CLIENT_DATA_FIELDS = [
  'id',
  'item_name',
  'category_type',
  'client_friendly_description',
  'target_budget_cents',
  'contracted_amount_cents',
  'payment_due_date',
  'status',
] as const;

const INTERNAL_DATA_FIELDS = [
  ...CLIENT_DATA_FIELDS,
  'vendor_id',
  'paid_to_date_cents',
  'markup_amount_cents',
  'markup_percentage',
  'internal_notes',
  'actual_spent_cents',
] as const;
```

### Right to Erasure Handling

```typescript
async function handleDataDeletionRequest(
  userId: UUID,
  scope: 'complete' | 'budgets_only' | 'financial_data_only'
): Promise<DeletionResult> {
  const results: DeletionResult = {
    success: true,
    deleted_tables: [],
    errors: [],
  };

  try {
    await update('budget_headers', { deleted_at: now() }, {
      planner_id: userId,
      deleted_at: null,
    });

    await update('budget_line_items', { deleted_at: now() }, {
      wedding_id: IN (
        SELECT id FROM weddings WHERE planner_id = userId
      ),
      deleted_at: null,
    });

    await update('budget_audit_log', { 
      changed_by: null,
      change_reason: 'User data deletion request',
    }, {
      budget_header_id: IN (
        SELECT id FROM budget_headers WHERE planner_id = userId
      ),
    });

    await deleteFrom('client_budget_sessions').where({
      budget_header_id: IN (
        SELECT id FROM budget_headers WHERE planner_id = userId
      ),
    });

    results.deleted_tables.push(
      'client_sessions',
      'budget_headers soft deleted',
      'budget_line_items soft deleted',
      'audit_logs anonymized'
    );

  } catch (error) {
    results.success = false;
    results.errors.push(error.message);
  }

  return results;
}
```

### Data Portability Export

```typescript
async function exportUserData(userId: UUID): Promise<ExportPackage> {
  const budgets = await query(`
    SELECT * FROM budget_headers 
    WHERE planner_id = $1 AND deleted_at IS NULL
  `, [userId]);

  const lineItems = await query(`
    SELECT * FROM budget_line_items 
    WHERE wedding_id IN (SELECT id FROM weddings WHERE planner_id = $1)
    AND deleted_at IS NULL
  `, [userId]);

  const sessions = await query(`
    SELECT * FROM client_budget_sessions
    WHERE budget_header_id IN (SELECT id FROM budget_headers WHERE planner_id = $1)
  `, [userId]);

  return {
    export_date: now(),
    user_id: userId,
    data: {
      budgets,
      line_items: lineItems,
      client_sessions: sessions,
    },
    format: 'json',
  };
}
```

---

## 5. Audit Logging

### Comprehensive Audit Trail

```typescript
interface AuditLogEntry {
  id: UUID;
  timestamp: Timestamp;
  user_id: UUID;
  action_type: AuditAction;
  resource_type: 'budget_header' | 'budget_line_item' | 'client_session';
  resource_id: UUID;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  context: {
    ip_address: string;
    user_agent: string;
    session_id: UUID;
  };
  is_client_action: boolean;
}

enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOCK = 'lock_baseline',
  UNLOCK = 'unlock_baseline',
  SHARE = 'create_client_session',
  APPROVE = 'client_approval',
  EXPORT = 'export_data',
}

async function logAuditEvent(
  userId: UUID,
  action: AuditAction,
  resourceType: string,
  resourceId: UUID,
  changes: Record<string, { old: any; new: any }>,
  context: AuditContext
): Promise<void> {
  await insert('budget_audit_log', {
    user_id: userId,
    action_type: action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes: Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => ({
      field,
      old_value: sanitizeForLog(oldValue),
      new_value: sanitizeForLog(newValue),
    })),
    context: {
      ip_address: context.ip,
      user_agent: context.userAgent,
      session_id: context.sessionId,
    },
    timestamp: now(),
  });
}
```

### Audit Log Queries

```sql
-- Complete history of a budget
SELECT * FROM budget_audit_log
WHERE budget_header_id = 'uuid'
ORDER BY timestamp DESC;

-- All changes by specific user
SELECT * FROM budget_audit_log
WHERE changed_by = 'uuid'
ORDER BY timestamp DESC;

-- All approvals in date range
SELECT * FROM budget_audit_log
WHERE action_type = 'client_approval'
AND timestamp BETWEEN 'start' AND 'end';
```

---

## 6. API Security

### Rate Limiting

```typescript
const RATE_LIMITS = {
  'budget:read': { points: 100, duration: 60 },
  'budget:write': { points: 20, duration: 60 },
  'budget:export': { points: 10, duration: 60 },
  'client:portal': { points: 50, duration: 60 },
};

async function rateLimit(key: string, limit: RateLimitConfig): Promise<boolean> {
  const current = await redis.incr(`ratelimit:${key}`);
  if (current === 1) {
    await redis.expire(`ratelimit:${key}`, limit.duration);
  }
  return current <= limit.points;
}
```

### Input Validation

```typescript
import { z } from 'zod';

const BudgetLineItemSchema = z.object({
  item_name: z.string().min(1).max(255),
  category_type: z.enum([
    'venue', 'catering', 'photography', 'videography',
    'florals', 'entertainment', 'decoration', 'transportation',
    'accommodation', 'attire', 'beauty', 'stationery',
    'cakes', 'rental', 'insurance', 'legal', 'marketing',
    'miscellaneous', 'taxes', 'fees'
  ]),
  target_budget_cents: z.number().int().min(0),
  contracted_amount_cents: z.number().int().min(0),
  paid_to_date_cents: z.number().int().min(0),
  markup_percentage: z.number().min(0).max(100).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  is_taxable: z.boolean().optional(),
  payment_due_date: z.string().datetime().optional(),
  visibility: z.enum(['client_visible', 'internal_only']).optional(),
});

function validateBudgetItem(data: unknown): BudgetLineItem {
  return BudgetLineItemSchema.parse(data);
}
```

---

## 7. Encryption

### Data at Rest

```sql
CREATE EXTENSION pgcrypto;

CREATE OR REPLACE FUNCTION encrypt_amount(amount_cents BIGINT)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(
    amount_cents::text,
    current_setting('app.encryption_key'),
    'cipher-algo=aes256'
  );
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_amount(encrypted BYTEA)
RETURNS BIGINT AS $$
  SELECT (pgp_sym_decrypt(
    encrypted,
    current_setting('app.encryption_key')
  ))::BIGINT;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Data in Transit

```typescript
const TLS_CONFIG = {
  minVersion: 'TLSv1.2',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256',
};

function securityHeaders(request: Request): Response {
  return new Response(request.body, {
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  });
}
```

---

## 8. Security Checklist

### Before Production

- Enable RLS on all budget tables
- Implement role-based permissions
- Set up audit logging
- Configure rate limiting
- Enable TLS 1.2+ on all endpoints
- Implement client session security
- Set up GDPR data export deletion
- Configure encryption at rest
- Complete penetration testing
- Conduct security review
- Document incident response plan

### Monitoring

```typescript
async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  await insert('security_events', {
    ...event,
    timestamp: now(),
    resolved: false,
  });

  if (event.severity === 'critical') {
    await sendAlert({
      type: 'security_incident',
      event: event.type,
      details: event,
    });
  }
}

const SECURITY_EVENTS = [
  'failed_login',
  'rate_limit_exceeded',
  'suspicious_export',
  'client_session_anomaly',
  'data_deletion_request',
  'permission_violation',
  'audit_log_modification',
];
```

---

## 9. Compliance Notes

### PCI-DSS

- Never store raw credit card numbers
- Use Stripe Elements for card input
- Tokenize all payment data
- Stripe handles PCI compliance

### SOC 2

- Maintain audit logs for 7 years
- Document all data flows
- Annual security assessments
- Incident response procedures

### GDPR

- Lawful basis: Contract performance
- Data minimization: Only collect what is needed
- Right to access: Export functionality
- Right to erasure: Soft delete + anonymize
- Data portability: JSON export
- Privacy by design: Client/internal mode separation
