# WedBoardPro Plan Limits & Features

This file defines all limits and features for each subscription plan.

> **Pricing Strategy:** Value-based pricing with events as primary value metric. Structure follows Good-Better-Best psychology with Professional as the "hero" tier (60-70% target conversion).

## Plans Overview

### Starter Plan
- **Name**: `starter`
- **Display Name**: Starter
- **Monthly Price**: $29
- **Target**: Solo planners starting out or testing the platform

### Professional Plan ⭐ (Most Popular)
- **Name**: `professional`
- **Display Name**: Professional
- **Monthly Price**: $69
- **Target**: Growing wedding planning businesses

### Enterprise Plan
- **Name**: `enterprise`
- **Display Name**: Enterprise
- **Monthly Price**: $149
- **Target**: Large planning teams, agencies, and multi-planner firms

---

## Feature Limits by Plan

### Events (Primary Value Metric)
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Active Events | 8 | 30 | unlimited |
| Archive Old Events | ✅ | ✅ | ✅ |
| Event Templates | ❌ | ✅ | ✅ |

**Enforcement Points:**
- `POST /api/events` - Check before creating new event
- Frontend: `NewProjectModal.tsx` - Show upgrade prompt if limit reached
- Dashboard: Show events usage indicator (e.g., "6/8 active events")

**Upgrade Trigger:** When planner has 6+ active events on Starter, show gentle nudge to Professional.

---

### Team Members
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Team Members | 1 | 8 | 25 |
| Invite Members | ✅ | ✅ | ✅ |
| Role-Based Permissions | ❌ | ✅ | ✅ |
| Activity Log | ❌ | ✅ | ✅ |

**Enforcement Points:**
- `POST /api/teams/invite` - Check before sending invitation
- Frontend: Team management UI - Show upgrade prompt if limit reached
- Starter plan: Hide team invite UI entirely

**Note:** Starter is solo-only by design. This is a key upgrade trigger to Professional.

---

### Contacts & Suppliers
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Contacts |unlimited | unlimited | unlimited |
| Max Suppliers/Vendors | unlimited | unlimited | unlimited |
| Team Shared Contacts | ❌ | ✅ | ✅ |
| Private Contacts | ✅ | ✅ | ✅ |
| Contact Import (CSV) | ✅ | ✅ | ✅ |
| Contact Export | ✅ | ✅ | ✅ |

**Enforcement Points:**
- `POST /api/contacts` - Check before creating contact
- `POST /api/suppliers` - Check before creating supplier
- Frontend: Show upgrade prompt in contact/supplier forms when approaching limit

---

### Storage & Files
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Storage Limit | 5 GB | 50 GB | 500 GB |
| File Types | All | All | All |


**Enforcement Points:**
- File upload endpoints - Check storage before upload
- Frontend: Show storage usage in dashboard/settings
- Warning at 80% capacity, block at 100%

---



### Guest Management
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Guests per Event | unlimited | unlimited | unlimited |
| RSVP Tracking | ✅ | ✅ | ✅ |
| Seating Charts | ✅ | ✅ | ✅ |
| Meal Preferences | ✅ | ✅ | ✅ |
| Guest Import (CSV) | ✅ | ✅ | ✅ |
| Guest Export | ✅ | ✅ | ✅ |
| Plus-One Management | ✅ | ✅ | ✅ |
| Dietary Restrictions Tracking | ✅ | ✅ | ✅ |
| Guest Groups/Tables | ✅ | ✅ | ✅ |
| QR Code Check-in | ✅ | ✅ | ✅ |



---

### Tasks & To-Do
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Tasks per Event | 30 | 150 | unlimited |
| Task Assignment | ❌ | ✅ | ✅ |
| Recurring Tasks | ❌ | ✅ | ✅ |
| Task Templates | ❌ | ✅ | ✅ |
| Task Dependencies | ❌ | ✅ | ✅ |
| Due Date Reminders | ✅ | ✅ | ✅ |
| Priority Levels | ✅ | ✅ | ✅ |

**Enforcement Points:**
- Task creation - Check limit
- Template/recurring features - Check plan
- Assignment dropdown - Show upgrade prompt on Starter

---

### Budget & Financial
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Budget Tracking | ✅ | ✅ | ✅ |
| Expense Categories | ✅ | ✅ | ✅ |
| Payment Tracking | Basic | Advanced | Advanced |



---

### CRM & Client Management
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Client Profiles | 150 | 1000 | unlimited |
| Custom Fields | 3 | 15 | unlimited |
| Client Portal | Basic | Full | Full |


---

---

