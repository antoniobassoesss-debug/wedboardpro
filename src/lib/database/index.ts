/**
 * Database Abstraction Layer
 * Clean Supabase access layer for all database operations
 *
 * Usage:
 * import { teamsDb, eventsDb, pipelineDb } from '@/lib/database';
 *
 * const events = await eventsDb.listEvents();
 * const members = await teamsDb.getMyTeamMembers();
 */

// Export all database modules
export { teamsDb } from './teams';
export { eventsDb } from './events';
export { pipelineDb } from './pipeline';
export { guestsDb } from './guests';
export { budgetDb } from './budget';
export { suppliersDb } from './suppliers';
export { crmDb } from './crm';
export { notificationsDb } from './notifications';
export { filesDb } from './files';

// Export all types
export * from './types';

/**
 * Module Overview:
 *
 * - teamsDb: Team and team member management, invitations, permissions
 * - eventsDb: Event/project CRUD operations, search, upcoming events
 * - pipelineDb: Pipeline stages, tasks, clients, venues, vendors
 * - guestsDb: Guest list management, RSVPs, statistics
 * - budgetDb: Budget categories, payments, summaries
 * - suppliersDb: Supplier directory, event linkages
 * - crmDb: CRM contacts, deals, activities
 * - notificationsDb: User notifications
 * - filesDb: File uploads and management
 */
