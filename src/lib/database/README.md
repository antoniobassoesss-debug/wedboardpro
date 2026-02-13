# Database Abstraction Layer

Clean, type-safe Supabase database access layer for WedBoardPro.

## Overview

This database layer provides a clean abstraction over Supabase operations with:
- ✅ TypeScript type safety
- ✅ Consistent error handling
- ✅ Authentication checks built-in
- ✅ RLS security through Supabase policies
- ✅ Simple, predictable API

## Module Structure

```
src/lib/database/
├── index.ts          # Main exports
├── types.ts          # TypeScript types
├── teams.ts          # Team management
├── events.ts         # Event/project operations
├── pipeline.ts       # Stages, tasks, clients, venues, vendors
├── guests.ts         # Guest list management
├── budget.ts         # Budget categories & payments
├── suppliers.ts      # Supplier directory
├── crm.ts           # Contacts, deals, activities
├── notifications.ts  # User notifications
└── files.ts         # File uploads
```

## Usage Examples

### Import

```typescript
import { teamsDb, eventsDb, pipelineDb, guestsDb, budgetDb } from '@/lib/database';
```

### Teams

```typescript
// Get current user's team membership
const membership = await teamsDb.getMyTeamMembership();

// List all team members
const members = await teamsDb.getMyTeamMembers();

// Invite a team member
const invitation = await teamsDb.inviteTeamMember(
  teamId,
  'user@example.com',
  {
    can_view_billing: true,
    can_create_events: true,
    can_view_all_events: true,
    // ... other permissions
  }
);

// Update member permissions
const updated = await teamsDb.updateTeamMember(memberId, {
  can_manage_billing: true,
  can_delete_events: false,
});
```

### Events

```typescript
// List all events for the team
const events = await eventsDb.listEvents();

// Create a new event
const event = await eventsDb.createEvent({
  team_id: teamId,
  title: 'Smith Wedding',
  wedding_date: '2024-06-15',
  guest_count_expected: 150,
  budget_planned: '50000',
});

// Update an event
const updated = await eventsDb.updateEvent(eventId, {
  status: 'on_track',
  guest_count_confirmed: 142,
});

// Get upcoming events
const upcoming = await eventsDb.getUpcomingEvents(5);

// Search events
const results = await eventsDb.searchEvents('Smith');
```

### Pipeline (Stages, Tasks, Clients, Venues, Vendors)

```typescript
// Get all stages for an event
const stages = await pipelineDb.getEventStages(eventId);

// Create default stages for a new event
const stages = await pipelineDb.createDefaultStages(eventId);

// Update stage progress
const stage = await pipelineDb.updateStage(stageId, {
  progress_percent: 75,
  due_date: '2024-05-01',
});

// Get stage tasks
const tasks = await pipelineDb.getStageTasks(stageId);

// Create a task
const task = await pipelineDb.createStageTask(stageId, eventId, {
  title: 'Book flowers',
  description: 'Contact florist and confirm arrangements',
  priority: 'high',
  due_date: '2024-04-15',
  assigned_to: userId,
});

// Update task
const updated = await pipelineDb.updateStageTask(taskId, {
  status: 'done',
});

// Get/update client details
const client = await pipelineDb.getEventClient(eventId);
const updated = await pipelineDb.upsertEventClient(eventId, {
  bride_name: 'Sarah',
  groom_name: 'John',
  email: 'sarah@example.com',
  phone: '+1234567890',
});

// Get/update venue details
const venue = await pipelineDb.getEventVenue(eventId);
const updated = await pipelineDb.upsertEventVenue(eventId, {
  name: 'Grand Ballroom',
  address: '123 Main St',
  capacity: 200,
});

// Manage vendors
const vendors = await pipelineDb.getEventVendors(eventId);
const vendor = await pipelineDb.createVendor(eventId, {
  name: 'Elegant Flowers',
  category: 'flowers',
  contact_email: 'info@elegantflowers.com',
  contract_status: 'contract_signed',
});
```

### Guests

```typescript
// List all guests
const guests = await guestsDb.listEventGuests(eventId);

// Create a guest
const guest = await guestsDb.createGuest(eventId, {
  name: 'John Doe',
  email: 'john@example.com',
  rsvp_status: 'pending',
  plus_one: true,
  dietary_restrictions: 'Vegetarian',
});

// Bulk create guests
const guests = await guestsDb.createGuestsBulk(eventId, [
  { name: 'Jane Smith', email: 'jane@example.com' },
  { name: 'Bob Johnson', email: 'bob@example.com' },
]);

// Update guest
const updated = await guestsDb.updateGuest(guestId, {
  rsvp_status: 'accepted',
  table_number: 5,
});

// Get statistics
const stats = await guestsDb.getGuestStats(eventId);
// Returns: { total, accepted, declined, pending, withPlusOne }

// Search guests
const results = await guestsDb.searchGuests(eventId, 'John');
```

### Budget

