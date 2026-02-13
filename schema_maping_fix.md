# COMPLETE SCHEMA MAPPING - Fix All Column Mismatches

## Problem
Frontend code expects different column names than what exists in database.

## Solution
Map ALL actual database columns so Claude Code knows what exists.

---

## ACTUAL DATABASE SCHEMA

### budget_categories
**ACTUAL COLUMNS:**
- id, event_id, category_name, custom_name
- budgeted_amount, contracted_amount, paid_amount
- payment_schedule, vendor_id, is_contracted
- notes, deleted_at, created_at, updated_at, category_status

**COLUMNS THAT DON'T EXIST:**
- ❌ actual_amount (use: paid_amount)
- ❌ name (use: category_name)
- ❌ estimated_cost (use: budgeted_amount)
- ❌ final_cost (use: contracted_amount)

---

### events
**ACTUAL COLUMNS:**
- id, planner_id, title, wedding_date
- current_stage, status
- guest_count_expected, guest_count_confirmed
- budget_planned, budget_actual
- notes_internal, created_at, updated_at
- team_id, created_by

**NO ISSUES** - has both planner_id and created_by

---

### wedding_guests  
**ACTUAL COLUMNS:**
- id, event_id, guest_name, email, phone
- side, guest_group, rsvp_status
- dietary_restrictions, dietary_notes
- plus_one_allowed, plus_one_name
- is_child, needs_accessibility, accessibility_notes
- gift_received, gift_notes
- table_assignment, deleted_at, created_at, updated_at

**NO ISSUES** - all standard columns present

---

### vendors
**ACTUAL COLUMNS:**
- id, event_id, category, name
- contact_phone, contact_email, website
- contract_status, quote_amount, final_amount, notes

**COLUMNS THAT DON'T EXIST:**
- ❌ created_at (not present)
- ❌ updated_at (not present)

---

### suppliers
**ACTUAL COLUMNS:**
- id, planner_id, name, category, company_name
- email, phone, website, location
- notes, rating_internal, is_favorite
- created_at, updated_at
- team_id, created_by, visibility

**NO ISSUES** - complete schema

---

### tasks
**ACTUAL COLUMNS:**
- id, team_id, created_by, assignee_id
- title, description, is_completed
- priority, is_flagged, due_date
- created_at, updated_at, event_id

**NO ISSUES** - complete schema

---

### profiles
**ACTUAL COLUMNS:**
- id, full_name, email, avatar_url
- created_at, updated_at
- phone, business_name

**COLUMNS THAT DON'T EXIST:**
- ❌ address (not present)

---

### clients
**ACTUAL COLUMNS:**
- id, event_id, bride_name, groom_name
- email, phone, address
- preferences, communication_notes

**NO ISSUES** - has address column

---

### wedding_venues
**ACTUAL COLUMNS:**
- id, event_id, venue_name, venue_address
- venue_latitude, venue_longitude, venue_capacity, venue_type
- wedding_date, contact_name, contact_phone, contact_email
- site_visit_notes, contract_file_url, contract_status
- deposit_amount, deposit_due_date, deposit_paid_date
- restrictions, created_at, updated_at

**NO ISSUES** - complete schema

---

### notifications
**ACTUAL COLUMNS:**
- id, user_id, type, title, message
- related_entity_type, related_entity_id
- is_read, created_at

**COLUMNS THAT DON'T EXIST:**
- ❌ read (use: is_read)

---

### teams
**ACTUAL COLUMNS:**
- id, owner_id, name, created_at, updated_at
- subscription_status, subscription_plan_id, stripe_customer_id

**NO ISSUES** - complete schema

---

### team_members
**ACTUAL COLUMNS:**
- id, team_id, user_id, role, joined_at
- can_view_billing, can_manage_billing, can_view_usage
- can_manage_team, can_manage_settings
- can_create_events, can_view_all_events, can_delete_events

**NO ISSUES** - complete schema

---

## CRITICAL FIXES NEEDED

### 1. budget_categories - Multiple column name issues
```typescript
// WRONG
const { data } = await supabase
  .from('budget_categories')
  .select('name, actual_amount, estimated_cost, final_cost');

// RIGHT  
const { data } = await supabase
  .from('budget_categories')
  .select('category_name, paid_amount, budgeted_amount, contracted_amount');
```

### 2. vendors - No timestamp columns
```typescript
// WRONG
.order('created_at', { ascending: false })

// RIGHT
.order('category', { ascending: true })
// OR just remove the order clause
```

### 3. profiles - No address column
```typescript
// WRONG
.select('full_name, email, avatar_url, address')

// RIGHT
.select('full_name, email, avatar_url, phone, business_name')
```

### 4. notifications - Wrong column name
```typescript
// WRONG
.eq('read', false)

// RIGHT
.eq('is_read', false)
```

---

## ACTION PLAN FOR CLAUDE CODE

1. **Search entire codebase for:**
   - `actual_amount` → replace with `paid_amount`
   - `estimated_cost` → replace with `budgeted_amount`
   - `final_cost` → replace with `contracted_amount`
   - `.eq('read'` → replace with `.eq('is_read'`
   - `budget_categories.*name` → replace with `category_name`
   - `vendors.*created_at` → remove order clause
   - `profiles.*address` → remove from select

2. **Verify all INSERT/UPDATE statements use correct column names**

3. **Update TypeScript interfaces to match actual schema**

4. **Test each table's CRUD operations**

---

## VERIFICATION QUERIES

After fixes, these should all work:

```sql
-- Budget categories
SELECT category_name, budgeted_amount, paid_amount, contracted_amount 
FROM budget_categories LIMIT 1;

-- Vendors  
SELECT * FROM vendors ORDER BY category LIMIT 1;

-- Profiles
SELECT full_name, email, phone, business_name FROM profiles LIMIT 1;

-- Notifications
SELECT * FROM notifications WHERE is_read = false LIMIT 1;
```