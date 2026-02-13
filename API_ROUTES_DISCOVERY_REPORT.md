# 🔍 API ROUTES DISCOVERY REPORT
**Generated:** 2026-02-11
**Total Files with API Calls:** 31 files
**Total API Endpoints Found:** 109 calls

---

## 📋 SUMMARY BY CATEGORY

### ✅ ALREADY CONVERTED TO SUPABASE
- `src/client/api/tasksApi.ts` - ✅ DONE (all endpoints converted)
- `src/client/api/teamsApi.ts` - ✅ DONE (all 11 endpoints converted)
- `src/client/hooks/usePermissions.ts` - ✅ DONE
- `src/client/components/TeamSwitcher.tsx` - ✅ DONE
- `src/client/dashboard/ChatTab.tsx` (fetchTeam function only) - ✅ DONE
- `src/client/components/AccountModal.tsx` (fetchTeamInfo only) - ✅ DONE

---

## 🚨 CRITICAL - NEEDS IMMEDIATE CONVERSION

### 1️⃣ **Core API Files (High Priority)**

#### **eventsPipelineApi.ts** (17 endpoints)
```
Line 174:  fetch('/api/events')                              - List events
Line 196:  fetch(`/api/events/${eventId}`)                   - Get event
Line 228:  fetch('/api/events')                              - Create event
Line 266:  fetch(`/api/events/${eventId}`)                   - Update event
Line 291:  fetch(`/api/events/${eventId}`)                   - Delete event
Line 317:  fetch(`/api/events/${eventId}`)                   - Archive event
Line 340:  fetch(`/api/events/${eventId}/stages`)            - Get stages
Line 365:  fetch(`/api/stages/${stageId}`)                   - Update stage
Line 411:  fetch(`/api/stages/${stageId}/tasks`)             - Create stage task
Line 437:  fetch(`/api/tasks/${taskId}`)                     - Update stage task
Line 465:  fetch(`/api/events/${eventId}/vendors`)           - Get vendors
Line 490:  fetch(`/api/vendors/${vendorId}`)                 - Update vendor
Line 524:  fetch(`/api/events/${eventId}/files`)             - Upload files
Line 564:  fetch(`/api/events/${eventId}/client`)            - Get client
Line 590:  fetch(`/api/events/${eventId}/client`)            - Update client
```
**Database Tables:** `events`, `pipeline_stages`, `stage_tasks`, `vendors`, `clients`, `event_files`

---

#### **weddingBudgetApi.ts** (7 endpoints)
```
Line 161:  fetch(`/api/events/${eventId}/budget`)                              - Get budget
Line 186:  fetch(`/api/events/${eventId}/budget`)                              - Update budget
Line 215:  fetch(`/api/events/${eventId}/budget/categories`)                   - Create category
Line 248:  fetch(`/api/events/${eventId}/budget/categories/${categoryId}`)     - Update category
Line 277:  fetch(`/api/events/${eventId}/budget/categories/${categoryId}`)     - Delete category
Line 306:  fetch(`/api/events/${eventId}/budget/categories/${categoryId}/payments/${paymentId}`) - Delete payment
```
**Database Tables:** `event_budgets`, `budget_categories`, `budget_payments`

---

#### **weddingGuestsApi.ts** (9 endpoints)
```
Line 160:  fetch(`/api/events/${eventId}/guests`)              - List guests
Line 189:  fetch(`/api/events/${eventId}/guests/${guestId}`)   - Update guest
Line 218:  fetch(`/api/events/${eventId}/guests/${guestId}`)   - Delete guest
Line 246:  fetch(`/api/events/${eventId}/guests/bulk`)         - Create guests bulk
Line 275:  fetch(`/api/events/${eventId}/guests/bulk`)         - Update guests bulk
Line 323:  fetch(`/api/events/${eventId}/guests/import`)       - Import CSV
Line 364:  fetch(`/api/events/${eventId}/guests/export`)       - Export CSV
```
**Database Tables:** `guests`

---

#### **suppliersApi.ts** (11 endpoints)
```
Line 109:  fetch(`/api/suppliers?${params}`)                   - List suppliers
Line 144:  fetch('/api/suppliers')                             - Create supplier
Line 177:  fetch(`/api/suppliers/${id}`)                       - Update supplier
Line 203:  fetch(`/api/suppliers/${id}`)                       - Delete supplier
Line 228:  fetch(`/api/events/${eventId}/suppliers`)           - List event suppliers
Line 264:  fetch(`/api/events/${eventId}/suppliers`)           - Link supplier to event
Line 311:  fetch(`/api/event-suppliers/${id}`)                 - Update event supplier
Line 348:  fetch('/api/custom-vendor-categories')              - List custom categories
Line 372:  fetch('/api/custom-vendor-categories')              - Create category
Line 398:  fetch(`/api/custom-vendor-categories/${id}`)        - Delete category
```
**Database Tables:** `suppliers`, `event_suppliers`, `custom_vendor_categories`

---

