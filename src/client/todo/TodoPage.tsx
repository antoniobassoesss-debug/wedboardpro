import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import './todo.css';
import type { Task, Priority } from './todoData';
import { listTasks, createTask, updateTask, deleteTask, type Task as ApiTask } from '../api/tasksApi';
import TaskList from './TaskList';

type StatusFilter = 'all' | 'active' | 'completed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
type DueFilter = 'all' | 'today' | 'next7' | 'overdue';
type AssigneeFilter = 'all' | 'me' | 'unassigned';

// Rounded Pill Filter - clickable pill that shows current selection
interface FilterDropdownProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  defaultValue?: T;
}

function FilterDropdown<T extends string>({ label, value, options, onChange, defaultValue = 'all' as T }: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isFiltered = value !== defaultValue;
  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  return (
    <div className="td-filter" ref={ref}>
      <button
        type="button"
        className={`td-filter-trigger ${isOpen ? 'open' : ''} ${isFiltered ? 'filtered' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isFiltered ? selectedLabel : label}
      </button>
      {isOpen && (
        <div className="td-filter-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`td-filter-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TodoPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('me');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'created' | 'assignee'>('due');
  const [showCompletedBottom, setShowCompletedBottom] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<{
    title: string;
    priority: Priority;
    dueDate: string;
    notes: string;
    assignee_id: string | null;
    event_id: string | null;
  }>({
    title: '',
    priority: 'low',
    dueDate: '',
    notes: '',
    assignee_id: null,
    event_id: null,
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
        options.my_tasks = true;
      } else if (assigneeFilter === 'unassigned') {
        options.unassigned = true;
      }
      if (statusFilter === 'active') {
        options.completed = false;
      } else if (statusFilter === 'completed') {
        options.completed = true;
      }

      const { data, error} = await listTasks(options);
      if (error) {
        console.error('Failed to fetch tasks:', error);
        return;
      }

      console.log('[TodoPage] Fetched tasks:', data?.length || 0, 'tasks with filter:', assigneeFilter);

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
        created_by: t.created_by,
        creator: t.creator,
        assignee_id: t.assignee_id,
        assignee: t.assignee,
        event_id: t.event_id,
        event: t.event,
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
      assignee_id: null,
      event_id: null,
    });
    setShowModal(true);
  };

  const handleModalSave = async () => {
    if (!newTaskData.title.trim()) return;

    const { data, error } = await createTask({
      title: newTaskData.title,
      description: newTaskData.notes,
      priority: newTaskData.priority,
      is_flagged: false,
      due_date: newTaskData.dueDate || null,
      assignee_id: newTaskData.assignee_id,
      event_id: newTaskData.event_id,
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
        created_by: data.created_by,
        creator: data.creator,
        assignee_id: data.assignee_id,
        assignee: data.assignee,
        event_id: data.event_id,
        event: data.event,
      };
      setTasks((prev) => [converted, ...prev]);

      // Log success for debugging
      console.log('[TodoPage] Task created successfully:', {
        id: data.id,
        creator: data.creator?.full_name || data.creator?.email || 'You',
        assignee: data.assignee?.full_name || data.assignee?.email || 'Unassigned',
        assignee_id: data.assignee_id,
        team_id: data.team_id,
      });
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
    if (patch.event_id !== undefined) apiPatch.event_id = patch.event_id;

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
        created_by: data.created_by,
        creator: data.creator,
        assignee_id: data.assignee_id,
        assignee: data.assignee,
        event_id: data.event_id,
        event: data.event,
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
        <FilterDropdown
          label="Assignee"
          value={assigneeFilter}
          options={[
            { value: 'me', label: 'My tasks' },
            { value: 'all', label: 'All team tasks' },
            { value: 'unassigned', label: 'Unassigned' },
          ]}
          onChange={setAssigneeFilter}
          defaultValue="me"
        />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="Due"
          value={dueFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'next7', label: 'Next 7 days' },
            { value: 'overdue', label: 'Overdue' },
          ]}
          onChange={setDueFilter}
        />
        <FilterDropdown
          label="Sort"
          value={sortBy}
          defaultValue="due"
          options={[
            { value: 'due', label: 'Due date' },
            { value: 'priority', label: 'Priority' },
            { value: 'assignee', label: 'Assignee' },
            { value: 'created', label: 'Created' },
          ]}
          onChange={setSortBy}
        />
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
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const session = JSON.parse(localStorage.getItem('wedboarpro_session') || '{}');
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/events', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const getAssigneeName = () => {
    if (!newTaskData.assignee_id) return 'Unassigned';
    const member = teamMembers.find((m) => m.user_id === newTaskData.assignee_id);
    return member?.profile?.full_name || member?.displayName || member?.profile?.email || 'Unknown';
  };

  const getProjectName = () => {
    if (!newTaskData.event_id) return 'No Project';
    const project = projects.find((p) => p.id === newTaskData.event_id);
    return project?.title || 'Unknown';
  };

  return (
    <div className="todo-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="todo-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Task</h3>

        <input
          type="text"
          value={newTaskData.title}
          onChange={(e) => setNewTaskData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Task title"
          style={{ fontSize: 16, fontWeight: 600, border: 'none', padding: '8px 0', outline: 'none' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {/* Assignee Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span style={{ color: '#64748b' }}>👤</span>
              <span>{getAssigneeName()}</span>
            </button>
            {showAssigneeMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: 180,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <button
                  onClick={() => {
                    setNewTaskData((prev) => ({ ...prev, assignee_id: null }));
                    setShowAssigneeMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: !newTaskData.assignee_id ? '#f1f5f9' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Unassigned
                </button>
                {teamMembers.map((member) => {
                  const name = member.profile?.full_name || member.displayName || member.profile?.email || 'Unknown';
                  return (
                    <button
                      key={member.user_id}
                      onClick={() => {
                        setNewTaskData((prev) => ({ ...prev, assignee_id: member.user_id }));
                        setShowAssigneeMenu(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: newTaskData.assignee_id === member.user_id ? '#f1f5f9' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span style={{ color: '#64748b' }}>📁</span>
              <span>{getProjectName()}</span>
            </button>
            {showProjectMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: 180,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <button
                  onClick={() => {
                    setNewTaskData((prev) => ({ ...prev, event_id: null }));
                    setShowProjectMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: !newTaskData.event_id ? '#f1f5f9' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  No Project
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setNewTaskData((prev) => ({ ...prev, event_id: project.id }));
                      setShowProjectMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: newTaskData.event_id === project.id ? '#f1f5f9' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className={`priority-pill priority-${newTaskData.priority}`}
              style={{ cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {newTaskData.priority}
            </button>
            {showPriorityMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: 100,
                }}
              >
                {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => {
                      setNewTaskData((prev) => ({ ...prev, priority }));
                      setShowPriorityMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: newTaskData.priority === priority ? '#f1f5f9' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: newTaskData.priority === priority ? 600 : 400,
                    }}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due Date Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
              }}
            >
              <span style={{ color: '#64748b' }}>📅</span>
              <span>{newTaskData.dueDate || 'No due date'}</span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={newTaskData.dueDate}
              onChange={(e) => setNewTaskData((prev) => ({ ...prev, dueDate: e.target.value }))}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
            />
          </div>
        </div>

        <textarea
          rows={4}
          value={newTaskData.notes}
          onChange={(e) => setNewTaskData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Add notes..."
          style={{ marginTop: 16, width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, fontSize: 13, resize: 'vertical' }}
        />

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={onSave}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
