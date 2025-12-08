// Teams module API client for WedBoardPro
// Provides typed access to team members, assignments, tasks and workload views.

import type { StageTaskStatus, StageTaskPriority } from './eventsPipelineApi';

export type CoreTeamRole = 'owner' | 'admin' | 'member';

// High-level "position" for display (separate from core permission role)
export type MemberPosition =
  | 'lead_planner'
  | 'assistant'
  | 'intern'
  | 'freelancer'
  | 'admin'
  | 'vendor_internal'
  | string; // allow custom labels

export type AvailabilityStatus = 'available' | 'busy' | 'on_leave';

export interface TeamMemberPermissions {
  can_edit_events: boolean;
  can_edit_budget: boolean;
  can_invite_members: boolean;
  can_view_financials: boolean;
}

export interface TeamAvailabilityDay {
  id: string;
  team_member_id: string;
  date: string; // ISO date
  status: AvailabilityStatus;
  note: string | null;
}

export interface EventAssignmentSummary {
  id: string;
  event_id: string;
  event_title: string;
  wedding_date: string | null; // ISO date or null
  role_in_event: string;
  is_primary_contact: boolean;
}

export interface MemberTaskSummary {
  id: string;
  event_id: string;
  event_title: string | null;
  title: string;
  status: StageTaskStatus;
  priority: StageTaskPriority;
  due_date: string | null;
}

export interface TeamMemberSummary {
  id: string;
  user_id: string;
  team_id: string;
  role: CoreTeamRole;
  position: MemberPosition | null;
  is_active: boolean;
  hourly_rate: string | null;
  notes: string | null;
  joined_at: string | null;
  displayName: string;
  displayEmail: string | null;
  avatarUrl: string | null;
  upcomingEventsCount: number;
  openTasksCount: number;
}

export interface TeamMemberDetail extends TeamMemberSummary {
  permissions: TeamMemberPermissions;
  assignments: EventAssignmentSummary[];
  tasks: MemberTaskSummary[];
  availability: TeamAvailabilityDay[];
}

export interface WorkloadAssignment {
  event_id: string;
  event_title: string;
  wedding_date: string | null;
  role_in_event: string;
}

export interface WorkloadByMember {
  member_id: string;
  member_name: string;
  assignments: WorkloadAssignment[];
}

export type Result<T> = { data: T | null; error: string | null };

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('wedboarpro_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
};

export async function listTeamMembers(): Promise<Result<TeamMemberSummary[]>> {
  try {
    const token = getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/team', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.members || []) as TeamMemberSummary[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load team members' };
  }
}

export async function fetchTeamMember(memberId: string): Promise<Result<TeamMemberDetail>> {
  try {
    const token = getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/team/${memberId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.member as TeamMemberDetail, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load team member' };
  }
}

export async function listMemberTasks(memberId: string): Promise<Result<MemberTaskSummary[]>> {
  try {
    const token = getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/team/${memberId}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.tasks || []) as MemberTaskSummary[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load member tasks' };
  }
}

export async function fetchTeamWorkload(): Promise<Result<WorkloadByMember[]>> {
  try {
    const token = getAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/team/calendar', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.workload || []) as WorkloadByMember[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load team workload' };
  }
}


