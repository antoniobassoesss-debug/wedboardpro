import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
const formatDue = (value) => {
    if (!value)
        return 'No due date';
    const target = new Date(value);
    const today = new Date();
    const diff = Math.floor((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (diff === 0)
        return 'Today';
    if (diff === 1)
        return 'Tomorrow';
    if (diff < 0)
        return 'Overdue';
    return target.toLocaleDateString();
};
const TaskItem = ({ task, onToggle, onUpdateTitle, onUpdateNotes, onUpdatePriority, onUpdateDueDate, onToggleFlag, onDelete, onUpdateAssignee, currentUserId, }) => {
    const [expanded, setExpanded] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    useEffect(() => {
        if (!onUpdateAssignee)
            return;
        const fetchMembers = async () => {
            try {
                const session = JSON.parse(localStorage.getItem('wedboarpro_session') || '{}');
                const token = session?.access_token;
                if (!token)
                    return;
                const res = await fetch('/api/teams/members', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeamMembers(data.members || []);
                }
            }
            catch (err) {
                console.error('Failed to fetch team members:', err);
            }
        };
        fetchMembers();
    }, [onUpdateAssignee]);
    const getAssigneeDisplay = () => {
        if (!task.assignee)
            return 'Unassigned';
        return task.assignee.full_name || task.assignee.email || 'Unknown';
    };
    const getAssigneeInitials = () => {
        if (!task.assignee)
            return '?';
        const name = task.assignee.full_name || task.assignee.email || 'U';
        return name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };
    return (_jsxs("div", { className: "task-item", children: [_jsxs("div", { className: "task-row", children: [_jsx("input", { type: "checkbox", checked: task.isCompleted, onChange: () => onToggle(task.id) }), _jsx("input", { className: `task-title ${task.isCompleted ? 'completed' : ''}`, value: task.title, onChange: (e) => onUpdateTitle(task.id, e.target.value) }), _jsxs("div", { className: "meta-row", children: [onUpdateAssignee && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [task.assignee ? (_jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '4px 8px',
                                            borderRadius: 12,
                                            background: '#f0f0f0',
                                            fontSize: 12,
                                        }, title: getAssigneeDisplay(), children: [task.assignee.avatar_url ? (_jsx("img", { src: task.assignee.avatar_url, alt: getAssigneeDisplay(), style: { width: 16, height: 16, borderRadius: '50%' } })) : (_jsx("div", { style: {
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    background: '#2563eb',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                }, children: getAssigneeInitials() })), _jsx("span", { style: { maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: getAssigneeDisplay() })] })) : (_jsx("span", { style: { fontSize: 12, color: '#999' }, children: "Unassigned" })), _jsxs("select", { style: { fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '1px solid #ddd' }, value: task.assignee_id || '', onChange: (e) => onUpdateAssignee(task.id, e.target.value || null), children: [_jsx("option", { value: "", children: "Unassigned" }), teamMembers.map((member) => {
                                                const name = member.profile?.full_name || member.displayName || member.profile?.email || 'Unknown';
                                                return (_jsx("option", { value: member.user_id, children: name }, member.user_id));
                                            })] })] })), _jsxs("label", { className: "date-control", children: [_jsx("span", { children: formatDue(task.dueDate) }), _jsx("input", { className: "task-date-input", type: "date", value: task.dueDate ?? '', onChange: (e) => onUpdateDueDate(task.id, e.target.value || null) })] }), _jsxs("select", { className: "priority-select", value: task.priority, onChange: (e) => onUpdatePriority(task.id, e.target.value), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] }), _jsx("span", { className: `priority-pill priority-${task.priority}`, children: task.priority }), _jsx("button", { className: "small-btn", onClick: () => onToggleFlag(task.id), children: task.isFlagged ? 'Flagged' : 'Flag' }), _jsx("button", { className: "small-btn", onClick: () => setExpanded((s) => !s), children: expanded ? 'Hide' : 'Notes' }), onDelete && (_jsx("button", { className: "small-btn", onClick: () => onDelete(task.id), children: "Delete" }))] })] }), expanded && (_jsx("div", { className: "notes-area", children: _jsx("textarea", { value: task.notes, onChange: (e) => onUpdateNotes(task.id, e.target.value), rows: 4 }) }))] }));
};
export default TaskItem;
//# sourceMappingURL=TaskItem.js.map