### Chat & Collaboration
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Direct Messages | ✅ | ✅ | ✅ |
| File Sharing in Chat | ✅ | ✅ | ✅ |
 **Enforcement Points:**
 sinve the starter plan doesnt have any team members, when going to the chat tab with starter plan get a message saying its only available to the other plans


---

## Implementation Notes

### Database Storage
All limits should be stored in the `subscription_plans` table as JSONB:

```json
{
  "starter": {
    "price": {
      "monthly": 29,
      "annual": 24
    },
    "events": {
      "maxActive": 8,
      "maxPerMonth": 12,
      "canArchive": true,
      "templates": false
    },
    "team": {
      "maxMembers": 1,
      "canInvite": false,
      "rolePermissions": false
    },
    "contacts": {
      "maxContacts": 50,
      "maxSuppliers": 30,
      "csvImport": false,
      "teamShared": false
    },
    "storage": {
      "maxGb": 5,
      "maxFileSizeMb": 25,
      "versioning": false
    },
    "layouts": {
      "maxPerEvent": 2,
      "advancedTools": false,
      "customTemplates": false,
      "exportHighRes": false,
      "exportToScale": false,
      "preview3d": false
    },
    "guests": {
      "maxPerEvent": 100,
      "csvImport": false,
      "qrCheckin": false
    },
    "tasks": {
      "maxPerEvent": 30,
      "assignment": false,
      "recurringTasks": false,
      "taskTemplates": false,
      "dependencies": false
    },
    "budget": {
      "invoiceGeneration": false,
      "financialReports": false,
      "paymentReminders": false,
      "multiCurrency": false
    },
    "crm": {
      "customFields": 3,
      "clientPortal": "basic",
      "emailIntegration": false,
      "leadPipeline": false,
      "automatedWorkflows": false
    },
    "calendar": {
      "multiEvent": false,
      "templates": false,
      "calendarSync": false
    },
    "chat": {
      "historyDays": 30,
      "videoCalls": false
    },
    "integrations": {
      "zapier": false,
      "apiAccess": false,
      "webhooks": false,
      "quickbooks": false
    },
    "support": {
      "responseHours": 48,
      "priority": false,
      "phone": false,
      "accountManager": false
    },
    "branding": {
      "custom": false,
      "whiteLabel": false,
      "removeBadge": false
    }
  },
  "professional": {
    "price": {
      "monthly": 69,
      "annual": 59
    },
    "events": {
      "maxActive": 30,
      "maxPerMonth": 50,
      "canArchive": true,
      "templates": true
    },
    "team": {
      "maxMembers": 5,
      "canInvite": true,
      "rolePermissions": true
    },
    "contacts": {
      "maxContacts": 300,
      "maxSuppliers": 200,
      "csvImport": true,
      "teamShared": true
    },
    "storage": {
      "maxGb": 50,
      "maxFileSizeMb": 100,
      "versioning": true
    },
    "layouts": {
      "maxPerEvent": 10,
      "advancedTools": true,
      "customTemplates": true,
      "exportHighRes": true,
      "exportToScale": true,
      "preview3d": false
    },
    "guests": {
      "maxPerEvent": 350,
      "csvImport": true,
      "qrCheckin": true
    },
    "tasks": {
      "maxPerEvent": 150,
      "assignment": true,
      "recurringTasks": true,
      "taskTemplates": true,
      "dependencies": true
    },
    "budget": {
      "invoiceGeneration": true,
      "financialReports": true,
      "paymentReminders": true,
      "multiCurrency": true
    },
    "crm": {
      "customFields": 15,
      "clientPortal": "full",
      "emailIntegration": true,
      "leadPipeline": true,
      "automatedWorkflows": false
    },
    "calendar": {
      "multiEvent": true,
      "templates": true,
      "calendarSync": false
    },
    "chat": {
      "historyDays": 365,
      "videoCalls": false
    },
    "integrations": {
      "zapier": true,
      "apiAccess": false,
      "webhooks": false,
      "quickbooks": true
    },
    "support": {
      "responseHours": 24,
      "priority": false,
      "phone": false,
      "accountManager": false
    },
    "branding": {
      "custom": false,
      "whiteLabel": false,
      "removeBadge": false
    }
  },
  "enterprise": {
    "price": {
      "monthly": 149,
      "annual": 129
    },
    "events": {
      "maxActive": -1,
      "maxPerMonth": -1,
      "canArchive": true,
      "templates": true
    },
    "team": {
      "maxMembers": 25,
      "canInvite": true,
      "rolePermissions": true
    },
    "contacts": {
      "maxContacts": -1,
      "maxSuppliers": -1,
      "csvImport": true,
      "teamShared": true
    },
    "storage": {
      "maxGb": 500,
      "maxFileSizeMb": 500,
      "versioning": true
    },
    "layouts": {
      "maxPerEvent": -1,
      "advancedTools": true,
      "customTemplates": true,
      "exportHighRes": true,
      "exportToScale": true,
      "preview3d": true
    },
    "guests": {
      "maxPerEvent": -1,
      "csvImport": true,
      "qrCheckin": true
    },
    "tasks": {
      "maxPerEvent": -1,
      "assignment": true,
      "recurringTasks": true,
      "taskTemplates": true,
      "dependencies": true
    },
    "budget": {
      "invoiceGeneration": true,
      "financialReports": true,
      "paymentReminders": true,
      "multiCurrency": true,
      "profitMargin": true
    },
    "crm": {
      "customFields": -1,
      "clientPortal": "full",
      "emailIntegration": true,
      "leadPipeline": true,
      "automatedWorkflows": true
    },
    "calendar": {
      "multiEvent": true,
      "templates": true,
      "calendarSync": true
    },
    "chat": {
      "historyDays": -1,
      "videoCalls": true,
      "screenSharing": true
    },
    "integrations": {
      "zapier": true,
      "apiAccess": true,
      "webhooks": true,
      "quickbooks": true,
      "googleWorkspace": true
    },
    "support": {
      "responseHours": 4,
      "priority": true,
      "phone": true,
      "accountManager": true,
      "onboardingHours": 1
    },
    "branding": {
      "custom": true,
      "whiteLabel": true,
      "removeBadge": true
    }
  }
}
```

