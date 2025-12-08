import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import './todo.css';
import { listTasks, createTask, updateTask, deleteTask } from '../api/tasksApi';
import TaskList from './TaskList';
const TodoPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [dueFilter, setDueFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('due');
    const [showCompletedBottom, setShowCompletedBottom] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [newTaskData, setNewTaskData] = useState({
        title: '',
        priority: 'low',
        dueDate: '',
        notes: '',
        isFlagged: false,
        assignee_id: null,
    });
    // Get current user ID
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const raw = window.localStorage.getItem('wedboarpro_session');
        if (!raw)
            return;
        try {
            const session = JSON.parse(raw);
            setCurrentUserId(session?.user?.id || null);
        }
        catch {
            // ignore
        }
    }, []);
    // Fetch tasks from API
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const options = {};
            if (assigneeFilter === 'me' && currentUserId) {
                options.assignee_id = currentUserId;
            }
            else if (assigneeFilter === 'unassigned') {
                options.unassigned = true;
            }
            if (statusFilter === 'active') {
                options.completed = false;
            }
            else if (statusFilter === 'completed') {
                options.completed = true;
            }
            const { data, error } = await listTasks(options);
            if (error) {
                console.error('Failed to fetch tasks:', error);
                return;
            }
            // Convert API tasks to local Task format
            const convertedTasks = (data || []).map((t) => ({
                id: t.id,
                title: t.title,
                isCompleted: t.is_completed,
                dueDate: t.due_date,
                priority: t.priority,
                isFlagged: t.is_flagged,
                notes: t.description,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                assignee_id: t.assignee_id,
                assignee: t.assignee,
            }));
            setTasks(convertedTasks);
        }
        catch (err) {
            console.error('Unexpected error fetching tasks:', err);
        }
        finally {
            setLoading(false);
        }
    }, [assigneeFilter, statusFilter, currentUserId]);
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    const openModal = () => {
        setNewTaskData({
            title: '',
            priority: 'low',
            dueDate: '',
            notes: '',
            isFlagged: false,
            assignee_id: null,
        });
        setShowModal(true);
    };
    const handleModalSave = async () => {
        if (!newTaskData.title.trim())
            return;
        const { data, error } = await createTask({
            title: newTaskData.title,
            description: newTaskData.notes,
            priority: newTaskData.priority,
            is_flagged: newTaskData.isFlagged,
            due_date: newTaskData.dueDate || null,
            assignee_id: newTaskData.assignee_id,
        });
        if (error) {
            console.error('Failed to create task:', error);
            alert(`Failed to create task: ${error}`);
            return;
        }
        if (data) {
            // Convert to local format and add to list
            const converted = {
                id: data.id,
                title: data.title,
                isCompleted: data.is_completed,
                dueDate: data.due_date,
                priority: data.priority,
                isFlagged: data.is_flagged,
                notes: data.description,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                assignee_id: data.assignee_id,
                assignee: data.assignee,
            };
            setTasks((prev) => [converted, ...prev]);
        }
        setShowModal(false);
    };
    const updateTaskLocal = async (id, patch) => {
        // Optimistic update
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));
        // Convert to API format
        const apiPatch = {};
        if (patch.title !== undefined)
            apiPatch.title = patch.title;
        if (patch.notes !== undefined)
            apiPatch.description = patch.notes;
        if (patch.isCompleted !== undefined)
            apiPatch.is_completed = patch.isCompleted;
        if (patch.priority !== undefined)
            apiPatch.priority = patch.priority;
        if (patch.isFlagged !== undefined)
            apiPatch.is_flagged = patch.isFlagged;
        if (patch.dueDate !== undefined)
            apiPatch.due_date = patch.dueDate;
        if (patch.assignee_id !== undefined)
            apiPatch.assignee_id = patch.assignee_id;
        const { data, error } = await updateTask(id, apiPatch);
        if (error) {
            console.error('Failed to update task:', error);
            // Revert optimistic update
            fetchTasks();
        }
        else if (data) {
            // Update with server response
            const converted = {
                id: data.id,
                title: data.title,
                isCompleted: data.is_completed,
                dueDate: data.due_date,
                priority: data.priority,
                isFlagged: data.is_flagged,
                notes: data.description,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                assignee_id: data.assignee_id,
                assignee: data.assignee,
            };
            setTasks((prev) => prev.map((t) => (t.id === id ? converted : t)));
        }
    };
    const handleDelete = async (id) => {
        const { error } = await deleteTask(id);
        if (error) {
            console.error('Failed to delete task:', error);
            alert(`Failed to delete task: ${error}`);
            return;
        }
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };
    const filtered = useMemo(() => {
        const now = new Date();
        const next7 = new Date();
        next7.setDate(now.getDate() + 7);
        return tasks
            .filter((t) => (query ? t.title.toLowerCase().includes(query.toLowerCase()) || t.notes.toLowerCase().includes(query.toLowerCase()) : true))
            .filter((t) => {
            if (statusFilter === 'active')
                return !t.isCompleted;
            if (statusFilter === 'completed')
                return t.isCompleted;
            return true;
        })
            .filter((t) => {
            if (priorityFilter === 'all')
                return true;
            return t.priority === priorityFilter;
        })
            .filter((t) => {
            if (dueFilter === 'all')
                return true;
            if (!t.dueDate)
                return false;
            const d = new Date(t.dueDate);
            if (dueFilter === 'today') {
                const today = new Date();
                return d.toDateString() === today.toDateString();
            }
            if (dueFilter === 'next7') {
                return d >= now && d <= next7;
            }
            if (dueFilter === 'overdue') {
                return new Date(t.dueDate) < new Date();
            }
            return true;
        })
            .sort((a, b) => {
            if (sortBy === 'due') {
                if (!a.dueDate)
                    return 1;
                if (!b.dueDate)
                    return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (sortBy === 'priority') {
                const rank = { high: 0, medium: 1, low: 2 };
                return rank[a.priority] - rank[b.priority];
            }
            if (sortBy === 'assignee') {
                const aName = a.assignee?.full_name || a.assignee?.email || 'Unassigned';
                const bName = b.assignee?.full_name || b.assignee?.email || 'Unassigned';
                if (aName === 'Unassigned' && bName !== 'Unassigned')
                    return 1;
                if (aName !== 'Unassigned' && bName === 'Unassigned')
                    return -1;
                return aName.localeCompare(bName);
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }, [tasks, query, statusFilter, priorityFilter, dueFilter, sortBy]);
    const orderedTasks = useMemo(() => {
        if (!showCompletedBottom)
            return filtered;
        const active = filtered.filter((task) => !task.isCompleted);
        const completed = filtered.filter((task) => task.isCompleted);
        return [...active, ...completed];
    }, [filtered, showCompletedBottom]);
    const onToggle = (id) => {
        const t = tasks.find((x) => x.id === id);
        if (!t)
            return;
        updateTaskLocal(id, { isCompleted: !t.isCompleted });
    };
    const onUpdateTitle = (id, title) => updateTaskLocal(id, { title });
    const onUpdateNotes = (id, notes) => updateTaskLocal(id, { notes });
    const onUpdatePriority = (id, priority) => updateTaskLocal(id, { priority });
    const onToggleFlag = (id) => {
        const t = tasks.find((x) => x.id === id);
        if (!t)
            return;
        updateTaskLocal(id, { isFlagged: !t.isFlagged });
    };
    const onDelete = (id) => handleDelete(id);
    const onUpdateAssignee = (id, assignee_id) => updateTaskLocal(id, { assignee_id });
    return (_jsxs("div", { className: "todo-shell", children: [_jsxs("div", { className: "todo-header", children: [_jsxs("div", { className: "todo-controls", children: [_jsx("button", { className: "primary-btn", onClick: openModal, children: "New Task" }), _jsx("input", { className: "todo-search", placeholder: "Search tasks\u2026", value: query, onChange: (e) => setQuery(e.target.value) })] }), _jsxs("label", { className: "toggle-control", children: [_jsx("input", { type: "checkbox", checked: showCompletedBottom, onChange: (e) => setShowCompletedBottom(e.target.checked) }), _jsx("span", { children: "Show completed last" })] })] }), _jsx("div", { className: "filters-row", children: _jsxs("div", { className: "todo-controls", children: [_jsxs("label", { children: ["Status", _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "completed", children: "Completed" })] })] }), _jsxs("label", { children: ["Priority", _jsxs("select", { value: priorityFilter, onChange: (e) => setPriorityFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] })] }), _jsxs("label", { children: ["Due", _jsxs("select", { value: dueFilter, onChange: (e) => setDueFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "today", children: "Today" }), _jsx("option", { value: "next7", children: "Next 7 days" }), _jsx("option", { value: "overdue", children: "Overdue" })] })] }), _jsxs("label", { children: ["Assignee", _jsxs("select", { value: assigneeFilter, onChange: (e) => setAssigneeFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All tasks" }), _jsx("option", { value: "me", children: "My tasks" }), _jsx("option", { value: "unassigned", children: "Unassigned" })] })] }), _jsxs("label", { children: ["Sort", _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [_jsx("option", { value: "due", children: "By due date" }), _jsx("option", { value: "priority", children: "By priority" }), _jsx("option", { value: "assignee", children: "By assignee" }), _jsx("option", { value: "created", children: "By created" })] })] })] }) }), loading && tasks.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 40, color: '#7c7c7c' }, children: "Loading tasks\u2026" })) : (_jsx(TaskList, { tasks: orderedTasks, onToggle: onToggle, onUpdateTitle: onUpdateTitle, onUpdateNotes: onUpdateNotes, onUpdatePriority: onUpdatePriority, onUpdateDueDate: (id, dueDate) => updateTaskLocal(id, { dueDate }), onToggleFlag: onToggleFlag, onDelete: onDelete, onUpdateAssignee: onUpdateAssignee, currentUserId: currentUserId })), showModal && (_jsx(TaskCreateModal, { newTaskData: newTaskData, setNewTaskData: setNewTaskData, onSave: handleModalSave, onClose: () => setShowModal(false), currentUserId: currentUserId }))] }));
};
// Task Create Modal Component
const TaskCreateModal = ({ newTaskData, setNewTaskData, onSave, onClose, currentUserId }) => {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    useEffect(() => {
        const fetchMembers = async () => {
            setLoadingMembers(true);
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
            finally {
                setLoadingMembers(false);
            }
        };
        fetchMembers();
    }, []);
    return (_jsx("div", { className: "todo-modal-overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "todo-modal", children: [_jsx("h3", { children: "Create Task" }), _jsxs("label", { children: ["Title", _jsx("input", { type: "text", value: newTaskData.title, onChange: (e) => setNewTaskData((prev) => ({ ...prev, title: e.target.value })), placeholder: "Task title" })] }), _jsxs("label", { children: ["Assignee", _jsxs("select", { value: newTaskData.assignee_id || '', onChange: (e) => setNewTaskData((prev) => ({ ...prev, assignee_id: e.target.value || null })), disabled: loadingMembers, children: [_jsx("option", { value: "", children: "Unassigned" }), teamMembers.map((member) => {
                                    const name = member.profile?.full_name || member.displayName || member.profile?.email || 'Unknown';
                                    return (_jsx("option", { value: member.user_id, children: name }, member.user_id));
                                })] })] }), _jsxs("label", { children: ["Priority", _jsxs("select", { value: newTaskData.priority, onChange: (e) => setNewTaskData((prev) => ({ ...prev, priority: e.target.value })), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] })] }), _jsxs("label", { children: ["Due date", _jsx("input", { type: "date", value: newTaskData.dueDate, onChange: (e) => setNewTaskData((prev) => ({ ...prev, dueDate: e.target.value })) })] }), _jsxs("label", { className: "toggle-control", children: [_jsx("input", { type: "checkbox", checked: newTaskData.isFlagged, onChange: (e) => setNewTaskData((prev) => ({ ...prev, isFlagged: e.target.checked })) }), _jsx("span", { children: "Flag as important" })] }), _jsxs("label", { children: ["Notes", _jsx("textarea", { rows: 4, value: newTaskData.notes, onChange: (e) => setNewTaskData((prev) => ({ ...prev, notes: e.target.value })), placeholder: "Add a quick description\u2026" })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "secondary-btn", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "button", className: "primary-btn", onClick: onSave, children: "Save Task" })] })] }) }));
};
export default TodoPage;
//# sourceMappingURL=TodoPage.js.map