import React from 'react';
import type { Task } from './todoData';
interface TaskListProps {
    tasks: Task[];
    onToggle: (id: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    onUpdatePriority: (id: string, priority: Task['priority']) => void;
    onUpdateDueDate: (id: string, dueDate: string | null) => void;
    onToggleFlag: (id: string) => void;
    onDelete?: (id: string) => void;
    onUpdateAssignee?: (id: string, assignee_id: string | null) => void;
    currentUserId?: string | null;
}
declare const TaskList: React.FC<TaskListProps>;
export default TaskList;
//# sourceMappingURL=TaskList.d.ts.map