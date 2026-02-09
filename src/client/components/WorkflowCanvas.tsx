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

interface WorkflowPosition {
  x: number;
  y: number;
}

interface WorkflowCanvasProps {
  projects: Project[];
  onProjectSelect: (projectId: string) => void;
  onHighlight: (projectId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  activeProjectId: string;
  positions: Record<string, WorkflowPosition>;
  onPositionsChange: (positions: Record<string, WorkflowPosition>) => void;
}

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

          {(canvasData.walls || []).map((w: any) => (
            <line key={w.id || Math.random()} x1={w.startX || 0} y1={w.startY || 0} x2={w.endX || 0} y2={w.endY || 0} stroke="#475569" strokeWidth={w.thickness || 6} />
          ))}

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

const DraggableCard: React.FC<{
  project: Project;
  index: number;
  isActive: boolean;
  position: WorkflowPosition;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: () => void;
}> = ({ project, index, isActive, position, onPositionChange, onSelect }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setDragOffset({ x: clickX, y: clickY });
    dragStartPos.current = { x: position.x, y: position.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    onPositionChange(project.id, newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: '320px',
        height: '280px',
        background: '#ffffff',
        borderRadius: '16px',
        border: isActive ? '2.5px solid #000000' : '1px solid #e5e5e5',
        boxShadow: isDragging
          ? '0 20px 50px rgba(0, 0, 0, 0.3)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.95 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging ? 9999 : (isActive ? 100 : 1),
        pointerEvents: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
      }}
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
  );
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  projects,
  onProjectSelect,
  onHighlight,
  activeProjectId,
  positions,
  onPositionsChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: -200, y: -200 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

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

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.3));
  const handleReset = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  const handleHighlight = useCallback((projectId: string) => {
    onHighlight(projectId);
  }, [onHighlight]);

  const [notesExpanded, setNotesExpanded] = useState(true);
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('workflow-notes') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    localStorage.setItem('workflow-notes', notes);
  }, [notes]);

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
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      onMouseDown={handlePanStart}
    >
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
        style={{
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: '5000px',
          height: '5000px',
          background: '#e5e5e5',
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
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
          />
        );
      })}

      {projects.length === 0 && (
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
          <p style={{ fontSize: '13px', color: '#999999' }}>Create a new project to get started</p>
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: '88px',
        right: '24px',
        width: '280px',
        borderRadius: '14px',
        border: '1px solid rgba(15,23,42,0.08)',
        background: '#ffffff',
        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1002,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: '#fafafa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Notes</span>
          </div>
          <button
            onClick={() => setNotesExpanded(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '3px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{
          padding: '10px 12px',
        }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            style={{
              width: '100%',
              minHeight: '60px',
              border: '1px solid rgba(15,23,42,0.06)',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#334155',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              background: '#ffffff',
              height: 'auto',
            }}
            rows={Math.max(3, Math.min(10, Math.ceil(notes.length / 40) + 2))}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(15,23,42,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(15,23,42,0.06)';
            }}
          />
          {notes && (
            <button
              onClick={() => setNotes('')}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 500,
                color: '#64748b',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!notesExpanded && (
        <button
          onClick={() => setNotesExpanded(true)}
          style={{
            position: 'fixed',
            top: '88px',
            right: '24px',
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.1)',
            background: '#ffffff',
            color: '#475569',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(15,23,42,0.1)',
            zIndex: 1002,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Notes
        </button>
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
