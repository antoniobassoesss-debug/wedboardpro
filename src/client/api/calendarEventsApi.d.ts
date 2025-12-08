export type CalendarEvent = {
    id: string;
    account_id: string;
    created_by: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    all_day: boolean;
    event_type: string;
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
    start_at: string;
    end_at: string;
    all_day?: boolean;
    event_type?: string;
    project_id?: string | null;
    status?: CalendarEvent['status'];
    color?: CalendarEvent['color'];
    visibility?: CalendarEvent['visibility'];
    shared_user_ids?: string[];
};
export type UpdateCalendarEventInput = Partial<Omit<CreateCalendarEventInput, 'account_id'>> & {
    account_id?: string;
    currentUserId: string;
};
type Result<T> = {
    data: T | null;
    error: string | null;
};
export declare function listCalendarEvents(params: {
    accountId: string;
    currentUserId: string;
    from?: string;
    to?: string;
    projectId?: string | null;
    eventTypes?: string[];
    statuses?: string[];
}): Promise<Result<CalendarEvent[]>>;
export declare function createCalendarEvent(payload: CreateCalendarEventInput): Promise<Result<CalendarEvent>>;
export declare function updateCalendarEvent(id: string, payload: UpdateCalendarEventInput): Promise<Result<CalendarEvent>>;
export declare function deleteCalendarEvent(id: string): Promise<Result<{
    id: string;
}>>;
export {};
//# sourceMappingURL=calendarEventsApi.d.ts.map