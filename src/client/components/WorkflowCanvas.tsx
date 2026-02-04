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

interface DragState {
  isDragging: boolean;
  dragId: string | null;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  offsetX: number;
  offsetY: number;
  hasMoved: boolean;
}

const MiniPreview: React.FC<{ project: Project }> = ({ project }) => {
  const { canvasData } = project;
  const svgRef = useRef<SVGSVGElement>(null);

  const CANVAS_WIDTH = 1132;
  const CANVAS_HEIGHT = 800;
  const PADDING = 40;

  const wallsPath = useMemo(() => {
    const walls = canvasData.walls || [];
    return walls.map((wall: any) => {
      const thickness = wall.thickness || 4;
      const angle = Math.atan2(wall.endY - wall.startY, wall.endX - wall.startX);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const dx = (thickness / 2) * sin;
      const dy = (thickness / 2) * cos;

      return `M ${wall.startX - dx} ${wall.startY + dy} L ${wall.endX - dx} ${wall.endY + dy} L ${wall.endX + dx} ${wall.endY - dy} L ${wall.startX + dx} ${wall.startY - dy} Z`;
    }).join(' ');
  }, [canvasData.walls]);

  const contentBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const shapes = canvasData.shapes || [];
    const walls = canvasData.walls || [];

    shapes.forEach((shape: any) => {
      if (shape.x !== undefined && shape.y !== undefined) {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + (shape.width || 0));
        maxY = Math.max(maxY, shape.y + (shape.height || 0));
      }
    });

    walls.forEach((wall: any) => {
      minX = Math.min(minX, wall.startX, wall.endX);
      minY = Math.min(minY, wall.startY, wall.endY);
      maxX = Math.max(maxX, wall.startX, wall.endX);
      maxY = Math.max(maxY, wall.startY, wall.endY);
    });

    if (!isFinite(minX) || minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = CANVAS_WIDTH;
      maxY = CANVAS_HEIGHT;
    }

    return { minX, minY, maxX, maxY };
  }, [canvasData]);

  const viewBox = useMemo(() => {
    const { minX, minY, maxX, maxY } = contentBounds;
    const contentMinX = Math.min(0, minX);
    const contentMinY = Math.min(0, minY);
    const contentMaxX = Math.max(CANVAS_WIDTH, maxX);
    const contentMaxY = Math.max(CANVAS_HEIGHT, maxY);

    const viewX = contentMinX - PADDING;
    const viewY = contentMinY - PADDING;
    const viewW = (contentMaxX - contentMinX) + PADDING * 2;
    const viewH = (contentMaxY - contentMinY) + PADDING * 2;

    return `${viewX} ${viewY} ${viewW} ${viewH}`;
  }, [contentBounds]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#ffffff',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e5e5e5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={{
          width: '100%',
          height: '100%',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Canvas background */}
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#ffffff" stroke="#e0e0e0" strokeWidth={1} />

        {/* Grid pattern */}
        <defs>
          <pattern id={`grid-${project.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={`url(#grid-${project.id})`} />

        {/* Drawings (brush strokes) */}
        {canvasData.drawings?.map((drawing: any) => (
          <path
            key={drawing.id}
            d={drawing.d}
            stroke={drawing.stroke || '#94a3b8'}
            strokeWidth={drawing.strokeWidth || 2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        ))}

        {/* Shapes */}
        {canvasData.shapes?.map((shape: any) => {
          if (shape.type === 'rectangle') {
            if (shape.tableData?.type === 'table-oval') {
              return (
                <ellipse
                  key={shape.id}
                  cx={shape.x + shape.width / 2}
                  cy={shape.y + shape.height / 2}
                  rx={shape.width / 2}
                  ry={shape.height / 2}
                  fill={shape.fill || '#f8fafc'}
                  stroke={shape.stroke || '#cbd5e1'}
                  strokeWidth={shape.strokeWidth || 1}
                />
              );
            }
            return (
              <rect
                key={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.spaceMetersWidth ? 'rgba(248, 250, 252, 0.95)' : (shape.fill || '#f8fafc')}
                stroke={shape.spaceMetersWidth ? '#334155' : (shape.stroke || '#cbd5e1')}
                strokeWidth={shape.strokeWidth || (shape.spaceMetersWidth ? 3 : 1)}
                rx={shape.type === 'rectangle' ? 2 : 0}
              />
            );
          }
          if (shape.type === 'circle') {
            const radius = shape.width / 2;
            return (
              <circle
                key={shape.id}
                cx={shape.x + radius}
                cy={shape.y + radius}
                r={radius}
                fill={shape.fill || '#f8fafc'}
                stroke={shape.stroke || '#cbd5e1'}
                strokeWidth={shape.strokeWidth || 1}
              />
            );
          }
          if (shape.type === 'image' && shape.imageUrl) {
            return (
              <image
                key={shape.id}
                href={shape.imageUrl}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                preserveAspectRatio="xMidYMid meet"
              />
            );
          }
          return null;
        })}

        {/* Walls */}
        {wallsPath && (
          <path
            d={wallsPath}
            fill="#334155"
            stroke="#1e293b"
            strokeWidth={0.5}
          />
        )}
      </svg>
    </div>
  );
};

const DraggableCard: React.FC<{
  project: Project;
  index: number;
  isActive: boolean;
  position: WorkflowPosition;
  containerRef: React.RefObject<HTMLDivElement | null>;
  dragState: DragState;
  onDragChange: (changes: Partial<DragState>) => void;
  onSelect: () => void;
  onHighlight: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}> = ({
  project,
  index,
  isActive,
  position,
  containerRef,
  dragState,
  onDragChange,
  onSelect,
  onHighlight,
  onPositionChange,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;

    const clickOffsetX = e.clientX - cardRect.left;
    const clickOffsetY = e.clientY - cardRect.top;

    // Track where mouse went down for movement detection
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

    onDragChange({
      isDragging: true,
      dragId: project.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      offsetX: clickOffsetX,
      offsetY: clickOffsetY,
      hasMoved: false,
    });
  }, [project.id, position.x, position.y, onDragChange]);

  const isBeingDragged = dragState.isDragging && dragState.dragId === project.id;
  const translateX = isBeingDragged ? dragState.startX - dragState.offsetX : position.x;
  const translateY = isBeingDragged ? dragState.startY - dragState.offsetY : position.y;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        // Don't open if we just finished dragging (card was moved more than 5px)
        if (mouseDownPosRef.current) {
          const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
          const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
          mouseDownPosRef.current = null;

          if (dx > 5 || dy > 5) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }

        // Single click opens the project
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '280px',
        minHeight: '220px',
        background: '#ffffff',
        borderRadius: '12px',
        border: isActive ? '2px solid #000000' : '1px solid #e5e5e5',
        boxShadow: isBeingDragged
          ? '0 12px 40px rgba(0, 0, 0, 0.25)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        cursor: isBeingDragged ? 'grabbing' : 'grab',
        transition: isBeingDragged ? 'none' : 'box-shadow 0.2s ease',
        opacity: isBeingDragged ? 0.95 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isBeingDragged ? 9999 : (isActive ? 100 : 1),
        pointerEvents: isBeingDragged ? 'none' : 'auto',
        transform: `translate(${translateX}px, ${translateY}px)`,
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        if (!isBeingDragged) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.borderColor = '#d0d0d0';
        }
      }}
      onMouseLeave={(e) => {
        if (!isBeingDragged) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
          e.currentTarget.style.borderColor = '#e5e5e5';
        }
      }}
    >
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isActive ? '#000000' : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: isActive ? '#ffffff' : '#333333',
          }}>
            {index + 1}
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '180px',
          }}>
            {project.name}
          </span>
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isActive ? '#22c55e' : '#e5e5e5',
        }} />
      </div>
      <div style={{
        padding: '12px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <MiniPreview project={project} />
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
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    offsetX: 0,
    offsetY: 0,
    hasMoved: false,
  });

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const onPositionsChangeRef = useRef(onPositionsChange);
  onPositionsChangeRef.current = onPositionsChange;

  useEffect(() => {
    const newPositions: Record<string, WorkflowPosition> = { ...positions };
    let hasChanges = false;

    projects.forEach((project) => {
      if (!newPositions[project.id]) {
        const cols = 4;
        const spacingX = 320;
        const spacingY = 320;
        const offsetX = 60;
        const offsetY = 120;
        const index = projects.indexOf(project);
        const col = index % cols;
        const row = Math.floor(index / cols);
        newPositions[project.id] = {
          x: offsetX + col * spacingX,
          y: offsetY + row * spacingY,
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onPositionsChange(newPositions);
    }
  }, [projects, onPositionsChange]);

  useEffect(() => {
    if (!dragState.isDragging) return;

    let lastUpdateTime = 0;
    const updateThrottleMs = 16;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const newX = e.clientX - dragState.offsetX;
      const newY = e.clientY - dragState.offsetY;

      setDragState(prev => ({
        ...prev,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: prev.hasMoved || Math.abs(newX - dragState.initialX) > 3 || Math.abs(newY - dragState.initialY) > 3,
      }));

      if (dragState.dragId && now - lastUpdateTime >= updateThrottleMs) {
        lastUpdateTime = now;
        onPositionsChangeRef.current({
          ...positionsRef.current,
          [dragState.dragId]: { x: newX, y: newY },
        });
      }
    };

    const handleMouseUp = () => {
      setDragState({
        isDragging: false,
        dragId: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, dragState.dragId, dragState.offsetX, dragState.offsetY, dragState.initialX, dragState.initialY]);

  useEffect(() => {
    return () => {
      setDragState({
        isDragging: false,
        dragId: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false,
      });
    };
  }, []);

  const handleDragChange = useCallback((changes: Partial<DragState>) => {
    setDragState(prev => ({ ...prev, ...changes }));
  }, []);

  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    onPositionsChange({
      ...positions,
      [id]: { x, y },
    });
  }, [positions, onPositionsChange]);

  const handleHighlight = useCallback((projectId: string) => {
    // Just highlight the project without opening it
    // This is handled by the parent component
  }, []);

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
        background: '#e5e5e5',
        overflow: 'hidden',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#e5e5e5',
      }}>
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
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#workflow-grid-major)" />
        </svg>
      </div>
      {projects.map((project, index) => (
        <div
          key={project.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          <DraggableCard
            project={project}
            index={index}
            isActive={activeProjectId === project.id}
            position={positions[project.id] || { x: 0, y: 0 }}
            containerRef={containerRef}
            dragState={dragState}
            onDragChange={handleDragChange}
            onSelect={() => onProjectSelect(project.id)}
            onHighlight={() => onHighlight(project.id)}
            onPositionChange={handlePositionChange}
          />
        </div>
      ))}
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
    </div>
  );
};

export default WorkflowCanvas;
