import React, { useMemo, useState, useCallback, useEffect } from 'react';
import './todo.css';
import type { Task, Priority } from './todoData';
import { listTasks, createTask, updateTask, deleteTask, type Task as ApiTask } from '../api/tasksApi';
import TaskList from './TaskList';

type StatusFilter = 'all' | 'active' | 'completed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
type DueFilter = 'all' | 'today' | 'next7' | 'overdue';
type AssigneeFilter = 'all' | 'me' | 'unassigned';

const TodoPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'created' | 'assignee'>('due');
  const [showCompletedBottom, setShowCompletedBottom] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<{
    title: string;
    priority: Priority;
    dueDate: string;
    notes: string;
    isFlagged: boolean;
    assignee_id: string | null;
  }>({
    title: '',
    priority: 'low',
    dueDate: '',
    notes: '',
    isFlagged: false,
    assignee_id: null,
  });

  // Get current user ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('wedboarpro_session');
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      setCurrentUserId(session?.user?.id || null);
    } catch {
      // ignore
    }
  }, []);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const options: any = {};
      if (assigneeFilter === 'me' && currentUserId) {
        options.assignee_id = currentUserId;
      } else if (assigneeFilter === 'unassigned') {
        options.unassigned = true;
      }
      if (statusFilter === 'active') {
        options.completed = false;
      } else if (statusFilter === 'completed') {
        options.completed = true;
      }

      const { data, error } = await listTasks(options);
      if (error) {
        console.error('Failed to fetch tasks:', error);
        return;
      }

      // Convert API tasks to local Task format
      const convertedTasks: Task[] = (data || []).map((t: ApiTask) => ({
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
    } catch (err) {
      console.error('Unexpected error fetching tasks:', err);
    } finally {
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
    if (!newTaskData.title.trim()) return;

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
      const converted: Task = {
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

  const updateTaskLocal = async (id: string, patch: Partial<Task>) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));

    // Convert to API format
    const apiPatch: any = {};
    if (patch.title !== undefined) apiPatch.title = patch.title;
    if (patch.notes !== undefined) apiPatch.description = patch.notes;
    if (patch.isCompleted !== undefined) apiPatch.is_completed = patch.isCompleted;
    if (patch.priority !== undefined) apiPatch.priority = patch.priority;
    if (patch.isFlagged !== undefined) apiPatch.is_flagged = patch.isFlagged;
    if (patch.dueDate !== undefined) apiPatch.due_date = patch.dueDate;
    if (patch.assignee_id !== undefined) apiPatch.assignee_id = patch.assignee_id;

    const { data, error } = await updateTask(id, apiPatch);
    if (error) {
      console.error('Failed to update task:', error);
      // Revert optimistic update
      fetchTasks();
    } else if (data) {
      // Update with server response
      const converted: Task = {
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

  const handleDelete = async (id: string) => {
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
        if (statusFilter === 'active') return !t.isCompleted;
        if (statusFilter === 'completed') return t.isCompleted;
        return true;
      })
      .filter((t) => {
        if (priorityFilter === 'all') return true;
        return t.priority === priorityFilter;
      })
      .filter((t) => {
        if (dueFilter === 'all') return true;
        if (!t.dueDate) return false;
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
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'priority') {
          const rank = { high: 0, medium: 1, low: 2 } as any;
          return rank[a.priority] - rank[b.priority];
        }
        if (sortBy === 'assignee') {
          const aName = a.assignee?.full_name || a.assignee?.email || 'Unassigned';
          const bName = b.assignee?.full_name || b.assignee?.email || 'Unassigned';
          if (aName === 'Unassigned' && bName !== 'Unassigned') return 1;
          if (aName !== 'Unassigned' && bName === 'Unassigned') return -1;
          return aName.localeCompare(bName);
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [tasks, query, statusFilter, priorityFilter, dueFilter, sortBy]);

  const orderedTasks = useMemo(() => {
    if (!showCompletedBottom) return filtered;
    const active = filtered.filter((task) => !task.isCompleted);
    const completed = filtered.filter((task) => task.isCompleted);
    return [...active, ...completed];
  }, [filtered, showCompletedBottom]);

  const onToggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    updateTaskLocal(id, { isCompleted: !t.isCompleted });
  };

  const onUpdateTitle = (id: string, title: string) => updateTaskLocal(id, { title });
  const onUpdateNotes = (id: string, notes: string) => updateTaskLocal(id, { notes });
  const onUpdatePriority = (id: string, priority: Task['priority']) => updateTaskLocal(id, { priority });
  const onToggleFlag = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    updateTaskLocal(id, { isFlagged: !t.isFlagged });
  };
  const onDelete = (id: string) => handleDelete(id);
  const onUpdateAssignee = (id: string, assignee_id: string | null) => updateTaskLocal(id, { assignee_id });

  return (
    <div className="todo-shell">
      <div className="todo-header">
        <div className="todo-controls">
          <button className="primary-btn" onClick={openModal}>New Task</button>
          <input className="todo-search" placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="toggle-control">
          <input type="checkbox" checked={showCompletedBottom} onChange={(e) => setShowCompletedBottom(e.target.checked)} />
          <span>Show completed last</span>
        </label>
      </div>

      <div className="filters-row">
        <div className="todo-controls">
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            Priority
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}>
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Due
            <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter)}>
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="next7">Next 7 days</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label>
            Assignee
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as AssigneeFilter)}>
              <option value="all">All tasks</option>
              <option value="me">My tasks</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <label>
            Sort
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="due">By due date</option>
              <option value="priority">By priority</option>
              <option value="assignee">By assignee</option>
              <option value="created">By created</option>
            </select>
          </label>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7c7c7c' }}>Loading tasks…</div>
      ) : (
        <TaskList
          tasks={orderedTasks}
          onToggle={onToggle}
          onUpdateTitle={onUpdateTitle}
          onUpdateNotes={onUpdateNotes}
          onUpdatePriority={onUpdatePriority}
          onUpdateDueDate={(id, dueDate) => updateTaskLocal(id, { dueDate })}
          onToggleFlag={onToggleFlag}
          onDelete={onDelete}
          onUpdateAssignee={onUpdateAssignee}
          currentUserId={currentUserId}
        />
      )}

      {showModal && (
        <TaskCreateModal
          newTaskData={newTaskData}
          setNewTaskData={setNewTaskData}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

// Task Create Modal Component
const TaskCreateModal: React.FC<{
  newTaskData: any;
  setNewTaskData: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
  currentUserId: string | null;
}> = ({ newTaskData, setNewTaskData, onSave, onClose, currentUserId }) => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const session = JSON.parse(localStorage.getItem('wedboarpro_session') || '{}');
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/teams/members', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  return (
    <div className="todo-modal-overlay" role="dialog" aria-modal="true">
      <div className="todo-modal">
        <h3>Create Task</h3>
        <label>
          Title
          <input
            type="text"
            value={newTaskData.title}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Task title"
          />
        </label>
        <label>
          Assignee
          <select
            value={newTaskData.assignee_id || ''}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, assignee_id: e.target.value || null }))}
            disabled={loadingMembers}
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => {
              const name = member.profile?.full_name || member.displayName || member.profile?.email || 'Unknown';
              return (
                <option key={member.user_id} value={member.user_id}>
                  {name}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Priority
          <select
            value={newTaskData.priority}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, priority: e.target.value as Priority }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Due date
          <input
            type="date"
            value={newTaskData.dueDate}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
        </label>
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={newTaskData.isFlagged}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, isFlagged: e.target.checked }))}
          />
          <span>Flag as important</span>
        </label>
        <label>
          Notes
          <textarea
            rows={4}
            value={newTaskData.notes}
            onChange={(e) => setNewTaskData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add a quick description…"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={onSave}>
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