**Note:** `-1` represents unlimited.

---

### Frontend Helper Hook

Create `useFeatureGate(feature)` hook that:
1. Gets current subscription from context
2. Checks if feature is available
3. Returns `{ allowed: boolean, limit: number|null, usage: number|null, showUpgrade: () => void }`

```typescript
// Example usage
const { allowed, limit, usage, showUpgrade } = useFeatureGate('events.maxActive');

if (!allowed) {
  showUpgrade(); // Opens upgrade modal
}

// For displaying usage
<span>{usage}/{limit} events</span>
```

### Backend Middleware

Create `requireFeature(feature)` middleware that:
1. Gets team subscription
2. Checks feature access
3. Returns 402 Payment Required if not allowed with upgrade info

```typescript
// Example response for blocked feature
{
  "error": "feature_limit_reached",
  "feature": "events.maxActive",
  "current": 8,
  "limit": 8,
  "requiredPlan": "professional",
  "upgradeUrl": "/settings/billing?upgrade=professional"
}
```

---

## Upgrade Prompts

### Soft Prompts (Usage approaching limit)
When usage reaches 75% of limit, show subtle indicator:
- Yellow badge on dashboard
- Tooltip: "You're using 6 of 8 available events"

### Hard Prompts (Limit reached)
When limit is reached, show modal with:
- Clear explanation of what limit was hit
- Current plan vs. required plan comparison
- Key benefits of upgrading
- "Upgrade Now" primary button
- "Maybe Later" secondary option

### Example Copy:

**Starter → Professional:**
> "You've reached the limit of 8 active events on the Starter plan. Professional gives you 30 events, team collaboration, advanced layout tools, and invoicing — everything you need to scale your planning business."

**Professional → Enterprise:**
> "Your team is growing! Enterprise includes up to 25 team members, automated workflows, API access, and white-label branding to match your agency's premium positioning."

---

## Free Trial Strategy

- **Duration:** 14 days
- **Plan Level:** Professional (expose users to full features)
- **Credit Card:** Not required to start
- **Limits:** Full Professional limits
- **End of Trial:** Downgrade to Starter or upgrade prompt

**Trial Ending Emails:**
- Day 12: "Your trial ends in 2 days"
- Day 14: "Trial ended - here's what you'll miss"
- Day 17: "Special offer: 20% off first 3 months"

---

## Pricing Psychology Notes

1. **Anchoring:** Enterprise at $149 makes Professional at $69 feel accessible
2. **Center-Stage:** Professional highlighted as "Most Popular" with distinct styling
3. **Charm Pricing:** All prices end in 9 ($29, $69, $149)
4. **Decoy Effect:** Starter limitations make Professional clearly better value
5. **Annual Discount:** 13-17% savings incentivizes annual commitment, reduces churn

---

## Competitive Positioning

| vs Competitor | WedBoardPro Advantage |
|---------------|----------------------|
| HoneyBook ($36-129) | More specialized for weddings, Layout Maker included |
| Aisle Planner ($40-170) | Modern UI, better pricing, more features in mid-tier |
| Dubsado ($20-40) | Wedding-specific features, easier to use |
| Planning Pod ($39-149+) | All-in-one solution, no need for multiple tools |
