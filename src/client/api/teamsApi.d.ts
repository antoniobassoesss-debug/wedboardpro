import type { StageTaskStatus, StageTaskPriority } from './eventsPipelineApi';
export type CoreTeamRole = 'owner' | 'admin' | 'member';
export type MemberPosition = 'lead_planner' | 'assistant' | 'intern' | 'freelancer' | 'admin' | 'vendor_internal' | string;
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
    date: string;
    status: AvailabilityStatus;
    note: string | null;
}
export interface EventAssignmentSummary {
    id: string;
    event_id: string;
    event_title: string;
    wedding_date: string | null;
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
export type Result<T> = {
    data: T | null;
    error: string | null;
};
export declare function listTeamMembers(): Promise<Result<TeamMemberSummary[]>>;
export declare function fetchTeamMember(memberId: string): Promise<Result<TeamMemberDetail>>;
export declare function listMemberTasks(memberId: string): Promise<Result<MemberTaskSummary[]>>;
export declare function fetchTeamWorkload(): Promise<Result<WorkloadByMember[]>>;
//# sourceMappingURL=teamsApi.d.ts.map