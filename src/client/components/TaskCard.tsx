import React, { useState, useRef, useEffect } from 'react';

export interface WorkflowTask {
  id: string;
  realTaskId?: string; // DB task id after creation via API
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee_id: string | null;
  due_date: string | null;
  width: number;
  height: number;
}

export interface TeamMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface WorkflowPosition {
  x: number;
  y: number;
}

export const TASK_DEFAULT_WIDTH = 280;
export const TASK_DEFAULT_HEIGHT = 220;
const TASK_MIN_WIDTH = 220;
const TASK_MIN_HEIGHT = 160;
const TASK_MAX_WIDTH = 500;
const TASK_MAX_HEIGHT = 400;

const STATUS_CONFIG = {
  todo: { label: 'To Do', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  done: { label: 'Done', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
} as const;

const STATUS_ORDER: WorkflowTask['status'][] = ['todo', 'in_progress', 'done'];

// ConnectorDot defined locally to avoid circular dependency with WorkflowCanvas
const ConnectorDot: React.FC<{
  side: 'left' | 'right';
  onClick: (side: 'left' | 'right') => void;
  isSource: boolean;
  isConnectMode: boolean;
}> = ({ side, onClick, isSource, isConnectMode }) => (
  <div
    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
    onMouseUp={(e) => { e.stopPropagation(); }}
    onClick={(e) => { e.stopPropagation(); onClick(side); }}
    style={{
      position: 'absolute',
      [side]: '-8px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: isSource ? '#6366f1' : '#ffffff',
      border: `2px solid ${isSource ? '#6366f1' : '#cbd5e1'}`,
      cursor: 'crosshair',
      zIndex: 20,
      transition: 'all 0.15s ease',
      boxShadow: isSource
        ? '0 0 0 4px rgba(99, 102, 241, 0.25), 0 2px 4px rgba(0,0,0,0.1)'
        : '0 1px 4px rgba(0,0,0,0.12)',
      animation: isSource
        ? 'connectorPulse 1.5s ease-in-out infinite'
        : isConnectMode
          ? 'connectorHint 2s ease-in-out infinite'
          : 'none',
    }}
    onMouseEnter={(e) => {
      if (!isSource) {
        e.currentTarget.style.background = '#6366f1';
        e.currentTarget.style.borderColor = '#6366f1';
        e.currentTarget.style.transform = 'translateY(-50%) scale(1.25)';
        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.2), 0 2px 8px rgba(0,0,0,0.15)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isSource) {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.transform = 'translateY(-50%)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)';
      }
    }}
  />
);

export const DraggableTaskCard: React.FC<{
  task: WorkflowTask;
  position: WorkflowPosition;
  onPositionChange: (id: string, x: number, y: number) => void;
  onTaskChange: (task: WorkflowTask) => void;
  onDelete: (id: string) => void;
  onConnectorClick: (cardId: string, side: 'left' | 'right') => void;
  connectingFrom: { cardId: string; side: 'left' | 'right' } | null;
  pan: { x: number; y: number };
  zoom: number;
  teamMembers: TeamMember[];
}> = ({ task, position, onPositionChange, onTaskChange, onDelete, onConnectorClick, connectingFrom, pan, zoom, teamMembers }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const isConnectMode = connectingFrom !== null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const clickInWrapperX = (e.clientX - pan.x) / zoom;
    const clickInWrapperY = (e.clientY - pan.y) / zoom;
    dragRef.current = {
      offsetX: clickInWrapperX - position.x,
      offsetY: clickInWrapperY - position.y,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const wrapperX = (e.clientX - pan.x) / zoom;
      const wrapperY = (e.clientY - pan.y) / zoom;
      onPositionChange(task.id, wrapperX - dragRef.current.offsetX, wrapperY - dragRef.current.offsetY);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pan.x, pan.y, zoom, task.id, onPositionChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: task.width, startH: task.height };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeRef.current.startX) / zoom;
      const dy = (e.clientY - resizeRef.current.startY) / zoom;
      const newW = Math.min(TASK_MAX_WIDTH, Math.max(TASK_MIN_WIDTH, resizeRef.current.startW + dx));
      const newH = Math.min(TASK_MAX_HEIGHT, Math.max(TASK_MIN_HEIGHT, resizeRef.current.startH + dy));
      onTaskChange({ ...task, width: newW, height: newH });
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, zoom, task, onTaskChange]);

  const cycleStatus = () => {
    const idx = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]!;
    onTaskChange({ ...task, status: next });
  };

  const statusCfg = STATUS_CONFIG[task.status];

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: `${task.width}px`,
        height: `${task.height}px`,
        background: '#fffbeb',
        borderRadius: '14px',
        border: '1.5px solid #f59e0b',
        borderTop: '3px solid #f59e0b',
        boxShadow: isDragging
          ? '0 20px 50px rgba(0, 0, 0, 0.3)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
        overflow: 'visible',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging || isResizing ? 9999 : 50,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
      }}
    >
      {/* Header - drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid rgba(245,158,11,0.2)',
          flexShrink: 0,
          background: '#fffbeb',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Checkbox icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.5}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>Task</span>
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          style={{
            width: '20px', height: '20px', borderRadius: '5px', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
      >
        {/* Title */}
        <input
          type="text"
          value={task.title}
          onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
          placeholder="Task title..."
          style={{
            width: '100%',
            border: 'none',
            borderBottom: '1px solid #fde68a',
            background: 'transparent',
            outline: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            fontFamily: 'inherit',
            padding: '2px 0 4px',
          }}
        />

        {/* Status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 500, minWidth: '50px' }}>Status</span>
          <button
            onClick={cycleStatus}
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              border: `1px solid ${statusCfg.border}`,
              background: statusCfg.bg,
              color: statusCfg.color,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {statusCfg.label}
          </button>
        </div>

        {/* Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 500, minWidth: '50px' }}>Assignee</span>
          <select
            value={task.assignee_id ?? ''}
            onChange={(e) => onTaskChange({ ...task, assignee_id: e.target.value || null })}
            style={{
              flex: 1,
              border: '1px solid #fde68a',
              borderRadius: '6px',
              background: '#fffbeb',
              fontSize: '11px',
              color: '#334155',
              padding: '2px 4px',
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 500, minWidth: '50px' }}>Due</span>
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) => onTaskChange({ ...task, due_date: e.target.value || null })}
            style={{
              flex: 1,
              border: '1px solid #fde68a',
              borderRadius: '6px',
              background: '#fffbeb',
              fontSize: '11px',
              color: '#334155',
              padding: '2px 4px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '14px', height: '14px', cursor: 'nwse-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.35 }}>
          <line x1="7" y1="1" x2="1" y2="7" stroke="#475569" strokeWidth="1.2" />
          <line x1="7" y1="4" x2="4" y2="7" stroke="#475569" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Connector dots */}
      <ConnectorDot
        side="left"
        onClick={(side) => onConnectorClick(task.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === task.id && connectingFrom.side === 'left'}
        isConnectMode={isConnectMode}
      />
      <ConnectorDot
        side="right"
        onClick={(side) => onConnectorClick(task.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === task.id && connectingFrom.side === 'right'}
        isConnectMode={isConnectMode}
      />
    </div>
  );
};
