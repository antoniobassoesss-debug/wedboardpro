import React, { useState, useEffect, useRef } from 'react';
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
  if (diff < 0) return target.toLocaleDateString();
  return target.toLocaleDateString();
};

const formatDueShort = (value?: string | null) => {
  if (!value) return '';
  const target = new Date(value);
  const today = new Date();
  const diff = Math.floor((target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tmrw';
  if (diff < 0) return 'Overdue';
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'medium': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    case 'low': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  }
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
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

  useEffect(() => {
    if (!isMobile || !expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, expanded]);

  const getAssigneeInitials = () => {
    if (!task.assignee) return '?';
    const name = task.assignee.full_name || task.assignee.email || 'U';
    return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  };

  const priorityColors = getPriorityColor(task.priority);

  if (!isMobile) {
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
            {onUpdateAssignee && task.assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#2563eb', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600,
                }}>
                  {getAssigneeInitials()}
                </div>
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
            <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={itemRef}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: expanded ? '#fff' : '#fafafa',
          border: expanded ? '1px solid #e5e5e5' : '1px solid transparent',
          borderRadius: 16,
          padding: 16,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: task.isCompleted ? 'none' : '2px solid #d1d5db',
              background: task.isCompleted ? '#0c0c0c' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {task.isCompleted && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: task.isCompleted ? '#9ca3af' : '#0c0c0c',
              textDecoration: task.isCompleted ? 'line-through' : 'none',
              transition: 'all 0.2s ease',
            }}>
              {task.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {task.dueDate && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                background: priorityColors.bg,
                color: priorityColors.color,
              }}>
                {formatDueShort(task.dueDate)}
              </span>
            )}
            <span style={{
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'capitalize',
              background: priorityColors.bg,
              color: priorityColors.color,
            }}>
              {task.priority}
            </span>
            {expanded ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 16,
          padding: 16,
          marginBottom: 8,
          animation: 'tdExpandIn 0.2s ease',
        }}>
          <style>{`
            @keyframes tdExpandIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Title
              </label>
              <input
                value={task.title}
                onChange={(e) => onUpdateTitle(task.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #e5e5e5',
                  fontSize: 16,
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={task.dueDate ?? ''}
                  onChange={(e) => onUpdateDueDate(task.id, e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e5e5',
                    fontSize: 16,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => onUpdatePriority(task.id, e.target.value as Task['priority'])}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e5e5',
                    fontSize: 16,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notes
              </label>
              <textarea
                value={task.notes}
                onChange={(e) => onUpdateNotes(task.id, e.target.value)}
                placeholder="Add notes..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #e5e5e5',
                  fontSize: 16,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button
                onClick={() => onToggleFlag(task.id)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid #e5e5e5',
                  background: task.isFlagged ? '#fef3c7' : '#fafafa',
                  color: task.isFlagged ? '#d97706' : '#6b7280',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={task.isFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l5 12 5-12" />
                </svg>
                {task.isFlagged ? 'Flagged' : 'Flag'}
              </button>
              {onDelete && (
                <button
                  onClick={() => { if (confirm('Delete this task?')) onDelete(task.id); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
