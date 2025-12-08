export interface TaskAssignee {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
}
export interface Task {
    id: string;
    team_id: string;
    created_by: string;
    assignee_id: string | null;
    assignee: TaskAssignee | null;
    title: string;
    description: string;
    is_completed: boolean;
    priority: 'low' | 'medium' | 'high';
    is_flagged: boolean;
    due_date: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreateTaskInput {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    is_flagged?: boolean;
    due_date?: string | null;
    assignee_id?: string | null;
}
export interface UpdateTaskInput {
    title?: string;
    description?: string;
    is_completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    is_flagged?: boolean;
    due_date?: string | null;
    assignee_id?: string | null;
}
export declare function listTasks(options?: {
    assignee_id?: string;
    unassigned?: boolean;
    completed?: boolean;
}): Promise<{
    data: Task[] | null;
    error: string | null;
}>;
export declare function createTask(input: CreateTaskInput): Promise<{
    data: Task | null;
    error: string | null;
}>;
export declare function updateTask(id: string, input: UpdateTaskInput): Promise<{
    data: Task | null;
    error: string | null;
}>;
export declare function deleteTask(id: string): Promise<{
    error: string | null;
}>;
//# sourceMappingURL=tasksApi.d.ts.map