#### **contactsApi.ts** (5 endpoints)
```
Line 33:   fetch(`/api/contacts?${params}`)    - List contacts
Line 65:   fetch('/api/contacts')              - Create contact
Line 95:   fetch(`/api/contacts/${id}`)        - Update contact
Line 121:  fetch(`/api/contacts/${id}`)        - Delete contact
```
**Database Tables:** `contacts`

---

#### **notificationsApi.ts** (7 endpoints)
```
Line 29:   fetch(`/api/notifications?${params}`)       - List notifications
Line 53:   fetch(`/api/notifications/${id}/read`)      - Mark as read
Line 77:   fetch('/api/notifications/read-all')        - Mark all as read
Line 100:  fetch('/api/notifications/unread-count')    - Get unread count
Line 124:  fetch(`/api/notifications/${id}`)           - Delete notification
Line 147:  fetch(`/api/notifications/${id}/unread`)    - Mark as unread
```
**Database Tables:** `notifications`

---

#### **weddingVenueApi.ts** (2 endpoints)
```
Line 78:   fetch(`/api/events/${eventId}/venue`)   - Get venue
Line 100:  fetch(`/api/events/${eventId}/venue`)   - Update venue
```
**Database Tables:** `event_venues`

---

#### **weddingVisionApi.ts** (2 endpoints)
```
Line 78:   fetch(`/api/events/${eventId}/vision`)   - Get vision
Line 106:  fetch(`/api/events/${eventId}/vision`)   - Update vision
```
**Database Tables:** `event_visions`

---

#### **crmApi.ts** (14 endpoints)
```
Line 142:  fetch('/api/crm/pipelines')                         - List pipelines
Line 164:  fetch('/api/crm/pipelines/default')                 - Get default pipeline
Line 190:  fetch(`/api/crm/pipelines/${pipelineId}/stages`)    - Get stages
Line 361:  fetch('/api/crm/deals')                             - List deals
Line 384:  fetch(`/api/crm/deals/${dealId}/stage`)             - Update deal stage
Line 419:  fetch(`/api/crm/deals/${dealId}`)                   - Update deal
Line 442:  fetch(`/api/crm/deals/${dealId}`)                   - Delete deal
Line 467:  fetch(`/api/crm/deals/${dealId}/activities`)        - List activities
Line 496:  fetch(`/api/crm/deals/${dealId}/activities`)        - Create activity
Line 527:  fetch(`/api/crm/deals/${dealId}/details`)           - Get deal details
Line 553:  fetch(`/api/crm/deals/${dealId}/next-action`)       - Update next action
Line 576:  fetch(`/api/crm/deals/${dealId}/lost`)              - Mark as lost
Line 599:  fetch(`/api/crm/deals/${dealId}/won`)               - Mark as won
Line 841:  fetch('/api/crm/deals/import')                      - Import deals
```
**Database Tables:** `crm_pipelines`, `crm_stages`, `crm_deals`, `crm_activities`

---

### 2️⃣ **Component Files Using API Calls**

#### **ChatTab.tsx** (5 remaining endpoints)
```
Line 255:  fetch('/api/chat/conversations')         - List conversations
Line 295:  fetch(`/api/chat/messages?${params}`)    - Get messages
Line 526:  fetch('/api/chat/messages')              - Send message
Line 569:  fetch('/api/chat/mark-as-read')          - Mark as read
Line 680:  fetch('/api/chat/messages')              - Delete message
Line 768:  fetch('/api/teams/members')              - Get team members ❌ DUPLICATE
```
**Database Tables:** `chat_conversations`, `chat_messages`

---

#### **AccountModal.tsx** (4 remaining endpoints)
```
Line 131:  fetch('/api/teams/members')                  - Get team members ❌ DUPLICATE
Line 171:  fetch('/api/teams/invitations/pending')      - Get pending invitations
Line 416:  fetch('/api/teams/invite')                   - Send invitation
Line 455:  fetch('/api/teams')                          - Create team
Line 508:  fetch('/api/teams/invitations/accept')       - Accept invitation
```
**Database Tables:** `team_members`, `team_invitations`, `teams`

---

#### **TodoPage.tsx** (2 endpoints)
```
Line 140:  fetch('/api/teams/members')    - Get team members ❌ DUPLICATE
Line 158:  fetch('/api/events')           - Get events ❌ DUPLICATE
```

---

#### **TaskItem.tsx** (1 endpoint)
```
Line 73:   fetch('/api/teams/members')    - Get team members ❌ DUPLICATE
```

---

#### **EventSharingSection.tsx** (1 endpoint)
```
Line 44:   fetch('/api/teams/members')    - Get team members ❌ DUPLICATE
```

---

#### **WeddingDashboard.tsx** (1 endpoint)
```
Line 154:  fetch('/api/auth/verification-status')    - Check verification
```

---

#### **EmailPasswordForm.tsx** (2 endpoints - Auth)
```
Line 159:  fetch('/api/auth/login')     - Login
Line 218:  fetch('/api/auth/signup')    - Signup
```
**Note:** These may use Supabase Auth directly instead of custom API

---

