export type Priority = 'low' | 'medium' | 'high';
export interface Task {
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate?: string | null;
    priority: Priority;
    isFlagged: boolean;
    notes: string;
    createdAt: string;
    updatedAt: string;
    assignee_id?: string | null;
    assignee?: {
        id: string;
        full_name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
    } | null;
}
export declare const exampleTasks: Task[];
export declare const createEmptyTask: (title?: string) => Task;
//# sourceMappingURL=todoData.d.ts.map