// Shared TypeScript types for database operations

export type TeamRole = 'owner' | 'admin' | 'member';
export type EventStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  inviter_id: string;
  email: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
}

export interface Event {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  wedding_date: string;
  current_stage: string | null;
  status: EventStatus;
  guest_count_expected: number;
  guest_count_confirmed: number | null;
  budget_planned: string | null;
  budget_actual: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PipelineStage {
  id: string;
  event_id: string;
  order_index: number;
  key: string;
  title: string;
  description: string | null;
  progress_percent: number;
  due_date: string | null;
  is_blocking: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StageTask {
  id: string;
  event_id: string;
  stage_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  team_id: string;
  created_by: string;
  assignee_id: string | null;
  event_id: string | null;
  title: string;
  description: string;
  is_completed: boolean;
  priority: TaskPriority;
  is_flagged: boolean;
  due_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  event_id: string;
  bride_name: string;
  groom_name: string;
  email: string;
  phone: string;
  address: string | null;
  preferences: any;
  communication_notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Venue {
  id: string;
  event_id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  indoor_outdoor: 'indoor' | 'outdoor' | 'mixed' | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Vendor {
  id: string;
  event_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  contract_status: 'not_contacted' | 'in_negotiation' | 'contract_signed' | 'cancelled';
  quote_amount: string | null;
  final_amount: string | null;
  notes: string | null;
}

export interface Guest {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rsvp_status: 'pending' | 'accepted' | 'declined' | null;
  plus_one: boolean;
  dietary_restrictions: string | null;
  table_number: number | null;
  group_name: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BudgetCategory {
  id: string;
  event_id: string;
  category_name: string;
  custom_name: string | null;
  budgeted_amount: number;
  contracted_amount: number;
  paid_amount: number;
  payment_schedule: string | null;
  vendor_id: string | null;
  is_contracted: boolean;
  notes: string | null;
  category_status: 'planned' | 'in_progress' | 'awaiting_invoice' | 'invoice_received' | 'paid' | 'completed' | null;
  deleted_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BudgetPayment {
  id: string;
  category_id: string;
  amount: number;
  paid_date: string;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  team_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EventSupplier {
  id: string;
  event_id: string;
  supplier_id: string;
  status: string;
  contracted_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  team_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CrmDeal {
  id: string;
  team_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  title: string;
  value: number | null;
  expected_close_date: string | null;
  probability: number | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CrmActivity {
  id: string;
  deal_id: string;
  type: string;
  description: string;
  completed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ProjectFile {
  id: string;
  event_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string | null;
  created_at: string;
}

// Permission types
export interface TeamMemberPermissions {
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
}

// Input types for creating/updating
export interface CreateTeamMemberInput {
  team_id: string;
  user_id: string;
  role: TeamRole;
  permissions?: Partial<TeamMemberPermissions>;
}

export interface UpdateTeamMemberInput {
  role?: TeamRole;
  can_view_billing?: boolean;
  can_manage_billing?: boolean;
  can_view_usage?: boolean;
  can_manage_team?: boolean;
  can_manage_settings?: boolean;
  can_create_events?: boolean;
  can_view_all_events?: boolean;
  can_delete_events?: boolean;
}

export interface CreateEventInput {
  team_id: string;
  title: string;
  wedding_date: string;
  guest_count_expected?: number;
  budget_planned?: string;
  notes_internal?: string;
}

export interface UpdateEventInput {
  title?: string;
  wedding_date?: string;
  status?: EventStatus;
  guest_count_expected?: number;
  guest_count_confirmed?: number;
  budget_planned?: string;
  budget_actual?: string;
  notes_internal?: string;
}

export interface CreateTaskInput {
  team_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  is_flagged?: boolean;
  due_date?: string | null;
  assignee_id?: string | null;
  event_id?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  priority?: TaskPriority;
  is_flagged?: boolean;
  due_date?: string | null;
  assignee_id?: string | null;
  event_id?: string | null;
}
