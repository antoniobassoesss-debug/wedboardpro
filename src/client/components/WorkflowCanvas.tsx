import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { DraggableTaskCard, TASK_DEFAULT_WIDTH, TASK_DEFAULT_HEIGHT } from './TaskCard';
import type { WorkflowTask, TeamMember } from './TaskCard';
import { createTask, updateTask, deleteTask } from '../api/tasksApi';
import { getValidAccessToken } from '../utils/sessionManager';

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
    satelliteBackground?: {
      center: { lat: number; lng: number };
      address: string;
      realWorldWidth: number;
      realWorldHeight: number;
      orientation: 'landscape' | 'portrait';
      rotation: number;
      pixelsPerMeter: number;
      aiEnhanced: boolean;
      imageBase64: string;
      addedAt: string;
    } | null;
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

export interface WorkflowPosition {
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
  /** Atomic creation handler — receives the new note AND its initial position so
   *  the parent can upsert both in one call instead of two racing state updates. */
  onNoteCreate?: (note: WorkflowNote, position: { x: number; y: number }) => void;
  tasks?: WorkflowTask[];
  onTasksChange?: (tasks: WorkflowTask[]) => void;
  eventId?: string;
}

const CARD_WIDTH = 320;
const CARD_HEIGHT = 280;

const CARD_SNAP_GAP = 20;
const CARD_SNAP_THRESHOLD = 24;
const CARD_MIN_GAP = 16;
const GRID_COLUMNS = 4;
const DRAG_SNAP_TO_GRID = 8;

interface CardRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectsOverlap(a: CardRect, b: CardRect, gap = 0): boolean {
  return (
    a.x - gap < b.x + b.width &&
    a.x + a.width + gap > b.x &&
    a.y - gap < b.y + b.height &&
    a.y + a.height + gap > b.y
  );
}

function findNonOverlappingPosition(card: CardRect, others: CardRect[]): { x: number; y: number } {
  const angles = 24;
  for (let radius = 0; radius < 2000; radius += 20) {
    for (let ai = 0; ai < angles; ai++) {
      const rad = (ai / angles) * Math.PI * 2;
      const testX = Math.round((card.x + Math.cos(rad) * radius) / DRAG_SNAP_TO_GRID) * DRAG_SNAP_TO_GRID;
      const testY = Math.round((card.y + Math.sin(rad) * radius) / DRAG_SNAP_TO_GRID) * DRAG_SNAP_TO_GRID;
      const testRect: CardRect = { ...card, x: testX, y: testY };
      if (!others.some(o => o.id !== card.id && rectsOverlap(testRect, o, CARD_MIN_GAP))) {
        return { x: testX, y: testY };
      }
    }
  }
  return { x: card.x, y: card.y };
}

interface SnapLine { x1: number; y1: number; x2: number; y2: number }

function applyMagneticSnap(card: CardRect, others: CardRect[]): { x: number; y: number; snapLines: SnapLine[] } {
  let x = card.x;
  let y = card.y;
  const snapLines: SnapLine[] = [];

  for (const other of others) {
    if (other.id === card.id) continue;
    const gap = CARD_SNAP_GAP;
    const th = CARD_SNAP_THRESHOLD;

    if (Math.abs((x + card.width + gap) - other.x) < th) {
      x = other.x - card.width - gap;
      snapLines.push({ x1: other.x - gap / 2, y1: Math.min(y, other.y) - 20, x2: other.x - gap / 2, y2: Math.max(y + card.height, other.y + other.height) + 20 });
    }
    if (Math.abs(x - (other.x + other.width + gap)) < th) {
      x = other.x + other.width + gap;
      snapLines.push({ x1: other.x + other.width + gap / 2, y1: Math.min(y, other.y) - 20, x2: other.x + other.width + gap / 2, y2: Math.max(y + card.height, other.y + other.height) + 20 });
    }
    if (Math.abs((y + card.height + gap) - other.y) < th) {
      y = other.y - card.height - gap;
      snapLines.push({ x1: Math.min(x, other.x) - 20, y1: other.y - gap / 2, x2: Math.max(x + card.width, other.x + other.width) + 20, y2: other.y - gap / 2 });
    }
    if (Math.abs(y - (other.y + other.height + gap)) < th) {
      y = other.y + other.height + gap;
      snapLines.push({ x1: Math.min(x, other.x) - 20, y1: other.y + other.height + gap / 2, x2: Math.max(x + card.width, other.x + other.width) + 20, y2: other.y + other.height + gap / 2 });
    }
  }

  if (snapLines.length === 0) {
    x = Math.round(x / DRAG_SNAP_TO_GRID) * DRAG_SNAP_TO_GRID;
    y = Math.round(y / DRAG_SNAP_TO_GRID) * DRAG_SNAP_TO_GRID;
  }

  return { x, y, snapLines };
}

