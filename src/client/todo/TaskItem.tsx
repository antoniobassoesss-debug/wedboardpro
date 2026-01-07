import React, { useState, useEffect } from 'react';
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

const formatDue = (value?: string | null) => {
  if (!value) return 'No due date';
  const target = new Date(value);
  const today = new Date();
  const diff = Math.floor((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return target.toLocaleDateString(); // Show date instead of "Overdue"
  return target.toLocaleDateString();
};

const TaskItem: React.FC<TaskItemProps> = ({
  task,
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
  const [expanded, setExpanded] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  // Close priority menu when clicking outside
  useEffect(() => {
    if (!showPriorityMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.priority-pill') && !target.closest('[data-priority-menu]')) {
        setShowPriorityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPriorityMenu]);

  useEffect(() => {
    if (!onUpdateAssignee) return;
    const fetchMembers = async () => {
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
    fetchMembers();
  }, [onUpdateAssignee]);

  const getAssigneeDisplay = () => {
    if (!task.assignee) return 'Unassigned';
    return task.assignee.full_name || task.assignee.email || 'Unknown';
  };

  const getAssigneeInitials = () => {
    if (!task.assignee) return '?';
    const name = task.assignee.full_name || task.assignee.email || 'U';
    return name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="task-item">
      <div className="task-row">
        <input type="checkbox" checked={task.isCompleted} onChange={() => onToggle(task.id)} />
        <input
          className={`task-title ${task.isCompleted ? 'completed' : ''}`}
          value={task.title}
          onChange={(e) => onUpdateTitle(task.id, e.target.value)}
        />
        <div className="meta-row">
          {/* Assignee display (no dropdown) */}
          {onUpdateAssignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {task.assignee ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 12,
                    background: task.assignee_id === currentUserId ? '#dbeafe' : '#f0f0f0',
                    border: task.assignee_id === currentUserId ? '1px solid #3b82f6' : 'none',
                    fontSize: 12,
                  }}
                  title={getAssigneeDisplay()}
                >
                  {task.assignee.avatar_url ? (
                    <img
                      src={task.assignee.avatar_url}
                      alt={getAssigneeDisplay()}
                      style={{ width: 16, height: 16, borderRadius: '50%' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: task.assignee_id === currentUserId ? '#3b82f6' : '#2563eb',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {getAssigneeInitials()}
                    </div>
                  )}
                  <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.assignee_id === currentUserId ? 'You' : getAssigneeDisplay()}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: '#999' }}>Unassigned</span>
              )}
            </div>
          )}
          <label className="date-control" style={{ cursor: 'pointer' }}>
            <span>{formatDue(task.dueDate)}</span>
            <input
              className="task-date-input"
              type="date"
              value={task.dueDate ?? ''}
              onChange={(e) => onUpdateDueDate(task.id, e.target.value || null)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
          </label>
          <div style={{ position: 'relative' }}>
            <span
              className={`priority-pill priority-${task.priority}`}
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              style={{ cursor: 'pointer' }}
              title="Click to change priority"
            >
              {task.priority}
            </span>
            {showPriorityMenu && (
              <div
                data-priority-menu
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: 100,
                }}
              >
                {(['low', 'medium', 'high'] as Task['priority'][]).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => {
                      onUpdatePriority(task.id, priority);
                      setShowPriorityMenu(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: task.priority === priority ? '#f1f5f9' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: task.priority === priority ? 600 : 400,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = task.priority === priority ? '#f1f5f9' : 'transparent')}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="small-btn" onClick={() => setExpanded((s) => !s)}>
            {expanded ? 'Hide' : 'Notes'}
          </button>
          {onDelete && (
            <button className="small-btn" onClick={() => onDelete(task.id)}>
              Delete
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="notes-area">
          <textarea value={task.notes} onChange={(e) => onUpdateNotes(task.id, e.target.value)} rows={4} />
        </div>
      )}
    </div>
  );
};

export default TaskItem;
