import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  canvasData: {
    drawings: any[];
    shapes: any[];
    textElements: any[];
    walls?: any[];
    doors?: any[];
    powerPoints?: any[];
    viewBox: { x: number; y: number; width: number; height: number };
  };
  a4Dimensions?: {
    a4X: number;
    a4Y: number;
    a4WidthPx: number;
    a4HeightPx: number;
  };
}

export interface WorkflowNote {
  id: string;
  content: string;
  color: 'yellow' | 'pink' | 'green' | 'blue' | 'purple';
  width: number;
  height: number;
}

interface WorkflowPosition {
  x: number;
  y: number;
}

export interface Connection {
  fromCardId: string;
  fromSide: 'left' | 'right';
  toCardId: string;
  toSide: 'left' | 'right';
}

interface WorkflowCanvasProps {
  projects: Project[];
  onProjectSelect: (projectId: string) => void;
  onHighlight: (projectId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  activeProjectId: string;
  positions: Record<string, WorkflowPosition>;
  onPositionsChange: (positions: Record<string, WorkflowPosition>) => void;
  connections?: Connection[];
  onConnectionsChange?: (connections: Connection[]) => void;
  notes?: WorkflowNote[];
  onNotesChange?: (notes: WorkflowNote[]) => void;
  eventId?: string;
}

const CARD_WIDTH = 320;
const CARD_HEIGHT = 280;

const NOTE_COLORS = {
  yellow: { bg: '#fef3c7', border: '#f59e0b' },
  pink: { bg: '#fce7f3', border: '#ec4899' },
  green: { bg: '#dcfce7', border: '#22c55e' },
  blue: { bg: '#dbeafe', border: '#3b82f6' },
  purple: { bg: '#ede9fe', border: '#8b5cf6' },
} as const;

const NOTE_DEFAULT_WIDTH = 240;
const NOTE_DEFAULT_HEIGHT = 160;
const NOTE_MIN_WIDTH = 160;
const NOTE_MIN_HEIGHT = 100;
const NOTE_MAX_WIDTH = 500;
const NOTE_MAX_HEIGHT = 400;

const MiniPreview: React.FC<{ project: Project }> = ({ project }) => {
  const { canvasData, a4Dimensions } = project;

  const a4 = a4Dimensions;
  const hasA4 = a4?.a4WidthPx && a4?.a4HeightPx && a4?.a4WidthPx > 0;

  if (hasA4) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#ffffff', borderRadius: '4px', overflow: 'hidden' }}>
      <svg viewBox={`${a4!.a4X} ${a4!.a4Y} ${a4!.a4WidthPx} ${a4!.a4HeightPx}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <pattern id="previewGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={a4!.a4X} y={a4!.a4Y} width={a4!.a4WidthPx} height={a4!.a4HeightPx} fill="white" />
        <rect x={a4!.a4X} y={a4!.a4Y} width={a4!.a4WidthPx} height={a4!.a4HeightPx} fill="url(#previewGrid)" />

          {(canvasData.walls || []).map((w: any) => {
            if (w.curve) {
              let pathD: string;
              if (w.curve.type === 'bezier') {
                pathD = `M ${w.startX} ${w.startY} Q ${w.curve.point.x} ${w.curve.point.y} ${w.endX} ${w.endY}`;
              } else {
                const dx = (w.endX || 0) - (w.startX || 0);
                const dy = (w.endY || 0) - (w.startY || 0);
                const radius = Math.sqrt(dx * dx + dy * dy) / 2;
                const sweepFlag = w.curve.direction === 1 ? 0 : 1;
                pathD = `M ${w.startX} ${w.startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${w.endX} ${w.endY}`;
              }
              return <path key={w.id || Math.random()} d={pathD} fill="none" stroke="#475569" strokeWidth={w.thickness || 6} strokeLinecap="round" />;
            }
            return <line key={w.id || Math.random()} x1={w.startX || 0} y1={w.startY || 0} x2={w.endX || 0} y2={w.endY || 0} stroke="#475569" strokeWidth={w.thickness || 6} />;
          })}

          {(canvasData.doors || []).map((d: any) => {
            const doorWidth = d.width || 30;
            const doorHeight = d.height || 6;
            return (
              <g key={d.id || Math.random()}>
                <path
                  d={`M ${(d.x || 0) - doorWidth/2} ${(d.y || 0) - doorHeight} Q ${(d.x || 0) - doorWidth/2} ${(d.y || 0)} ${(d.x || 0) + doorWidth/2} ${(d.y || 0) - doorHeight} Z`}
                  fill="#a8a29e"
                  stroke="#78716c"
                  strokeWidth="1"
                />
                <circle cx={d.x || 0} cy={(d.y || 0) - doorHeight} r="3" fill="#1c1917" />
              </g>
            );
          })}

          {(canvasData.shapes || []).map((s: any) => {
            const x = s.x ?? 0;
            const y = s.y ?? 0;
            const w = s.width ?? 50;
            const h = s.height ?? 50;

            if (s.tableData?.type === 'table-round' || s.type === 'circle') {
              return <circle key={s.id} cx={x + w/2} cy={y + h/2} r={w/2} fill={s.fill || '#fef3c7'} stroke={s.stroke || '#f59e0b'} strokeWidth="2" />;
            }

            if (s.tableData?.type === 'table-oval' || s.type === 'ellipse') {
              return <ellipse key={s.id} cx={x + w/2} cy={y + h/2} rx={w/2} ry={h/2} fill={s.fill || '#fef3c7'} stroke={s.stroke || '#f59e0b'} strokeWidth="2" />;
            }

            if (s.type === 'image' && s.imageUrl) {
              return <image key={s.id} href={s.imageUrl} x={x} y={y} width={w} height={h} />;
            }

            const radius = s.tableData?.type === 'table-rectangle' ? Math.min(w, h) * 0.15 : 4;
            return (
              <rect
                key={s.id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={s.spaceMetersWidth ? 'rgba(248, 250, 252, 0.95)' : (s.fill || '#f8fafc')}
                stroke={s.spaceMetersWidth ? '#334155' : (s.stroke || '#e2e8f0')}
                strokeWidth={s.spaceMetersWidth ? 3 : 1.5}
                rx={radius}
              />
            );
          })}

          {(canvasData.textElements || []).map((t: any) => (
            <text key={t.id} x={t.x || 0} y={t.y || 0} fill={t.fill || '#374151'} fontSize={t.fontSize || 12} fontFamily="sans-serif">
              {t.text}
            </text>
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#ffffff', borderRadius: '4px', overflow: 'hidden' }}>
      <svg viewBox="-200 -150 400 300" style={{ width: '100%', height: '100%' }}>
        <rect x="-200" y="-150" width="400" height="300" fill="white" />
        <rect x="-200" y="-150" width="400" height="300" fill="url(#previewGrid)" />

        {(canvasData.walls || []).map((w: any) => (
          <line key={w.id || Math.random()} x1={w.startX || 0} y1={w.startY || 0} x2={w.endX || 0} y2={w.endY || 0} stroke="#475569" strokeWidth={w.thickness || 6} />
        ))}

        {(canvasData.shapes || []).map((s: any) => {
          const x = s.x ?? 0;
          const y = s.y ?? 0;
          const w = s.width ?? 50;
          const h = s.height ?? 50;

          if (s.tableData?.type === 'table-round') {
            return <circle key={s.id} cx={x + w/2} cy={y + h/2} r={w/2} fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />;
          }

          if (s.tableData?.type === 'table-oval') {
            return <ellipse key={s.id} cx={x + w/2} cy={y + h/2} rx={w/2} ry={h/2} fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />;
          }

          return <rect key={s.id} x={x} y={y} width={w} height={h} fill={s.fill || '#f8fafc'} stroke={s.stroke || '#e2e8f0'} strokeWidth="2" rx="4" />;
        })}
      </svg>
    </div>
  );
};

const ConnectorDot: React.FC<{
  side: 'left' | 'right';
  onClick: (side: 'left' | 'right') => void;
  isSource: boolean;
  isConnectMode: boolean;
}> = ({ side, onClick, isSource, isConnectMode }) => (
  <div
    onMouseDown={(e) => {
      e.stopPropagation();
      e.preventDefault();
    }}
    onMouseUp={(e) => {
      e.stopPropagation();
    }}
    onClick={(e) => {
      e.stopPropagation();
      onClick(side);
    }}
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
      animation: isSource ? 'connectorPulse 1.5s ease-in-out infinite' : (isConnectMode ? 'connectorHint 2s ease-in-out infinite' : 'none'),
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
        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)';
      }
    }}
  />
);

const DraggableCard: React.FC<{
  project: Project;
  index: number;
  isActive: boolean;
  position: WorkflowPosition;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: () => void;
  onConnectorClick: (cardId: string, side: 'left' | 'right') => void;
  connectingFrom: { cardId: string; side: 'left' | 'right' } | null;
  pan: { x: number; y: number };
  zoom: number;
}> = ({ project, index, isActive, position, onPositionChange, onSelect, onConnectorClick, connectingFrom, pan, zoom }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0, hasMoved: false });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const clickInWrapperX = (e.clientX - pan.x) / zoom;
    const clickInWrapperY = (e.clientY - pan.y) / zoom;
    dragRef.current = {
      offsetX: clickInWrapperX - position.x,
      offsetY: clickInWrapperY - position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      dragRef.current.hasMoved = true;
      const wrapperX = (e.clientX - pan.x) / zoom;
      const wrapperY = (e.clientY - pan.y) / zoom;
      onPositionChange(
        project.id,
        wrapperX - dragRef.current.offsetX,
        wrapperY - dragRef.current.offsetY,
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pan.x, pan.y, zoom, project.id, onPositionChange]);

  const isConnectMode = connectingFrom !== null;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        background: '#ffffff',
        borderRadius: '16px',
        border: isActive ? '2.5px solid #000000' : '1px solid #e5e5e5',
        boxShadow: isDragging
          ? '0 20px 50px rgba(0, 0, 0, 0.3)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.95 : 1,
        overflow: 'visible',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging ? 9999 : (isActive ? 100 : 1),
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
      }}
    >
      <div
        onClick={() => { if (!dragRef.current.hasMoved) onSelect(); }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      >
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: isActive ? '#000000' : '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: isActive ? '#ffffff' : '#475569',
          }}>
            {index + 1}
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
          }}>
            {project.name}
          </span>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isActive ? '#22c55e' : '#e2e8f0',
          boxShadow: isActive ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
        }} />
      </div>
      <div style={{
        flex: 1,
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#fafafa',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{ width: '100%', height: '100%' }}>
          <MiniPreview project={project} />
        </div>
      </div>
      </div>
      <ConnectorDot
        side="left"
        onClick={(side) => onConnectorClick(project.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === project.id && connectingFrom.side === 'left'}
        isConnectMode={isConnectMode}
      />
      <ConnectorDot
        side="right"
        onClick={(side) => onConnectorClick(project.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === project.id && connectingFrom.side === 'right'}
        isConnectMode={isConnectMode}
      />
    </div>
  );
};

const DraggableNoteCard: React.FC<{
  note: WorkflowNote;
  position: WorkflowPosition;
  onPositionChange: (id: string, x: number, y: number) => void;
  onNoteChange: (note: WorkflowNote) => void;
  onDelete: (id: string) => void;
  onConnectorClick: (cardId: string, side: 'left' | 'right') => void;
  connectingFrom: { cardId: string; side: 'left' | 'right' } | null;
  pan: { x: number; y: number };
  zoom: number;
}> = ({ note, position, onPositionChange, onNoteChange, onDelete, onConnectorClick, connectingFrom, pan, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0, hasMoved: false });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const colors = NOTE_COLORS[note.color];
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
      hasMoved: false,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      dragRef.current.hasMoved = true;
      const wrapperX = (e.clientX - pan.x) / zoom;
      const wrapperY = (e.clientY - pan.y) / zoom;
      onPositionChange(
        note.id,
        wrapperX - dragRef.current.offsetX,
        wrapperY - dragRef.current.offsetY,
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pan.x, pan.y, zoom, note.id, onPositionChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: note.width,
      startH: note.height,
    };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeRef.current.startX) / zoom;
      const dy = (e.clientY - resizeRef.current.startY) / zoom;
      const newW = Math.min(NOTE_MAX_WIDTH, Math.max(NOTE_MIN_WIDTH, resizeRef.current.startW + dx));
      const newH = Math.min(NOTE_MAX_HEIGHT, Math.max(NOTE_MIN_HEIGHT, resizeRef.current.startH + dy));
      onNoteChange({ ...note, width: newW, height: newH });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, zoom, note, onNoteChange]);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: `${note.width}px`,
        height: `${note.height}px`,
        background: colors.bg,
        borderRadius: '14px',
        border: `1.5px solid ${colors.border}`,
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
      {/* Header - draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: `1px solid ${colors.border}33`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Color picker dots */}
          {(Object.keys(NOTE_COLORS) as Array<keyof typeof NOTE_COLORS>).map((c) => (
            <div
              key={c}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onNoteChange({ ...note, color: c });
              }}
              style={{
                width: c === note.color ? '14px' : '12px',
                height: c === note.color ? '14px' : '12px',
                borderRadius: '50%',
                background: NOTE_COLORS[c].border,
                border: c === note.color ? '2px solid #1e293b' : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
            />
          ))}
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            marginLeft: '4px',
          }}>Note</span>
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '5px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            padding: 0,
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

      {/* Textarea body */}
      <div style={{ flex: 1, padding: '6px 10px 8px', overflow: 'hidden', position: 'relative' }}>
        <textarea
          value={note.content}
          onChange={(e) => onNoteChange({ ...note, content: e.target.value })}
          placeholder="Type a note..."
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            resize: 'none',
            outline: 'none',
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#334155',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '14px',
          height: '14px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        onClick={(side) => onConnectorClick(note.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === note.id && connectingFrom.side === 'left'}
        isConnectMode={isConnectMode}
      />
      <ConnectorDot
        side="right"
        onClick={(side) => onConnectorClick(note.id, side)}
        isSource={!!connectingFrom && connectingFrom.cardId === note.id && connectingFrom.side === 'right'}
        isConnectMode={isConnectMode}
      />
    </div>
  );
};

// SVG layer offset (matches the top/left of the connections SVG)
const SVG_OFFSET = 1000;

// Get anchor point for a connector dot (in SVG coordinate space)
const getAnchorPoint = (pos: WorkflowPosition, side: 'left' | 'right', width: number, height: number) => ({
  x: (side === 'left' ? pos.x : pos.x + width) + SVG_OFFSET,
  y: pos.y + height / 2 + SVG_OFFSET,
});

// Build cubic bezier path between two points
const buildConnectionPath = (fromX: number, fromY: number, fromSide: 'left' | 'right', toX: number, toY: number, toSide: 'left' | 'right') => {
  const controlOffset = Math.abs(toX - fromX) * 0.4 + 80;
  const cp1x = fromX + (fromSide === 'right' ? controlOffset : -controlOffset);
  const cp2x = toX + (toSide === 'left' ? -controlOffset : controlOffset);
  return `M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`;
};

type ContextMenuState =
  | { x: number; y: number; type: 'connection'; index: number }
  | { x: number; y: number; type: 'canvas'; wrapperX: number; wrapperY: number }
  | null;

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  projects,
  onProjectSelect,
  onHighlight,
  activeProjectId,
  positions,
  onPositionsChange,
  connections: externalConnections = [],
  onConnectionsChange,
  notes: externalNotes = [],
  onNotesChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: -200, y: -200 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [connections, setConnections] = useState<Connection[]>(externalConnections);
  const [connectingFrom, setConnectingFrom] = useState<{ cardId: string; side: 'left' | 'right' } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [notes, setNotes] = useState<WorkflowNote[]>(externalNotes);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setConnections(externalConnections);
  }, [externalConnections]);

  useEffect(() => {
    setNotes(externalNotes);
  }, [externalNotes]);

  // Helper to get card dimensions by id (note vs project card)
  const getCardDimensions = useCallback((cardId: string): { width: number; height: number } => {
    if (cardId.startsWith('note-')) {
      const note = notes.find(n => n.id === cardId);
      return { width: note?.width ?? NOTE_DEFAULT_WIDTH, height: note?.height ?? NOTE_DEFAULT_HEIGHT };
    }
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }, [notes]);

  const handleConnectorClick = (cardId: string, side: 'left' | 'right') => {
    if (connectingFrom === null) {
      setConnectingFrom({ cardId, side });
    } else {
      if (connectingFrom.cardId === cardId && connectingFrom.side === side) {
        setConnectingFrom(null);
        return;
      }
      if (connectingFrom.cardId === cardId) {
        setConnectingFrom(null);
        return;
      }
      const isDuplicate = connections.some(c =>
        c.fromCardId === connectingFrom.cardId && c.fromSide === connectingFrom.side &&
        c.toCardId === cardId && c.toSide === side
      );
      if (isDuplicate) {
        setConnectingFrom(null);
        return;
      }
      const newConnection: Connection = {
        fromCardId: connectingFrom.cardId,
        fromSide: connectingFrom.side,
        toCardId: cardId,
        toSide: side,
      };
      const newConnections = [...connections, newConnection];
      setConnections(newConnections);
      setConnectingFrom(null);
      if (onConnectionsChange) {
        onConnectionsChange(newConnections);
      }
    }
  };

  const handleDeleteConnection = useCallback((index: number) => {
    const newConnections = connections.filter((_, i) => i !== index);
    setConnections(newConnections);
    setContextMenu(null);
    if (onConnectionsChange) {
      onConnectionsChange(newConnections);
    }
  }, [connections, onConnectionsChange]);

  const handleNoteChange = useCallback((updatedNote: WorkflowNote) => {
    const newNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
    setNotes(newNotes);
    onNotesChange?.(newNotes);
  }, [notes, onNotesChange]);

  const handleDeleteNote = useCallback((noteId: string) => {
    const newNotes = notes.filter(n => n.id !== noteId);
    setNotes(newNotes);
    onNotesChange?.(newNotes);
    // Remove connections attached to this note
    const newConnections = connections.filter(c => c.fromCardId !== noteId && c.toCardId !== noteId);
    if (newConnections.length !== connections.length) {
      setConnections(newConnections);
      onConnectionsChange?.(newConnections);
    }
  }, [notes, connections, onNotesChange, onConnectionsChange]);

  const handleCreateNote = useCallback((wrapperX: number, wrapperY: number) => {
    const newNote: WorkflowNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: '',
      color: 'yellow',
      width: NOTE_DEFAULT_WIDTH,
      height: NOTE_DEFAULT_HEIGHT,
    };
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    onNotesChange?.(newNotes);
    // Set its position
    onPositionsChange({
      ...positions,
      [newNote.id]: { x: wrapperX, y: wrapperY },
    });
    setContextMenu(null);
  }, [notes, positions, onNotesChange, onPositionsChange]);

  useEffect(() => {
    const newPositions: Record<string, WorkflowPosition> = { ...positions };
    let hasChanges = false;

    projects.forEach((project, index) => {
      if (!newPositions[project.id]) {
        newPositions[project.id] = {
          x: 40 + (index % 3) * 340,
          y: 40 + Math.floor(index / 3) * 300,
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onPositionsChange(newPositions);
    }
  }, [projects, onPositionsChange]);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).closest('svg[data-workflow-grid]') && !(e.target as HTMLElement).closest('[data-grid-bg]')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePanMove = (e: MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (connectingFrom) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom + SVG_OFFSET,
        y: (e.clientY - rect.top - pan.y) / zoom + SVG_OFFSET,
      });
    }
  }, [connectingFrom, pan, zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (connectingFrom && e.target === e.currentTarget) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === e.currentTarget || target.closest('svg[data-workflow-grid]') || target.closest('[data-grid-bg]')) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wrapperX = (e.clientX - rect.left - pan.x) / zoom;
      const wrapperY = (e.clientY - rect.top - pan.y) / zoom;
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas', wrapperX, wrapperY });
    }
  }, [pan, zoom]);

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.3));
  const handleReset = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // Trackpad: pinch-to-zoom + two-finger pan (native non-passive listener to allow preventDefault)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const zoomIntensity = 0.005;
        const delta = -e.deltaY * zoomIntensity;
        const curZoom = zoomRef.current;
        const curPan = panRef.current;
        const newZoom = Math.min(2, Math.max(0.3, curZoom * (1 + delta)));

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleDiff = newZoom / curZoom;
        const newPanX = mouseX - scaleDiff * (mouseX - curPan.x);
        const newPanY = mouseY - scaleDiff * (mouseY - curPan.y);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        setPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleHighlight = useCallback((projectId: string) => {
    onHighlight(projectId);
  }, [onHighlight]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#1a1a1a',
        overflow: 'hidden',
        zIndex: 1000,
        cursor: isPanning ? 'grabbing' : (connectingFrom ? 'crosshair' : 'grab'),
      }}
      onMouseDown={handlePanStart}
      onMouseMove={handleContainerMouseMove}
      onClick={handleBackgroundClick}
      onContextMenu={handleContextMenu}
    >
      {/* CSS animations */}
      <style>{`
        @keyframes connectionFlow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes connectorPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25), 0 2px 4px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.15), 0 2px 4px rgba(0,0,0,0.1); }
        }
        @keyframes connectorHint {
          0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
          50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12), 0 1px 4px rgba(0,0,0,0.12); }
        }
        @keyframes previewDash {
          0% { stroke-dashoffset: 16; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
      <div
        data-grid-bg
        style={{
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: '5000px',
          height: '5000px',
          background: '#e5e5e5',
          zIndex: 0,
        }}
      >
        <svg data-workflow-grid width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <pattern id="workflow-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#d0d0d0" strokeWidth={0.5} />
            </pattern>
            <pattern id="workflow-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#workflow-grid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#b0b0b0" strokeWidth={1} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#workflow-grid-major)" />
        </svg>
      </div>

        {projects.map((project, index) => {
        return (
          <DraggableCard
            key={project.id}
            project={project}
            index={index}
            isActive={activeProjectId === project.id}
            position={positions[project.id] || { x: 60 + (index % 4) * 340, y: 120 + Math.floor(index / 4) * 300 }}
            onPositionChange={(id, x, y) => {
              onPositionsChange({
                ...positions,
                [id]: { x, y },
              });
            }}
            onSelect={() => onProjectSelect(project.id)}
            onConnectorClick={handleConnectorClick}
            connectingFrom={connectingFrom}
            pan={pan}
            zoom={zoom}
          />
        );
      })}

      {/* Draggable Note Cards */}
      {notes.map((note) => (
        <DraggableNoteCard
          key={note.id}
          note={note}
          position={positions[note.id] || { x: 100, y: 100 }}
          onPositionChange={(id, x, y) => {
            onPositionsChange({
              ...positions,
              [id]: { x, y },
            });
          }}
          onNoteChange={handleNoteChange}
          onDelete={handleDeleteNote}
          onConnectorClick={handleConnectorClick}
          connectingFrom={connectingFrom}
          pan={pan}
          zoom={zoom}
        />
      ))}

      {/* Connections SVG layer */}
      <svg
        style={{
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: '5000px',
          height: '5000px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="connectionGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 10 4 L 0 8 Z" fill="#8b5cf6" />
          </marker>
          <marker
            id="arrowheadHover"
            markerWidth="12"
            markerHeight="10"
            refX="11"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 12 5 L 0 10 Z" fill="#a78bfa" />
          </marker>
        </defs>

        {/* Rendered connections */}
        {connections.map((conn, idx) => {
          const fromPos = positions[conn.fromCardId];
          const toPos = positions[conn.toCardId];
          if (!fromPos || !toPos) return null;

          const fromDims = getCardDimensions(conn.fromCardId);
          const toDims = getCardDimensions(conn.toCardId);
          const from = getAnchorPoint(fromPos, conn.fromSide, fromDims.width, fromDims.height);
          const to = getAnchorPoint(toPos, conn.toSide, toDims.width, toDims.height);
          const pathD = buildConnectionPath(from.x, from.y, conn.fromSide, to.x, to.y, conn.toSide);
          const isHovered = hoveredConnection === idx;

          return (
            <g key={`conn-${idx}`}>
              <path
                d={pathD}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                pointerEvents="stroke"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredConnection(idx)}
                onMouseLeave={() => setHoveredConnection(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, type: 'connection', index: idx });
                }}
              />
              {isHovered && (
                <path
                  d={pathD}
                  stroke="rgba(139, 92, 246, 0.2)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
              <path
                d={pathD}
                stroke={isHovered ? 'url(#connectionGradientHover)' : 'url(#connectionGradient)'}
                strokeWidth={isHovered ? 4 : 3}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="12 12"
                markerEnd={isHovered ? 'url(#arrowheadHover)' : 'url(#arrowhead)'}
                pointerEvents="none"
                style={{
                  animation: 'connectionFlow 1s linear infinite',
                  transition: 'stroke-width 0.15s ease',
                }}
              />
              <circle cx={from.x} cy={from.y} r={isHovered ? 5 : 4} fill="#6366f1" opacity={isHovered ? 1 : 0.7} pointerEvents="none" />
              <circle cx={to.x} cy={to.y} r={isHovered ? 5 : 4} fill="#8b5cf6" opacity={isHovered ? 1 : 0.7} pointerEvents="none" />
            </g>
          );
        })}

        {/* Connection preview line */}
        {connectingFrom && mousePos && (() => {
          const fromPos = positions[connectingFrom.cardId];
          if (!fromPos) return null;

          const fromDims = getCardDimensions(connectingFrom.cardId);
          const from = getAnchorPoint(fromPos, connectingFrom.side, fromDims.width, fromDims.height);
          const pathD = buildConnectionPath(from.x, from.y, connectingFrom.side, mousePos.x, mousePos.y, 'left');

          return (
            <g>
              <path
                d={pathD}
                stroke="#6366f1"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="8 8"
                opacity="0.6"
                pointerEvents="none"
                style={{ animation: 'previewDash 0.5s linear infinite' }}
              />
              <circle cx={from.x} cy={from.y} r="5" fill="#6366f1" opacity="0.8" pointerEvents="none" />
            </g>
          );
        })()}
      </svg>

      {projects.length === 0 && notes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666666',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No projects yet</p>
          <p style={{ fontSize: '13px', color: '#999999' }}>Create a new project or right-click to add a note</p>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        background: '#ffffff',
        padding: '8px 12px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1002,
      }}>
        <button onClick={handleZoomOut} style={zoomBtnStyle}>−</button>
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500, minWidth: '50px', justifyContent: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} style={zoomBtnStyle}>+</button>
        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />
        <button onClick={handleReset} style={{ ...zoomBtnStyle, padding: '0 12px' }}>Reset</button>
      </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            background: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            minWidth: '160px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'connection' && (
            <button
              onClick={() => handleDeleteConnection(contextMenu.index)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#ef4444',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete connection
            </button>
          )}
          {contextMenu.type === 'canvas' && (
            <button
              onClick={() => handleCreateNote(contextMenu.wrapperX, contextMenu.wrapperY)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              New Note
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  fontSize: '18px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#475569',
};

export default WorkflowCanvas;
