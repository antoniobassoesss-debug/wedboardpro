// Project Pipeline / Event Management API types & client wrappers

import { getValidAccessToken } from '../utils/sessionManager';

export type EventStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed';

export type StageKey =
  | 'vision_style'
  | 'venue_date'
  | 'guest_list'
  | 'budget'
  | 'vendors'
  | 'design_layout'
  | 'logistics'
  | 'wedding_day'
  | 'post_event';

export type StageTaskStatus = 'todo' | 'in_progress' | 'done';
export type StageTaskPriority = 'low' | 'medium' | 'high';

export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';

export type VendorCategory =
  | 'catering'
  | 'photography'
  | 'video'
  | 'music'
  | 'decor'
  | 'flowers'
  | 'cake'
  | 'transport'
  | 'others';

export type VendorContractStatus =
  | 'not_contacted'
  | 'in_negotiation'
  | 'contract_signed'
  | 'cancelled';

export type FileCategory = 'contract' | 'layout' | 'menu' | 'photo' | 'other';

export interface Event {
  id: string;
  planner_id: string;
  title: string;
  wedding_date: string; // ISO date
  current_stage: string | null;
  status: EventStatus;
  guest_count_expected: number;
  guest_count_confirmed: number | null;
  budget_planned: string | null; // numeric as string
  budget_actual: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  event_id: string;
  order_index: number;
  key: string; // StageKey but allow flexibility
  title: string;
  description: string | null;
  progress_percent: number;
  due_date: string | null;
  is_blocking: boolean;
}

export interface StageTask {
  id: string;
  event_id: string;
  stage_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: StageTaskStatus;
  priority: StageTaskPriority;
  due_date: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  event_id: string;
  bride_name: string;
  groom_name: string;
  email: string;
  phone: string;
  address: string | null;
  preferences: any; // JSONB
  communication_notes: string | null;
}

export interface Venue {
  id: string;
  event_id: string;
  name: string;
  address: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  capacity: number | null;
  indoor_outdoor: IndoorOutdoor;
  layout_notes: string | null;
  logistics_notes: string | null;
}

export interface Vendor {
  id: string;
  event_id: string;
  category: VendorCategory;
  name: string;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  contract_status: VendorContractStatus;
  quote_amount: string | null;
  final_amount: string | null;
  notes: string | null;
}

export interface EventFile {
  id: string;
  event_id: string;
  file_name: string;
  file_url: string;
  category: FileCategory;
  uploaded_at: string;
}

export interface EventActivityLog {
  id: string;
  event_id: string;
  action: string;
  created_by: string;
  created_at: string;
}

export interface EventWorkspace {
  event: Event;
  stages: PipelineStage[];
  tasks: StageTask[];
  client: Client | null;
  venue: Venue | null;
  vendors: Vendor[];
  files: EventFile[];
  activityLog: EventActivityLog[];
}

export type Result<T> = { data: T | null; error: string | null };

// ===== Events list & creation =====

export interface CreateEventInput {
  title: string;
  wedding_date: string; // ISO date
  guest_count_expected?: number;
  guest_count_confirmed?: number | null;
  budget_planned?: string | null;
  budget_actual?: string | null;
  notes_internal?: string | null;
}

export async function listEvents(): Promise<Result<Event[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/events', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.events as Event[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to list events' };
  }
}

export async function createEvent(input: CreateEventInput): Promise<Result<{ event: Event; stages: PipelineStage[] }>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: { event: data.event as Event, stages: data.stages as PipelineStage[] }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create event' };
  }
}

// ===== Event workspace =====

export async function fetchEventWorkspace(eventId: string): Promise<Result<EventWorkspace>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.workspace as EventWorkspace, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load event workspace' };
  }
}

export async function updateEvent(
  eventId: string,
  patch: Partial<Pick<Event, 'title' | 'wedding_date' | 'status' | 'current_stage' | 'guest_count_expected' | 'guest_count_confirmed' | 'budget_planned' | 'budget_actual' | 'notes_internal'>>,
): Promise<Result<Event>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.event as Event, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update event' };
  }
}

export async function deleteEvent(eventId: string): Promise<Result<null>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete event' };
  }
}

// ===== Stages =====

export async function fetchStages(eventId: string): Promise<Result<PipelineStage[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/stages`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.stages as PipelineStage[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to fetch stages' };
  }
}

export async function updateStage(
  stageId: string,
  patch: Partial<Pick<PipelineStage, 'title' | 'description' | 'progress_percent' | 'due_date' | 'is_blocking' | 'order_index'>>,
): Promise<Result<PipelineStage>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/stages/${stageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.stage as PipelineStage, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update stage' };
  }
}

// ===== Tasks =====

export interface CreateStageTaskInput {
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  status?: StageTaskStatus;
  priority?: StageTaskPriority;
  due_date?: string | null;
}

export interface UpdateStageTaskInput {
  title?: string;
  description?: string | null;
  assigned_to?: string | null;
  status?: StageTaskStatus;
  priority?: StageTaskPriority;
  due_date?: string | null;
}

export async function createStageTask(stageId: string, input: CreateStageTaskInput): Promise<Result<StageTask>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/stages/${stageId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.task as StageTask, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create task' };
  }
}

export async function updateStageTask(taskId: string, input: UpdateStageTaskInput): Promise<Result<StageTask>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.task as StageTask, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update task' };
  }
}

// ===== Vendors =====

export async function fetchVendors(eventId: string): Promise<Result<Vendor[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/vendors`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.vendors as Vendor[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to fetch vendors' };
  }
}

export async function updateVendor(
  vendorId: string,
  patch: Partial<Pick<Vendor, 'category' | 'name' | 'contact_phone' | 'contact_email' | 'website' | 'contract_status' | 'quote_amount' | 'final_amount' | 'notes'>>,
): Promise<Result<Vendor>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.vendor as Vendor, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update vendor' };
  }
}

// ===== Files =====

export interface CreateEventFileInput {
  file_name: string;
  file_url: string;
  category?: FileCategory;
}

export async function createEventFile(eventId: string, input: CreateEventFileInput): Promise<Result<EventFile>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.file as EventFile, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create file record' };
  }
}

// ===== Client =====

export interface CreateClientInput {
  bride_name: string;
  groom_name: string;
  email: string;
  phone: string;
  address?: string | null;
  preferences?: any;
  communication_notes?: string | null;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}

export async function createClient(eventId: string, input: CreateClientInput): Promise<Result<Client>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/client`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.client as Client, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create client' };
  }
}

export async function updateClient(eventId: string, input: UpdateClientInput): Promise<Result<Client>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/client`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.client as Client, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update client' };
  }
}


