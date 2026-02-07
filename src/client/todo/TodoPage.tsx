import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import './todo.css';
import type { Task, Priority } from './todoData';
import { listTasks, createTask, updateTask, deleteTask, type Task as ApiTask } from '../api/tasksApi';
import TaskList from './TaskList';
import { createCalendarEvent } from '../api/calendarEventsApi';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const PlusIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

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
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('me');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'created' | 'assignee'>('due');
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [newTaskData, setNewTaskData] = useState<{
    title: string;
    priority: Priority;
    dueDate: string;
    notes: string;
    assignee_id: string | null;
    event_id: string | null;
    addToCalendar: boolean;
  }>({
    title: '',
    priority: 'low',
    dueDate: '',
    notes: '',
    assignee_id: null,
    event_id: null,
    addToCalendar: false,
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

  // Preload team members and projects for faster modal experience
  useEffect(() => {
    const fetchTeamMembers = async () => {
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
      }
    };

    const fetchProjects = async () => {
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
      }
    };

    fetchTeamMembers();
    fetchProjects();
  }, []);

  // Fetch tasks from API - always show only tasks created by or assigned to the current user
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const options: any = {
        my_tasks: true, // Always filter to tasks created by or assigned to the current user
      };
      if (assigneeFilter === 'unassigned') {
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
      addToCalendar: false,
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

      // Create calendar event if "Add to Calendar" is checked
      if (newTaskData.addToCalendar && newTaskData.dueDate && currentUserId) {
        try {
          const session = JSON.parse(localStorage.getItem('wedboarpro_session') || '{}');
          const accountId = session?.user?.id || currentUserId;
          
          // Create ISO timestamps for the calendar event
          // Use the due date as an all-day event
          const dueDate = new Date(newTaskData.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const startAt = dueDate.toISOString();
          const endDate = new Date(dueDate);
          endDate.setHours(23, 59, 59, 999);
          const endAt = endDate.toISOString();

          const { data: calendarEvent, error: calendarError } = await createCalendarEvent({
            account_id: accountId,
            created_by: currentUserId,
            title: `📋 ${newTaskData.title}`,
            description: newTaskData.notes || `Task: ${newTaskData.title}`,
            start_at: startAt,
            end_at: endAt,
            all_day: true,
            event_type: 'task',
            status: 'planned',
            color: newTaskData.priority === 'high' ? 'red' : newTaskData.priority === 'medium' ? 'orange' : 'green',
            visibility: 'private',
            project_id: newTaskData.event_id,
          });

          if (calendarError) {
            console.error('Failed to create calendar event:', calendarError);
            // Don't fail the whole operation, just log the error
            alert(`Task created, but failed to add to calendar: ${calendarError}`);
          } else {
            console.log('[TodoPage] Calendar event created:', calendarEvent?.id);
          }
        } catch (err) {
          console.error('Unexpected error creating calendar event:', err);
        }
      }
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

    const filteredTasks = tasks
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
    
    // Always show completed tasks last
    const active = filteredTasks.filter((task) => !task.isCompleted);
    const completed = filteredTasks.filter((task) => task.isCompleted);
    return [...active, ...completed];
  }, [tasks, query, statusFilter, priorityFilter, dueFilter, sortBy]);

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
      </div>

      <div className="filters-row">
        <FilterDropdown
          label="Assignee"
          value={assigneeFilter}
          options={[
            { value: 'me', label: 'My tasks' },
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
          tasks={filtered}
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
          teamMembers={teamMembers}
          projects={projects}
        />
      )}

      {/* FAB for mobile */}
      {isMobile && (
        <>
          <button type="button" className="todo-fab" onClick={() => setShowModal(true)} aria-label="Add new task">
            <PlusIcon />
          </button>
          <button
            type="button"
            className="todo-sidebar-menu-btn-mobile"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('wbp:toggle-mobile-menu'));
            }}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </>
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
  teamMembers: any[];
  projects: any[];
}> = ({ newTaskData, setNewTaskData, onSave, onClose, currentUserId, teamMembers, projects }) => {
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

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
    <div 
      className="todo-modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div 
        className="todo-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'modalIn 200ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Create New Task
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
              Add a new task to your workflow
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: '#f1f5f9',
              borderRadius: 999,
              fontSize: 18,
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Task Title
            </label>
            <input
              type="text"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              style={{ 
                fontSize: 14, 
                fontWeight: 500, 
                border: '1px solid #e5e7eb', 
                borderRadius: 8,
                padding: '10px 12px', 
                outline: 'none',
                transition: 'all 150ms ease',
                background: '#ffffff',
                color: '#0f172a',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0f172a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Assignee Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assignee
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                    color: '#0f172a',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getAssigneeName()}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {showAssigneeMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '100%',
                      maxHeight: 240,
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
                        padding: '10px 14px',
                        border: 'none',
                        background: !newTaskData.assignee_id ? '#f1f5f9' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#0f172a',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (newTaskData.assignee_id) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (newTaskData.assignee_id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Unassigned
                    </button>
                    {teamMembers.map((member) => {
                      const name = member.profile?.full_name || member.displayName || member.profile?.email || 'Unknown';
                      const isSelected = newTaskData.assignee_id === member.user_id;
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
                            padding: '10px 14px',
                            border: 'none',
                            background: isSelected ? '#f1f5f9' : 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#0f172a',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'background 100ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Project Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Project
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowProjectMenu(!showProjectMenu)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                    color: '#0f172a',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getProjectName()}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {showProjectMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '100%',
                      maxHeight: 240,
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
                        padding: '10px 14px',
                        border: 'none',
                        background: !newTaskData.event_id ? '#f1f5f9' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#0f172a',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (newTaskData.event_id) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (newTaskData.event_id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      No Project
                    </button>
                    {projects.map((project) => {
                      const isSelected = newTaskData.event_id === project.id;
                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            setNewTaskData((prev) => ({ ...prev, event_id: project.id }));
                            setShowProjectMenu(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            background: isSelected ? '#f1f5f9' : 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#0f172a',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'background 100ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {project.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Priority Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Priority
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                  className={`priority-pill priority-${newTaskData.priority}`}
                  style={{ 
                    cursor: 'pointer', 
                    border: 'none', 
                    width: '100%', 
                    textAlign: 'left', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  <span>{newTaskData.priority}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>▼</span>
                </button>
                {showPriorityMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: '100%',
                    }}
                  >
                    {(['low', 'medium', 'high'] as Priority[]).map((priority) => {
                      const isSelected = newTaskData.priority === priority;
                      return (
                        <button
                          key={priority}
                          onClick={() => {
                            setNewTaskData((prev) => ({ ...prev, priority }));
                            setShowPriorityMenu(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            background: isSelected ? '#f1f5f9' : 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#0f172a',
                            fontWeight: isSelected ? 600 : 400,
                            textTransform: 'capitalize',
                            transition: 'background 100ms ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {priority}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Due Date Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Due Date
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={newTaskData.dueDate}
                  onChange={(e) => setNewTaskData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  style={{
                    padding: '10px 16px 10px 42px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#0f172a',
                    width: '100%',
                    outline: 'none',
                    transition: 'all 150ms ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0f172a';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notes Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Notes
            </label>
            <textarea
              rows={4}
              value={newTaskData.notes}
              onChange={(e) => setNewTaskData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes or description..."
              style={{ 
                width: '100%', 
                border: '1px solid #e5e7eb', 
                borderRadius: 8, 
                padding: '10px 12px', 
                fontSize: 14, 
                color: '#0f172a',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 150ms ease',
                background: '#ffffff',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0f172a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Add to Calendar Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: newTaskData.dueDate ? 'pointer' : 'not-allowed',
              fontSize: 14,
              color: newTaskData.dueDate ? '#0f172a' : '#94a3b8',
              padding: '12px 16px',
              background: newTaskData.dueDate ? '#f8fafc' : '#f1f5f9',
              borderRadius: 10,
              border: `1px solid ${newTaskData.dueDate ? '#e2e8f0' : '#e5e7eb'}`,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (newTaskData.dueDate) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
            }}
            onMouseLeave={(e) => {
              if (newTaskData.dueDate) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }
            }}
          >
            <input
              type="checkbox"
              checked={newTaskData.addToCalendar}
              onChange={(e) => setNewTaskData((prev) => ({ ...prev, addToCalendar: e.target.checked }))}
              disabled={!newTaskData.dueDate}
              style={{ 
                cursor: newTaskData.dueDate ? 'pointer' : 'not-allowed',
                width: 18,
                height: 18,
              }}
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={newTaskData.dueDate ? '#64748b' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span style={{ flex: 1 }}>
              Add to Calendar
              {!newTaskData.dueDate && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>(requires due date)</span>}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 10, 
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
        }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onSave}
            disabled={!newTaskData.title.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 999,
              border: 'none',
              background: newTaskData.title.trim() ? '#0f172a' : '#e5e7eb',
              color: newTaskData.title.trim() ? '#ffffff' : '#94a3b8',
              fontSize: 14,
              fontWeight: 600,
              cursor: newTaskData.title.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (newTaskData.title.trim()) {
                e.currentTarget.style.background = '#1e293b';
              }
            }}
            onMouseLeave={(e) => {
              if (newTaskData.title.trim()) {
                e.currentTarget.style.background = '#0f172a';
              }
            }}
          >
            Create Task
          </button>
        </div>
      </div>
      <MobileFabButtons />
    </div>
  );
}

// Mobile FAB and menu button
const MobileFabButtons = () => (
  <button
    type="button"
    className="todo-fab"
    onClick={() => {}}
    aria-label="Add task"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  </button>
);

export default TodoPage;
