import { browserSupabaseClient } from '../browserSupabaseClient.js';

export type CalendarEvent = {
  id: string;
  account_id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  event_type: string; // 'event' | 'task' | 'meeting' | etc.
  project_id: string | null;
  status: 'planned' | 'confirmed' | 'done' | 'cancelled' | string;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
  visibility: 'private' | 'team' | 'custom';
  created_at: string;
  updated_at: string;
};

export type CreateCalendarEventInput = {
  account_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  start_at: string; // ISO string
  end_at: string; // ISO string
  all_day?: boolean;
  event_type?: string;
  project_id?: string | null;
  status?: CalendarEvent['status'];
  color?: CalendarEvent['color'];
  visibility?: CalendarEvent['visibility'];
  shared_user_ids?: string[]; // for custom visibility
};

export type UpdateCalendarEventInput = Partial<Omit<CreateCalendarEventInput, 'account_id'>> & {
  account_id?: string; // allow reassignment if needed
  currentUserId: string;
};

type Result<T> = { data: T | null; error: string | null };

const table = 'calendar_events';

export async function listCalendarEvents(params: {
  accountId: string;
  currentUserId: string;
  from?: string;
  to?: string;
  projectId?: string | null;
  eventTypes?: string[]; // optional filter
  statuses?: string[]; // optional filter
}): Promise<Result<CalendarEvent[]>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  try {
    // Step 1: Get the current user's team and all team member IDs
    const { data: teamMember, error: teamError } = await browserSupabaseClient
      .from('team_members')
      .select('team_id')
      .eq('user_id', params.currentUserId)
      .single();

    let teamMemberIds: string[] = [params.currentUserId]; // Always include self
    if (!teamError && teamMember) {
      // Get all team member user IDs
      const { data: members, error: membersError } = await browserSupabaseClient
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamMember.team_id);
      
      if (!membersError && members) {
        teamMemberIds = members.map((m: any) => m.user_id);
      }
    }

    // Step 2: Query private events created by current user
    let privateQuery = browserSupabaseClient
      .from(table)
      .select('*')
      .eq('visibility', 'private')
      .eq('created_by', params.currentUserId)
      .order('start_at', { ascending: true });

    if (params.from) privateQuery = privateQuery.gte('end_at', params.from);
    if (params.to) privateQuery = privateQuery.lte('start_at', params.to);
    if (params.projectId) privateQuery = privateQuery.eq('project_id', params.projectId);
    if (params.statuses && params.statuses.length > 0) privateQuery = privateQuery.in('status', params.statuses);
    if (params.eventTypes && params.eventTypes.length > 0) privateQuery = privateQuery.in('event_type', params.eventTypes);

    const { data: privateEvents, error: privateError } = await privateQuery;
    if (privateError) {
      console.error('[listCalendarEvents] Private events error:', privateError);
      return { data: null, error: privateError.message };
    }

    // Step 3: Query team events created by any team member
    let teamEvents: CalendarEvent[] = [];
    if (teamMemberIds.length > 0) {
      let teamQuery = browserSupabaseClient
        .from(table)
        .select('*')
        .eq('visibility', 'team')
        .in('created_by', teamMemberIds)
        .order('start_at', { ascending: true });

      if (params.from) teamQuery = teamQuery.gte('end_at', params.from);
      if (params.to) teamQuery = teamQuery.lte('start_at', params.to);
      if (params.projectId) teamQuery = teamQuery.eq('project_id', params.projectId);
      if (params.statuses && params.statuses.length > 0) teamQuery = teamQuery.in('status', params.statuses);
      if (params.eventTypes && params.eventTypes.length > 0) teamQuery = teamQuery.in('event_type', params.eventTypes);

      const { data: teamData, error: teamQueryError } = await teamQuery;
      if (teamQueryError) {
        console.error('[listCalendarEvents] Team events error:', teamQueryError);
        return { data: null, error: teamQueryError.message };
      }
      teamEvents = (teamData ?? []) as CalendarEvent[];
    }

    // Step 4: Get custom shared events
    const { data: sharedRows, error: sharedError } = await browserSupabaseClient
      .from('calendar_event_shared_users')
      .select('event_id')
      .eq('user_id', params.currentUserId);
    if (sharedError) return { data: null, error: sharedError.message };
    const sharedEventIds = (sharedRows ?? []).map((r: any) => r.event_id);

    let customEvents: CalendarEvent[] = [];
    if (sharedEventIds.length > 0) {
      let customQuery = browserSupabaseClient
        .from(table)
        .select('*')
        .eq('visibility', 'custom')
        .in('id', sharedEventIds);
      
      if (params.from) customQuery = customQuery.gte('end_at', params.from);
      if (params.to) customQuery = customQuery.lte('start_at', params.to);
      if (params.projectId) customQuery = customQuery.eq('project_id', params.projectId);
      if (params.statuses && params.statuses.length > 0) customQuery = customQuery.in('status', params.statuses);
      if (params.eventTypes && params.eventTypes.length > 0) customQuery = customQuery.in('event_type', params.eventTypes);

      const { data: customData, error: customErr } = await customQuery;
      if (customErr) return { data: null, error: customErr.message };
      customEvents = (customData ?? []) as CalendarEvent[];
    }

    // Step 5: Merge and dedupe
    const mergedMap = new Map<string, CalendarEvent>();
    (privateEvents ?? []).forEach((ev: any) => mergedMap.set(ev.id, ev as CalendarEvent));
    teamEvents.forEach((ev) => mergedMap.set(ev.id, ev));
    customEvents.forEach((ev) => mergedMap.set(ev.id, ev));

    return { data: Array.from(mergedMap.values()), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to list calendar events' };
  }
}