```typescript
// Get all budget categories
const categories = await budgetDb.getBudgetCategories(eventId);

// Create a category
const category = await budgetDb.createBudgetCategory(eventId, {
  name: 'Flowers',
  estimated_amount: 3000,
  actual_amount: 2800,
  category_status: 'contracted',
});

// Update category
const updated = await budgetDb.updateBudgetCategory(categoryId, {
  actual_amount: 2650,
  category_status: 'paid',
});

// Create a payment
const payment = await budgetDb.createPayment(categoryId, {
  amount: 1000,
  paid_date: '2024-03-15',
  notes: 'Deposit payment',
});

// Get budget summary
const summary = await budgetDb.getBudgetSummary(eventId);
// Returns: { totalEstimated, totalActual, totalPaid, categoriesCount, remainingBalance }
```

### Suppliers

```typescript
// List all suppliers
const suppliers = await suppliersDb.listSuppliers();

// Filter suppliers
const florists = await suppliersDb.listSuppliers({ category: 'flowers' });
const searched = await suppliersDb.listSuppliers({ search: 'Elegant' });

// Create a supplier
const supplier = await suppliersDb.createSupplier({
  name: 'Elegant Flowers',
  category: 'flowers',
  contact_name: 'Mary Smith',
  contact_email: 'mary@elegantflowers.com',
  contact_phone: '+1234567890',
});

// Link supplier to event
const link = await suppliersDb.linkSupplierToEvent(eventId, supplierId, {
  status: 'contracted',
  contracted_amount: 2500,
  notes: 'Include roses and lilies',
});

// Get event suppliers
const eventSuppliers = await suppliersDb.getEventSuppliers(eventId);
```

### CRM

```typescript
// List contacts
const contacts = await crmDb.listContacts();
const searched = await crmDb.listContacts({ search: 'Smith' });

// Create contact
const contact = await crmDb.createContact({
  name: 'Sarah Smith',
  email: 'sarah@example.com',
  phone: '+1234567890',
  company: 'Smith Events',
});

// List deals
const deals = await crmDb.listDeals();
const stageDeals = await crmDb.listDeals({ stage_id: stageId });

// Create deal
const deal = await crmDb.createDeal({
  pipeline_id: pipelineId,
  stage_id: stageId,
  contact_id: contactId,
  title: 'Johnson Wedding',
  value: 50000,
  expected_close_date: '2024-08-15',
});

// List activities
const activities = await crmDb.listDealActivities(dealId);

// Create activity
const activity = await crmDb.createActivity({
  deal_id: dealId,
  type: 'call',
  description: 'Follow-up call scheduled',
});
```

### Notifications

```typescript
// List all notifications
const all = await notificationsDb.listNotifications();

// List unread only
const unread = await notificationsDb.listNotifications({ read: false });

// Get unread count
const count = await notificationsDb.getUnreadCount();

// Mark as read
await notificationsDb.markAsRead(notificationId);

// Mark all as read
await notificationsDb.markAllAsRead();
```

### Files

```typescript
// List event files
const files = await filesDb.listEventFiles(eventId);
const contracts = await filesDb.listEventFiles(eventId, 'contract');

// Upload file
const { path, url } = await filesDb.uploadToStorage(eventId, file, 'contract');

// Create file record
const fileRecord = await filesDb.createFileRecord({
  event_id: eventId,
  file_name: file.name,
  file_path: path,
  file_size: file.size,
  file_type: file.type,
  category: 'contract',
});

// Get file URL
const url = await filesDb.getFileUrl(filePath);

// Delete file
await filesDb.deleteFile(fileId);
await filesDb.deleteFromStorage(filePath);
```

## Error Handling

All functions throw errors that can be caught:

```typescript
try {
  const events = await eventsDb.listEvents();
} catch (error) {
  console.error('Failed to load events:', error.message);
  // Handle error appropriately
}
```

## Authentication

Authentication is handled automatically by checking `supabase.auth.getUser()`. All functions will throw `'Not authenticated'` if the user is not logged in.

## RLS Security

Row Level Security (RLS) policies on Supabase ensure users can only access their team's data. The database layer doesn't need to implement additional security checks beyond authentication.

## Best Practices

1. **Always handle errors**: Wrap database calls in try-catch blocks
2. **Use TypeScript types**: Import types from `@/lib/database`
3. **Avoid N+1 queries**: Use the provided functions that include necessary joins
4. **Check authentication state**: Ensure user is logged in before calling db functions
5. **Use transactions for related operations**: When multiple operations must succeed together

## Migration Guide

To migrate from old API calls to this database layer:

### Before:
```typescript
const res = await fetch('/api/events', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
const events = data.events;
```

### After:
```typescript
const events = await eventsDb.listEvents();
```

Much cleaner and type-safe!

## Contributing

When adding new database operations:
1. Add types to `types.ts`
2. Add functions to appropriate module
3. Export from `index.ts`
4. Update this README with examples
5. Ensure proper error handling and authentication checks