function getNextAvailableSlot(existingCards: CardRect[], cardWidth: number, cardHeight: number): { x: number; y: number } {
  const colWidth = cardWidth + CARD_SNAP_GAP;
  const rowHeight = cardHeight + CARD_SNAP_GAP;
  const startX = 40;
  const startY = 40;
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
      const x = startX + col * colWidth;
      const y = startY + row * rowHeight;
      const testRect: CardRect = { id: '__test', x, y, width: cardWidth, height: cardHeight };
      if (!existingCards.some(c => rectsOverlap(testRect, c, CARD_MIN_GAP))) {
        return { x, y };
      }
    }
  }
  return { x: startX, y: startY + existingCards.length * rowHeight };
}

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

        {/* Satellite background */}
        {canvasData.satelliteBackground && (
          <image
            href={canvasData.satelliteBackground.imageBase64}
            x={a4!.a4X}
            y={a4!.a4Y}
            width={a4!.a4WidthPx}
            height={a4!.a4HeightPx}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

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
  onDragEnd: (id: string, x: number, y: number) => void;
  onSelect: () => void;
  onConnectorClick: (cardId: string, side: 'left' | 'right') => void;
  connectingFrom: { cardId: string; side: 'left' | 'right' } | null;
  pan: { x: number; y: number };
  zoom: number;
  isNew?: boolean;
  isRejected?: boolean;
}> = ({ project, index, isActive, position, onPositionChange, onDragEnd, onSelect, onConnectorClick, connectingFrom, pan, zoom, isNew, isRejected }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<WorkflowPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0, hasMoved: false });

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

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
    setDragStartPos({ x: position.x, y: position.y });
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
      setDragStartPos(null);
      onDragEnd(project.id, position.x, position.y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pan.x, pan.y, zoom, project.id, onPositionChange, onDragEnd, position.x, position.y]);

  const isConnectMode = connectingFrom !== null;

  return (
    <>
      {/* Ghost at drag origin */}
      {isDragging && dragStartPos && (
        <div style={{
          position: 'absolute',
          left: dragStartPos.x,
          top: dragStartPos.y,
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          background: 'rgba(255,255,255,0.35)',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
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
        border: isRejected ? '2px solid #ef4444' : (isActive ? '2.5px solid #000000' : '1px solid #e5e5e5'),
        boxShadow: isDragging
          ? '0 28px 64px rgba(0, 0, 0, 0.35), 0 8px 20px rgba(0,0,0,0.15)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.96 : (isNew && !mounted ? 0 : 1),
        overflow: 'visible',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isDragging ? 9999 : (isActive ? 100 : 1),
        transform: isDragging ? 'scale(0.98)' : (isNew && !mounted ? 'scale(0.85)' : 'scale(1)'),
        animation: isRejected ? 'cardReject 0.38s ease-out' : 'none',
        transition: isDragging
          ? 'box-shadow 0.15s ease, border-color 0.15s ease'
          : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.5, 1), opacity 0.2s ease, box-shadow 0.2s ease, left 0.15s ease-out, top 0.15s ease-out, border-color 0.15s ease',
      }}
    >
      <div
        onClick={() => { if (!dragRef.current.hasMoved) onSelect(); }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      >
      <div style={{
        padding: '12px 16px',
        borderRadius: '15px 15px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: '#D9D9D9',
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
        background: '#ffffff',
        borderRadius: '0 0 15px 15px',
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
    </>
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
  onNoteCreate,
  tasks: externalTasks = [],
  onTasksChange,
  eventId,
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
  const [tasks, setTasks] = useState<WorkflowTask[]>(externalTasks);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [rejectedCardId, setRejectedCardId] = useState<string | null>(null);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [isTidying, setIsTidying] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setConnections(externalConnections);
  }, [externalConnections]);

  useEffect(() => {
    setNotes(externalNotes);
  }, [externalNotes]);

  useEffect(() => {
    setTasks(externalTasks);
  }, [externalTasks]);

  // Fetch team members using the same pattern as the todo task UI
  useEffect(() => {
    getValidAccessToken().then(token => {
      if (!token) return;
      fetch('/api/teams/members', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.members) {
            setTeamMembers(
              data.members.map((m: any) => ({
                id: m.user_id,
                displayName: m.displayName || m.profile?.full_name || m.displayEmail || 'Unknown',
                avatarUrl: m.avatarUrl || m.profile?.avatar_url || null,
              }))
            );
          }
        })
        .catch(() => {});
    });
  }, []);

  // Helper to get card dimensions by id (note vs project card)
  const getCardDimensions = useCallback((cardId: string): { width: number; height: number } => {
    if (cardId.startsWith('note-')) {
      const note = notes.find(n => n.id === cardId);
      return { width: note?.width ?? NOTE_DEFAULT_WIDTH, height: note?.height ?? NOTE_DEFAULT_HEIGHT };
    }
    if (cardId.startsWith('task-')) {
      const task = tasks.find(t => t.id === cardId);
      return { width: task?.width ?? TASK_DEFAULT_WIDTH, height: task?.height ?? TASK_DEFAULT_HEIGHT };
    }
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }, [notes, tasks]);

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
    // Remove ALL instances of this pair (duplicates from legacy batch-save) so the
    // line disappears immediately. The parent diff will call deleteWorkflowConnectionPair
    // once, which wipes every matching DB row too.
    const target = connections[index];
    const newConnections = connections.filter(
      c => !(c.fromCardId === target.fromCardId && c.toCardId === target.toCardId),
    );
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
    setContextMenu(null);
    if (onNoteCreate) {
      // Atomic: parent saves note + position together in one upsert call
      onNoteCreate(newNote, { x: wrapperX, y: wrapperY });
    } else {
      onNotesChange?.(newNotes);
      onPositionsChange({ ...positions, [newNote.id]: { x: wrapperX, y: wrapperY } });
    }
  }, [notes, positions, onNoteCreate, onNotesChange, onPositionsChange]);

  const handleTaskChange = useCallback((updatedTask: WorkflowTask) => {
    const newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setTasks(newTasks);
    onTasksChange?.(newTasks);
    // Sync to DB if we have a real task id
    if (updatedTask.realTaskId) {
      updateTask(updatedTask.realTaskId, {
        title: updatedTask.title || 'New task',
        assignee_id: updatedTask.assignee_id,
        due_date: updatedTask.due_date,
        is_completed: updatedTask.status === 'done',
      });
    }
  }, [tasks, onTasksChange]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    onTasksChange?.(newTasks);
    const newConnections = connections.filter(c => c.fromCardId !== taskId && c.toCardId !== taskId);
    if (newConnections.length !== connections.length) {
      setConnections(newConnections);
      onConnectionsChange?.(newConnections);
    }
    if (task?.realTaskId) {
      deleteTask(task.realTaskId);
    }
  }, [tasks, connections, onTasksChange, onConnectionsChange]);

  const handleCreateTask = useCallback(async (wrapperX: number, wrapperY: number) => {
    // Optimistically add to canvas immediately
    const canvasId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTask: WorkflowTask = {
      id: canvasId,
      title: '',
      status: 'todo',
      assignee_id: null,
      due_date: null,
      width: TASK_DEFAULT_WIDTH,
      height: TASK_DEFAULT_HEIGHT,
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    onTasksChange?.(newTasks);
    onPositionsChange({ ...positions, [canvasId]: { x: wrapperX, y: wrapperY } });
    setContextMenu(null);

    // Persist to DB so it appears in the task list tab
    const { data } = await createTask({
      title: 'New task',
      event_id: eventId || null,
    });
    if (data) {
      // Store the real DB task id for future updates
      setTasks(prev => {
        const updated = prev.map(t => t.id === canvasId ? { ...t, realTaskId: data.id } : t);
        onTasksChange?.(updated);
        return updated;
      });
    }
  }, [tasks, positions, onTasksChange, onPositionsChange, eventId]);

  useEffect(() => {
    const newPositions: Record<string, WorkflowPosition> = { ...positions };
    let hasChanges = false;
    const addedIds: string[] = [];

    projects.forEach((project) => {
      if (!newPositions[project.id]) {
        const placed = Object.entries(newPositions).map(([id, pos]) => {
          const dims = id.startsWith('note-') ? { width: NOTE_DEFAULT_WIDTH, height: NOTE_DEFAULT_HEIGHT }
            : id.startsWith('task-') ? { width: TASK_DEFAULT_WIDTH, height: TASK_DEFAULT_HEIGHT }
            : { width: CARD_WIDTH, height: CARD_HEIGHT };
          return { id, x: pos.x, y: pos.y, ...dims };
        });
        const slot = getNextAvailableSlot(placed, CARD_WIDTH, CARD_HEIGHT);
        newPositions[project.id] = slot;
        hasChanges = true;
        addedIds.push(project.id);
      }
    });

    if (hasChanges) {
      onPositionsChange(newPositions);
      if (addedIds.length > 0) {
        setNewCardIds(prev => {
          const next = new Set(prev);
          addedIds.forEach(id => next.add(id));
          return next;
        });
        setTimeout(() => {
          setNewCardIds(prev => {
            const next = new Set(prev);
            addedIds.forEach(id => next.delete(id));
            return next;
          });
        }, 600);
      }
    }
  }, [projects]);

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

  // Context menu is dismissed via the backdrop div rendered in JSX — no window listener needed.

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

  // Build list of all card rects from current positions
  const getAllCardRects = useCallback((): CardRect[] => {
    const rects: CardRect[] = [];
    projects.forEach(p => {
      const pos = positions[p.id];
      if (pos) rects.push({ id: p.id, x: pos.x, y: pos.y, width: CARD_WIDTH, height: CARD_HEIGHT });
    });
    notes.forEach(n => {
      const pos = positions[n.id];
      if (pos) rects.push({ id: n.id, x: pos.x, y: pos.y, width: n.width, height: n.height });
    });
    tasks.forEach(t => {
      const pos = positions[t.id];
      if (pos) rects.push({ id: t.id, x: pos.x, y: pos.y, width: t.width ?? TASK_DEFAULT_WIDTH, height: t.height ?? TASK_DEFAULT_HEIGHT });
    });
    return rects;
  }, [projects, notes, tasks, positions]);

  // Position change with magnetic snap applied during drag
  const handlePositionChangeWithSnap = useCallback((id: string, rawX: number, rawY: number) => {
    const dims = id.startsWith('note-')
      ? { width: (notes.find(n => n.id === id)?.width ?? NOTE_DEFAULT_WIDTH), height: (notes.find(n => n.id === id)?.height ?? NOTE_DEFAULT_HEIGHT) }
      : id.startsWith('task-')
      ? { width: TASK_DEFAULT_WIDTH, height: TASK_DEFAULT_HEIGHT }
      : { width: CARD_WIDTH, height: CARD_HEIGHT };

    const others = getAllCardRects().filter(r => r.id !== id);
    const card: CardRect = { id, x: rawX, y: rawY, ...dims };
    const { x, y, snapLines: lines } = applyMagneticSnap(card, others);
    setSnapLines(lines);
    onPositionsChange({ ...positions, [id]: { x, y } });
  }, [getAllCardRects, notes, positions, onPositionsChange]);

  // On drag end: collision detection + correction
  const handleDragEnd = useCallback((id: string, finalX: number, finalY: number) => {
    setSnapLines([]);
    const dims = id.startsWith('note-')
      ? { width: (notes.find(n => n.id === id)?.width ?? NOTE_DEFAULT_WIDTH), height: (notes.find(n => n.id === id)?.height ?? NOTE_DEFAULT_HEIGHT) }
      : id.startsWith('task-')
      ? { width: TASK_DEFAULT_WIDTH, height: TASK_DEFAULT_HEIGHT }
      : { width: CARD_WIDTH, height: CARD_HEIGHT };

    const droppedRect: CardRect = { id, x: finalX, y: finalY, ...dims };
    const others = getAllCardRects().filter(r => r.id !== id);
    const hasOverlap = others.some(o => rectsOverlap(droppedRect, o, CARD_MIN_GAP));

    if (hasOverlap) {
      const corrected = findNonOverlappingPosition(droppedRect, others);
      onPositionsChange({ ...positions, [id]: corrected });
      // Flash rejection
      setRejectedCardId(id);
      setTimeout(() => setRejectedCardId(null), 400);
    }
  }, [getAllCardRects, notes, positions, onPositionsChange]);

  // Tidy Up: arrange all cards into ordered grid
  const handleTidyUp = useCallback(() => {
    setIsTidying(true);
    const allIds = [
      ...projects.map(p => p.id),
      ...notes.map(n => n.id),
      ...tasks.map(t => t.id),
    ];
    const newPositions: Record<string, WorkflowPosition> = {};
    const placed: CardRect[] = [];
    const startX = 40;
    const startY = 40;

    allIds.forEach((id) => {
      const dims = id.startsWith('note-')
        ? { width: NOTE_DEFAULT_WIDTH, height: NOTE_DEFAULT_HEIGHT }
        : id.startsWith('task-')
        ? { width: TASK_DEFAULT_WIDTH, height: TASK_DEFAULT_HEIGHT }
        : { width: CARD_WIDTH, height: CARD_HEIGHT };
      const slot = getNextAvailableSlot(placed, dims.width, dims.height);
      newPositions[id] = slot;
      placed.push({ id, x: slot.x, y: slot.y, ...dims });
    });

    // Stagger animation via position update
    onPositionsChange(newPositions);
    setTimeout(() => setIsTidying(false), 500);
  }, [projects, notes, tasks, onPositionsChange]);

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
        const newZoom = Math.min(2, Math.max(0.15, curZoom * (1 + delta)));

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
        background: '#e5e5e5',
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
        @keyframes cardReject {
          0%   { transform: scale(1) translateX(0); background: rgba(239,68,68,0.08); }
          25%  { transform: scale(1.02) translateX(-4px); }
          50%  { transform: scale(1.01) translateX(4px); }
          75%  { transform: scale(1.01) translateX(-2px); }
          100% { transform: scale(1) translateX(0); background: transparent; }
        }
      `}</style>

      {/* Infinite grid — sits outside the transform group, covers full viewport */}
      {(() => {
        const BASE_GRID = 40;
        const scaledGrid = BASE_GRID * zoom;
        const offsetX = ((pan.x % scaledGrid) + scaledGrid) % scaledGrid;
        const offsetY = ((pan.y % scaledGrid) + scaledGrid) % scaledGrid;
        const subGrid = scaledGrid / 5; // minor grid at 1/5 spacing
        const subOffsetX = ((pan.x % subGrid) + subGrid) % subGrid;
        const subOffsetY = ((pan.y % subGrid) + subGrid) % subGrid;
        return (
          <svg
            data-workflow-grid
            data-grid-bg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
          >
            <defs>
              <pattern id="workflow-dot-sm" x={subOffsetX} y={subOffsetY} width={subGrid} height={subGrid} patternUnits="userSpaceOnUse">
                <circle cx="0" cy="0" r={zoom < 0.5 ? 0 : 0.75} fill="#b8b8b8" />
              </pattern>
              <pattern id="workflow-dot-lg" x={offsetX} y={offsetY} width={scaledGrid} height={scaledGrid} patternUnits="userSpaceOnUse">
                <rect width={scaledGrid} height={scaledGrid} fill="url(#workflow-dot-sm)" />
                <circle cx="0" cy="0" r={zoom < 0.4 ? 0 : 1.4} fill="#888888" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#workflow-dot-lg)" />
          </svg>
        );
      })()}

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

        {projects.map((project, index) => {
        return (
          <DraggableCard
            key={project.id}
            project={project}
            index={index}
            isActive={activeProjectId === project.id}
            position={positions[project.id] || { x: 60 + (index % 4) * 340, y: 120 + Math.floor(index / 4) * 300 }}
            onPositionChange={handlePositionChangeWithSnap}
            onDragEnd={handleDragEnd}
            onSelect={() => onProjectSelect(project.id)}
            onConnectorClick={handleConnectorClick}
            connectingFrom={connectingFrom}
            pan={pan}
            zoom={zoom}
            isNew={newCardIds.has(project.id)}
            isRejected={rejectedCardId === project.id}
          />
        );
      })}

      {/* Draggable Note Cards */}
      {notes.map((note) => (
        <DraggableNoteCard
          key={note.id}
          note={note}
          position={positions[note.id] || { x: 100, y: 100 }}
          onPositionChange={handlePositionChangeWithSnap}
          onNoteChange={handleNoteChange}
          onDelete={handleDeleteNote}
          onConnectorClick={handleConnectorClick}
          connectingFrom={connectingFrom}
          pan={pan}
          zoom={zoom}
        />
      ))}

      {/* Draggable Task Cards */}
      {tasks.map((task) => (
        <DraggableTaskCard
          key={task.id}
          task={task}
          position={positions[task.id] || { x: 120, y: 120 }}
          onPositionChange={handlePositionChangeWithSnap}
          onTaskChange={handleTaskChange}
          onDelete={handleDeleteTask}
          onConnectorClick={handleConnectorClick}
          connectingFrom={connectingFrom}
          pan={pan}
          zoom={zoom}
          teamMembers={teamMembers}
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

        {/* Snap alignment guides */}
        {snapLines.map((line, i) => (
          <line
            key={`snap-${i}`}
            x1={line.x1 + SVG_OFFSET}
            y1={line.y1 + SVG_OFFSET}
            x2={line.x2 + SVG_OFFSET}
            y2={line.y2 + SVG_OFFSET}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.7"
            pointerEvents="none"
          />
        ))}

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
      </div>{/* end transform div */}

      {/* Zoom + Tidy toolbar — matches layout canvas ZoomControls */}
      <div style={{
        position: 'fixed',
        bottom: '65px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'white',
        borderRadius: '30px',
        padding: '6px 8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.1)',
        zIndex: 1002,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}>
        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.3}
          style={zoom > 0.3 ? zoomBtnStyle : { ...zoomBtnStyle, cursor: 'not-allowed', opacity: 0.4 }}
          title="Zoom out"
          onMouseEnter={(e) => { if (zoom > 0.3) e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Percentage — click to reset */}
        <button
          onClick={handleReset}
          style={{
            minWidth: '56px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: '#1e293b',
            fontWeight: 500,
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'all 0.15s ease',
            padding: '0 8px',
          }}
          title="Reset to 100%"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 2}
          style={zoom < 2 ? zoomBtnStyle : { ...zoomBtnStyle, cursor: 'not-allowed', opacity: 0.4 }}
          title="Zoom in"
          onMouseEnter={(e) => { if (zoom < 2) e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />

        {/* Tidy Up */}
        <button
          onClick={handleTidyUp}
          style={{
            ...zoomBtnStyle,
            width: 'auto',
            padding: '0 12px',
            gap: '6px',
            display: 'flex',
            alignItems: 'center',
            opacity: isTidying ? 0.6 : 1,
            transition: 'opacity 0.2s',
            fontSize: '13px',
            fontWeight: 500,
            color: '#475569',
          }}
          title="Tidy Up — arrange all cards into a clean grid"
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Tidy
        </button>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          {/* Backdrop — click anywhere outside to dismiss */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
            onMouseDown={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
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
          >
          {contextMenu.type === 'connection' && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleDeleteConnection(contextMenu.index); }}
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
            <>
              <button
                onMouseDown={(e) => { e.stopPropagation(); handleCreateNote(contextMenu.wrapperX, contextMenu.wrapperY); }}
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
              <button
                onMouseDown={(e) => { e.stopPropagation(); handleCreateTask(contextMenu.wrapperX, contextMenu.wrapperY); }}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                New Task
              </button>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  color: '#475569',
  transition: 'all 0.15s ease',
};

export default WorkflowCanvas;
