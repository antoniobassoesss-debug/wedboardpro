export type EventStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed';
export type StageKey = 'vision_style' | 'venue_date' | 'guest_list' | 'budget' | 'vendors' | 'design_layout' | 'logistics' | 'wedding_day' | 'post_event';
export type StageTaskStatus = 'todo' | 'in_progress' | 'done';
export type StageTaskPriority = 'low' | 'medium' | 'high';
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';
export type VendorCategory = 'catering' | 'photography' | 'video' | 'music' | 'decor' | 'flowers' | 'cake' | 'transport' | 'others';
export type VendorContractStatus = 'not_contacted' | 'in_negotiation' | 'contract_signed' | 'cancelled';
export type FileCategory = 'contract' | 'layout' | 'menu' | 'photo' | 'other';
export interface Event {
    id: string;
    planner_id: string;
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
    updated_at: string;
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
    preferences: any;
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
export type Result<T> = {
    data: T | null;
    error: string | null;
};
export interface CreateEventInput {
    title: string;
    wedding_date: string;
    guest_count_expected?: number;
    guest_count_confirmed?: number | null;
    budget_planned?: string | null;
    budget_actual?: string | null;
    notes_internal?: string | null;
}
export declare function listEvents(): Promise<Result<Event[]>>;
export declare function createEvent(input: CreateEventInput): Promise<Result<{
    event: Event;
    stages: PipelineStage[];
}>>;
export declare function fetchEventWorkspace(eventId: string): Promise<Result<EventWorkspace>>;
export declare function updateEvent(eventId: string, patch: Partial<Pick<Event, 'title' | 'wedding_date' | 'status' | 'current_stage' | 'guest_count_expected' | 'guest_count_confirmed' | 'budget_planned' | 'budget_actual' | 'notes_internal'>>): Promise<Result<Event>>;
export declare function fetchStages(eventId: string): Promise<Result<PipelineStage[]>>;
export declare function updateStage(stageId: string, patch: Partial<Pick<PipelineStage, 'title' | 'description' | 'progress_percent' | 'due_date' | 'is_blocking' | 'order_index'>>): Promise<Result<PipelineStage>>;
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
export declare function createStageTask(stageId: string, input: CreateStageTaskInput): Promise<Result<StageTask>>;
export declare function updateStageTask(taskId: string, input: UpdateStageTaskInput): Promise<Result<StageTask>>;
export declare function fetchVendors(eventId: string): Promise<Result<Vendor[]>>;
export declare function updateVendor(vendorId: string, patch: Partial<Pick<Vendor, 'category' | 'name' | 'contact_phone' | 'contact_email' | 'website' | 'contract_status' | 'quote_amount' | 'final_amount' | 'notes'>>): Promise<Result<Vendor>>;
export interface CreateEventFileInput {
    file_name: string;
    file_url: string;
    category?: FileCategory;
}
export declare function createEventFile(eventId: string, input: CreateEventFileInput): Promise<Result<EventFile>>;
//# sourceMappingURL=eventsPipelineApi.d.ts.map