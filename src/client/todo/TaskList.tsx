import React from 'react';
import type { Task } from './todoData';
import TaskItem from './TaskItem';

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

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggle,
  onUpdateTitle,
  onUpdateNotes,
  onUpdatePriority,
  onUpdateDueDate,
  onToggleFlag,
  onDelete,
  onUpdateAssignee,
  currentUserId,
}) => {
  return (
    <div className="task-list">
      {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onUpdateTitle={onUpdateTitle}
            onUpdateNotes={onUpdateNotes}
            onUpdatePriority={onUpdatePriority}
            onUpdateDueDate={onUpdateDueDate}
            onToggleFlag={onToggleFlag}
            onDelete={onDelete || (() => {})}
            onUpdateAssignee={onUpdateAssignee || (() => {})}
            currentUserId={currentUserId || null}
          />
      ))}
    </div>
  );
};

export default TaskList;