#### **VerificationBanner.tsx** (1 endpoint)
```
Line 37:   fetch('/api/auth/resend-verification')    - Resend verification email
```

---

### 3️⃣ **Special/Internal Systems**

#### **TeamDashboard.tsx** (4 endpoints - Internal team system)
```
Line 68:   fetch('/api/v1/team/bookings')              - Get bookings
Line 71:   fetch('/api/v1/team/availability')          - Get availability
Line 106:  fetch('/api/v1/team/availability')          - Update availability
Line 125:  fetch(`/api/v1/team/bookings/${id}`)        - Update booking
```
**Database Tables:** `team_bookings`, `team_availability`

---

#### **TeamCRM.tsx** (4 endpoints - Internal team system)
```
Line 49:   fetch('/api/v1/team/leads')              - Get leads
Line 72:   fetch(`/api/v1/team/leads/${id}`)        - Update lead
Line 302:  fetch(`/api/v1/team/leads/${id}`)        - Update lead (duplicate)
Line 324:  fetch(`/api/v1/team/leads/${id}`)        - Update lead (duplicate)
```
**Database Tables:** `team_leads`

---

#### **TeamLoginPage.tsx** (1 endpoint)
```
Line 23:   fetch('/api/v1/team/login')    - Team login
```

---

#### **Demo.tsx** (1 endpoint)
```
Line 368:  fetch('/api/v1/demo/book')    - Book demo
```
**Database Tables:** `demo_bookings`

---

### 4️⃣ **Misc/Utility Files**

#### **api.ts** (1 endpoint)
```
Line 6:    fetch('/api/assistant')    - AI assistant
```

---

#### **useElectricalAssistantChat.ts** (1 endpoint)
```
Line 50:   fetch('/api/assistant')    - AI assistant
```

---

#### **ElectricalDashboard.tsx** (1 endpoint)
```
Line 260:  fetch(`/api/electrical/projects/${id}/export.pdf`)    - Export PDF
```

---

#### **InviteAcceptPage.tsx** (2 endpoints)
```
Line 63:   fetch(`/api/invitations/${token}`)            - Get invitation
Line 99:   fetch('/api/teams/invitations/accept')        - Accept invitation
```

---

#### **EmailConfirmationWaiting.tsx** (1 endpoint)
```
Line 76:   fetch('/api/auth/check-verification')    - Check verification
```

---

## 📊 STATISTICS

### By Priority Level:
- **Critical API Files:** 9 files, 74 endpoints
- **Component Files:** 10 files, 18 endpoints
- **Internal Team System:** 3 files, 9 endpoints
- **Auth/Misc:** 6 files, 8 endpoints

### By Status:
- ✅ **Converted:** 6 files (tasksApi, teamsApi, usePermissions, TeamSwitcher, ChatTab partial, AccountModal partial)
- 🔴 **Needs Conversion:** 25 files, ~100 endpoints

### Duplicate Calls:
- `/api/teams/members` - Used in 5 files (can all use `listTeamMembers()` from teamsApi.ts)
- `/api/events` - Used in multiple files (can use eventsPipelineApi once converted)

---

## 🎯 RECOMMENDED CONVERSION ORDER

### Phase 1: Core Data (Week 1)
1. **eventsPipelineApi.ts** - Most important, affects many features
2. **weddingBudgetApi.ts** - Critical for budget features
3. **weddingGuestsApi.ts** - Critical for guest management
4. **suppliersApi.ts** - Vendor management

### Phase 2: Supporting Features (Week 2)
5. **ChatTab.tsx** - Replace chat endpoints
6. **AccountModal.tsx** - Replace team management endpoints
7. **contactsApi.ts** - Contact management
8. **notificationsApi.ts** - Notifications

### Phase 3: Additional Features (Week 3)
9. **weddingVenueApi.ts** - Venue details
10. **weddingVisionApi.ts** - Vision/style details
11. **crmApi.ts** - CRM functionality
12. Component files (TodoPage, TaskItem, EventSharingSection, etc.)

### Phase 4: Special Systems (Optional)
13. Internal team system (TeamDashboard, TeamCRM, TeamLoginPage)
14. Demo booking system
15. Auth endpoints (may already use Supabase Auth)
16. Misc utilities (assistant, electrical dashboard, etc.)

---

## 🔧 CONVERSION TEMPLATE

For each API file, follow this pattern:

```typescript
import { browserSupabaseClient } from '../browserSupabaseClient';

export async function functionName(): Promise<{ data: Type | null; error: string | null }> {
  try {
    if (!browserSupabaseClient) {
      return { data: null, error: 'Supabase client not initialized' };
    }

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await browserSupabaseClient
      .from('table_name')
      .select('*')
      .eq('field', value);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Operation failed' };
  }
}
```

---

## ✅ NEXT STEPS

1. **Start with eventsPipelineApi.ts** - This is the most critical file
2. **Test each conversion** thoroughly before moving to the next
3. **Update imports** in files using the converted APIs
4. **Remove unused API route handlers** from backend as you convert
5. **Verify RLS policies** exist for each table being accessed
6. **Document any complex queries** that need special handling

---

**Report End**
