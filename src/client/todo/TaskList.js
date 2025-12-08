import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import TaskItem from './TaskItem';
const TaskList = ({ tasks, onToggle, onUpdateTitle, onUpdateNotes, onUpdatePriority, onUpdateDueDate, onToggleFlag, onDelete, onUpdateAssignee, currentUserId, }) => {
    return (_jsx("div", { className: "task-list", children: tasks.map((task) => (_jsx(TaskItem, { task: task, onToggle: onToggle, onUpdateTitle: onUpdateTitle, onUpdateNotes: onUpdateNotes, onUpdatePriority: onUpdatePriority, onUpdateDueDate: onUpdateDueDate, onToggleFlag: onToggleFlag, onDelete: onDelete, onUpdateAssignee: onUpdateAssignee, currentUserId: currentUserId }, task.id))) }));
};
export default TaskList;
//# sourceMappingURL=TaskList.js.map