export async function createCalendarEvent(payload: CreateCalendarEventInput): Promise<Result<CalendarEvent>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  try {
    const { data, error } = await browserSupabaseClient
      .from(table)
      .insert({
        account_id: payload.account_id,
        created_by: payload.created_by,
        title: payload.title,
        description: payload.description ?? null,
        start_at: payload.start_at,
        end_at: payload.end_at,
        all_day: payload.all_day ?? false,
        event_type: payload.event_type ?? 'event',
        project_id: payload.project_id ?? null,
        status: payload.status ?? 'planned',
        color: payload.color ?? null,
        visibility: payload.visibility ?? 'private',
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    const event = data as CalendarEvent;

    // Insert shared users if custom visibility
    if (payload.visibility === 'custom' && payload.shared_user_ids && payload.shared_user_ids.length > 0) {
      const { error: sharedErr } = await browserSupabaseClient.from('calendar_event_shared_users').insert(
        payload.shared_user_ids.map((uid) => ({
          event_id: event.id,
          user_id: uid,
        })),
      );
      if (sharedErr) return { data: null, error: sharedErr.message };
    }

    return { data: event, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create calendar event' };
  }
}

export async function updateCalendarEvent(
  id: string,
  payload: UpdateCalendarEventInput,
): Promise<Result<CalendarEvent>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  try {
    const { data, error } = await browserSupabaseClient
      .from(table)
      .update({
        ...(payload.account_id ? { account_id: payload.account_id } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.start_at !== undefined ? { start_at: payload.start_at } : {}),
        ...(payload.end_at !== undefined ? { end_at: payload.end_at } : {}),
        ...(payload.all_day !== undefined ? { all_day: payload.all_day } : {}),
        ...(payload.event_type !== undefined ? { event_type: payload.event_type } : {}),
        ...(payload.project_id !== undefined ? { project_id: payload.project_id } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.color !== undefined ? { color: payload.color } : {}),
        ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
      })
      .eq('id', id)
      .eq('created_by', payload.currentUserId)
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    // Update shared users if provided
    if (payload.visibility === 'custom' && payload.shared_user_ids) {
      // replace existing shared list
      await browserSupabaseClient.from('calendar_event_shared_users').delete().eq('event_id', id);
      if (payload.shared_user_ids.length > 0) {
        const { error: sharedErr } = await browserSupabaseClient.from('calendar_event_shared_users').insert(
          payload.shared_user_ids.map((uid) => ({
            event_id: id,
            user_id: uid,
          })),
        );
        if (sharedErr) return { data: null, error: sharedErr.message };
      }
    } else if (payload.visibility && payload.visibility !== 'custom') {
      // clear shared if switching away from custom
      await browserSupabaseClient.from('calendar_event_shared_users').delete().eq('event_id', id);
    }

    return { data: data as CalendarEvent, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update calendar event' };
  }
}

export async function deleteCalendarEvent(id: string): Promise<Result<{ id: string }>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  try {
    const { error } = await browserSupabaseClient.from(table).delete().eq('id', id);
    if (error) return { data: null, error: error.message };
    return { data: { id }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete calendar event' };
  }
}

