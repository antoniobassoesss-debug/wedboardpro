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
          {/* Show if task is assigned to current user */}
          {task.assignee_id && currentUserId && task.assignee_id === currentUserId && task.created_by !== currentUserId && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 10,
                background: '#dbeafe',
                border: '1px solid #3b82f6',
                fontSize: 11,
                color: '#1e40af',
                fontWeight: 500,
              }}
            >
              <span>📌</span>
              <span>
                Assigned to you
                {task.creator && ` by ${task.creator.full_name || task.creator.email || 'someone'}`}
              </span>
            </div>
          )}

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
          <label className="date-control">
            <span>{formatDue(task.dueDate)}</span>
            <input
              className="task-date-input"
              type="date"
              value={task.dueDate ?? ''}
              onChange={(e) => onUpdateDueDate(task.id, e.target.value || null)}
            />
          </label>
          <span
            className={`priority-pill priority-${task.priority}`}
            onClick={() => {
              const priorities: Task['priority'][] = ['low', 'medium', 'high'];
              const currentIndex = priorities.indexOf(task.priority);
              const nextIndex = (currentIndex + 1) % priorities.length;
              onUpdatePriority(task.id, priorities[nextIndex]);
            }}
            style={{ cursor: 'pointer' }}
            title="Click to cycle priority"
          >
            {task.priority}
          </span>
          <button className="small-btn" onClick={() => onToggleFlag(task.id)}>
            {task.isFlagged ? 'Flagged' : 'Flag'}
          </button>
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
