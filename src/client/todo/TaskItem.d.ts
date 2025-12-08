import React from 'react';
import type { Task } from './todoData';
interface TaskItemProps {
    task: Task;
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
declare const TaskItem: React.FC<TaskItemProps>;
export default TaskItem;
//# sourceMappingURL=TaskItem.d.ts.map