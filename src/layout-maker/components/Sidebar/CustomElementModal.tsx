/**
 * Custom Element Modal
 *
 * Draw custom shapes by clicking to place vertices.
 * After closing the shape, drag edge midpoints to create curves.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CustomElementTemplate, Point } from '../../types/elements';
import { calculateBoundingBox } from '../../../lib/supabase/custom-elements';

interface CustomElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>) => void;
  onAddToCanvas?: (template: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>) => void;
  editTemplate?: CustomElementTemplate | null;
}

// Curve data for edges
// - null = straight line
// - { type: 'bezier', point: Point } = custom bezier curve
// - { type: 'arc', direction: 1 | -1 } = perfect semicircle (1 = left/outward, -1 = right/inward)
type CurveControl = null | { type: 'bezier'; point: Point } | { type: 'arc'; direction: 1 | -1 };

const CANVAS_WIDTH = 492;
const CANVAS_HEIGHT = 340;
const GRID_SIZE_PX = 12;
const METERS_PER_GRID = 0.05; // 5cm per grid
const PIXELS_PER_METER = GRID_SIZE_PX / METERS_PER_GRID; // 240px per meter
const SNAP_THRESHOLD = 10;
const CURVE_HANDLE_RADIUS = 8;

const formatSize = (meters: number): string => {
  if (meters >= 1) {
    return `${meters.toFixed(2)}m`;
  }
  return `${Math.round(meters * 100)}cm`;
};

// Generate SVG path with curves (supports both bezier and arc)
const generatePathWithCurves = (vertices: Point[], curves: CurveControl[]): string => {
  if (vertices.length < 2) return '';

  let path = `M ${vertices[0]!.x} ${vertices[0]!.y}`;

  for (let i = 0; i < vertices.length; i++) {
    const nextIdx = (i + 1) % vertices.length;
    const current = vertices[i]!;
    const next = vertices[nextIdx]!;
    const curve = curves[i];

    if (!curve) {
      // Straight line
      path += ` L ${next.x} ${next.y}`;
    } else if (curve.type === 'bezier') {
      // Quadratic bezier curve
      path += ` Q ${curve.point.x} ${curve.point.y} ${next.x} ${next.y}`;
    } else if (curve.type === 'arc') {
      // Perfect semicircle arc
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const radius = Math.sqrt(dx * dx + dy * dy) / 2;
      // sweep-flag: 0 = counterclockwise, 1 = clockwise
      // direction 1 (left) = counterclockwise from edge perspective = sweep 0
      // direction -1 (right) = clockwise from edge perspective = sweep 1
      const sweepFlag = curve.direction === 1 ? 0 : 1;
      path += ` A ${radius} ${radius} 0 0 ${sweepFlag} ${next.x} ${next.y}`;
    }
  }

  return path;
};

// Calculate midpoint of an edge (or curve apex if curved)
const getEdgeMidpoint = (p1: Point, p2: Point, curve: CurveControl): Point => {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  if (!curve) {
    return { x: midX, y: midY };
  }

  if (curve.type === 'bezier') {
    // For a quadratic bezier, the point at t=0.5 is:
    // B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    return {
      x: 0.25 * p1.x + 0.5 * curve.point.x + 0.25 * p2.x,
      y: 0.25 * p1.y + 0.5 * curve.point.y + 0.25 * p2.y,
    };
  }

  if (curve.type === 'arc') {
    // For a semicircle, the apex is at radius distance perpendicular to the edge
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const radius = length / 2;

    // Perpendicular unit vector
    const perpX = (-dy / length) * curve.direction;
    const perpY = (dx / length) * curve.direction;

    return {
      x: midX + radius * perpX,
      y: midY + radius * perpY,
    };
  }

  return { x: midX, y: midY };
};

// Calculate bezier control point from desired midpoint (apex)
const getControlPointFromMidpoint = (p1: Point, p2: Point, midpoint: Point): Point => {
  // Inverse of B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
  // P1 = (midpoint - 0.25*P0 - 0.25*P2) / 0.5
  return {
    x: (midpoint.x - 0.25 * p1.x - 0.25 * p2.x) / 0.5,
    y: (midpoint.y - 0.25 * p1.y - 0.25 * p2.y) / 0.5,
  };
};

// Convert curve to bezier type (used when user starts dragging an arc)
const curveAsBezier = (p1: Point, p2: Point, curve: CurveControl): { type: 'bezier'; point: Point } | null => {
  if (!curve) return null;
  if (curve.type === 'bezier') return curve;

  // Convert arc to equivalent bezier control point
  const apex = getEdgeMidpoint(p1, p2, curve);
  const controlPoint = getControlPointFromMidpoint(p1, p2, apex);
  return { type: 'bezier', point: controlPoint };
};

export const CustomElementModal: React.FC<CustomElementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onAddToCanvas,
  editTemplate,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [name, setName] = useState('');
  const [vertices, setVertices] = useState<Point[]>([]);
  const [curves, setCurves] = useState<CurveControl[]>([]); // Control points for each edge
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [snappedPos, setSnappedPos] = useState<Point | null>(null);
  const [isNearStart, setIsNearStart] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Curve editing state
  const [draggingEdge, setDraggingEdge] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  const isEditing = !!editTemplate;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editTemplate) {
        setName(editTemplate.name);
        const loadedVertices = editTemplate.vertices.map(v => ({
          x: v.x * PIXELS_PER_METER + CANVAS_WIDTH / 2,
          y: v.y * PIXELS_PER_METER + CANVAS_HEIGHT / 2,
        }));
        setVertices(loadedVertices);

        // Load curves if they exist, otherwise initialize as straight
        if (editTemplate.curves && editTemplate.curves.length === loadedVertices.length) {
          const loadedCurves: CurveControl[] = editTemplate.curves.map((c): CurveControl => {
            if (!c) return null;
            // Handle new format with type field
            if (typeof c === 'object' && 'type' in c) {
              if (c.type === 'arc') return c as { type: 'arc'; direction: 1 | -1 };
              if (c.type === 'bezier' && 'point' in c) {
                const cp = c as { type: 'bezier'; point: Point };
                return {
                  type: 'bezier',
                  point: {
                    x: cp.point.x * PIXELS_PER_METER + CANVAS_WIDTH / 2,
                    y: cp.point.y * PIXELS_PER_METER + CANVAS_HEIGHT / 2,
                  },
                };
              }
            }
            // Handle legacy format (plain Point object)
            if (typeof c === 'object' && 'x' in c && 'y' in c) {
              const legacyPoint = c as Point;
              return {
                type: 'bezier',
                point: {
                  x: legacyPoint.x * PIXELS_PER_METER + CANVAS_WIDTH / 2,
                  y: legacyPoint.y * PIXELS_PER_METER + CANVAS_HEIGHT / 2,
                },
              };
            }
            return null;
          });
          setCurves(loadedCurves);
        } else {
          setCurves(new Array<CurveControl>(loadedVertices.length).fill(null));
        }
        setIsClosed(true);
      } else {
        setName('');
        setVertices([]);
        setCurves([]);
        setIsClosed(false);
      }
      setMousePos(null);
      setSnappedPos(null);
      setIsNearStart(false);
      setDraggingEdge(null);
      setHoveredEdge(null);
    }
  }, [isOpen, editTemplate]);

  // Convert pixels to meters
  const pixelsToMeters = useCallback((point: Point): Point => {
    return {
      x: (point.x - CANVAS_WIDTH / 2) / PIXELS_PER_METER,
      y: (point.y - CANVAS_HEIGHT / 2) / PIXELS_PER_METER,
    };
  }, []);

  // Snap to grid
  const snapToGrid = useCallback((point: Point): Point => {
    return {
      x: Math.round(point.x / GRID_SIZE_PX) * GRID_SIZE_PX,
      y: Math.round(point.y / GRID_SIZE_PX) * GRID_SIZE_PX,
    };
  }, []);

  // Distance between points
  const distance = useCallback((p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }, []);

  // Line length in meters
  const getLineLength = useCallback((p1: Point, p2: Point): number => {
    return distance(p1, p2) / PIXELS_PER_METER;
  }, [distance]);

  // Find which edge midpoint is near a point
  const findNearEdgeMidpoint = useCallback((point: Point): number | null => {
    if (!isClosed || vertices.length < 3) return null;

    for (let i = 0; i < vertices.length; i++) {
      const nextIdx = (i + 1) % vertices.length;
      const curve = curves[i] ?? null;
      const midpoint = getEdgeMidpoint(vertices[i]!, vertices[nextIdx]!, curve);
      if (distance(point, midpoint) < CURVE_HANDLE_RADIUS + 5) {
        return i;
      }
    }
    return null;
  }, [vertices, curves, isClosed, distance]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setMousePos({ x, y });

    // If dragging an edge to curve it
    if (draggingEdge !== null && isClosed) {
      const edgeIdx = draggingEdge;
      const nextIdx = (edgeIdx + 1) % vertices.length;
      const p1 = vertices[edgeIdx]!;
      const p2 = vertices[nextIdx]!;

      // Calculate bezier control point from where user is dragging (the apex position)
      const controlPoint = getControlPointFromMidpoint(p1, p2, { x, y });

      setCurves(prev => {
        const newCurves = [...prev];
        // Convert to bezier when manually dragging (allows custom curves)
        newCurves[edgeIdx] = { type: 'bezier', point: controlPoint };
        return newCurves;
      });
      return;
    }

    // If shape is closed, check for edge hover
    if (isClosed) {
      const nearEdge = findNearEdgeMidpoint({ x, y });
      setHoveredEdge(nearEdge);
      return;
    }

    // Drawing mode
    const snapped = snapToGrid({ x, y });

    if (vertices.length >= 3) {
      const startPoint = vertices[0];
      if (startPoint && distance({ x, y }, startPoint) < SNAP_THRESHOLD) {
        setSnappedPos(startPoint);
        setIsNearStart(true);
        return;
      }
    }

    for (const vertex of vertices) {
      if (distance({ x, y }, vertex) < SNAP_THRESHOLD) {
        setSnappedPos(vertex);
        setIsNearStart(false);
        return;
      }
    }

    setSnappedPos(snapped);
    setIsNearStart(false);
  }, [vertices, curves, isClosed, snapToGrid, distance, draggingEdge, findNearEdgeMidpoint]);

  // Handle mouse down (start dragging curve)
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isClosed) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const nearEdge = findNearEdgeMidpoint({ x, y });
    if (nearEdge !== null) {
      e.preventDefault();
      setDraggingEdge(nearEdge);
    }
  }, [isClosed, findNearEdgeMidpoint]);

  // Handle mouse up (stop dragging)
  const handleMouseUp = useCallback(() => {
    setDraggingEdge(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
    setSnappedPos(null);
    setIsNearStart(false);
    setHoveredEdge(null);
    setDraggingEdge(null);
  }, []);

  // Handle click
  const handleClick = useCallback(() => {
    if (isClosed) return; // In curve editing mode, don't add vertices
    if (!snappedPos) return;

    if (isNearStart && vertices.length >= 3) {
      setIsClosed(true);
      setCurves(new Array<CurveControl>(vertices.length).fill(null)); // Initialize all edges as straight
      setMousePos(null);
      setSnappedPos(null);
      setIsNearStart(false);
      return;
    }

    setVertices(prev => [...prev, snappedPos]);
  }, [snappedPos, isNearStart, vertices.length, isClosed]);

  // Reset a curve to straight
  const resetCurve = useCallback((edgeIdx: number) => {
    setCurves(prev => {
      const newCurves = [...prev];
      newCurves[edgeIdx] = null;
      return newCurves;
    });
  }, []);

  // Determine which side a curve is on: 1 = left/outward, -1 = right/inward, 0 = straight
  const getCurveSide = useCallback((edgeIdx: number): number => {
    const curve = curves[edgeIdx];
    if (!curve) return 0;

    // For arcs, the direction is stored directly
    if (curve.type === 'arc') {
      return curve.direction;
    }

    // For beziers, calculate from control point position
    const p1 = vertices[edgeIdx]!;
    const p2 = vertices[(edgeIdx + 1) % vertices.length]!;

    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const toControlX = curve.point.x - p1.x;
    const toControlY = curve.point.y - p1.y;

    const cross = edgeX * toControlY - edgeY * toControlX;
    return cross > 0 ? 1 : -1;
  }, [vertices, curves]);

  // Create a perfect semicircle arc for an edge (direction: 1 = left, -1 = right)
  const createSemicircle = useCallback((edgeIdx: number, direction: 1 | -1) => {
    setCurves(prev => {
      const newCurves = [...prev];
      newCurves[edgeIdx] = { type: 'arc', direction };
      return newCurves;
    });
  }, []);

  // Cycle through curve states: straight → left semicircle → right semicircle → straight
  const cycleCurveState = useCallback((edgeIdx: number) => {
    const currentSide = getCurveSide(edgeIdx);

    if (currentSide === 0) {
      // Straight → Left semicircle
      createSemicircle(edgeIdx, 1);
    } else if (currentSide === 1) {
      // Left → Right semicircle
      createSemicircle(edgeIdx, -1);
    } else {
      // Right → Straight
      resetCurve(edgeIdx);
    }
  }, [getCurveSide, createSemicircle, resetCurve]);

  // Undo
  const handleUndo = useCallback(() => {
    if (isClosed) {
      // Check if any curves exist, reset the last one
      const lastCurvedIdx = curves.findLastIndex((c: CurveControl) => c !== null);
      if (lastCurvedIdx >= 0) {
        resetCurve(lastCurvedIdx);
      } else {
        setIsClosed(false);
        setCurves([]);
      }
    } else {
      setVertices(prev => prev.slice(0, -1));
    }
  }, [isClosed, curves, resetCurve]);

  // Clear all
  const handleClear = useCallback(() => {
    setVertices([]);
    setCurves([]);
    setIsClosed(false);
  }, []);

  // Build template data from current state
  const buildTemplateData = useCallback(() => {
    if (!name.trim() || vertices.length < 3 || !isClosed) return null;

    const verticesInMeters = vertices.map(pixelsToMeters);

    // Convert curves to storage format (meters for bezier points)
    const curvesForStorage = curves.map((c): CurveControl => {
      if (!c) return null;
      if (c.type === 'arc') return c; // Arc data doesn't need conversion
      // Convert bezier control point to meters
      return {
        type: 'bezier',
        point: pixelsToMeters(c.point),
      };
    });

    const bbox = calculateBoundingBox(verticesInMeters);

    // Generate SVG path with curves in meters
    const svgPathData = generatePathWithCurves(verticesInMeters, curvesForStorage);

    // Check if any curves exist
    const hasCurves = curvesForStorage.some(c => c !== null);

    return {
      name: name.trim(),
      svgPath: svgPathData,
      width: bbox.width || 0.1,
      height: bbox.height || 0.1,
      vertices: verticesInMeters,
      curves: hasCurves ? curvesForStorage : undefined,
    };
  }, [name, vertices, curves, isClosed, pixelsToMeters]);

  // Save to library
  const handleSave = useCallback(() => {
    const templateData = buildTemplateData();
    if (!templateData) return;

    onSave(templateData);
    onClose();
  }, [buildTemplateData, onSave, onClose]);

  // Add directly to canvas
  const handleAddToCanvas = useCallback(() => {
    console.log('[CustomElementModal] handleAddToCanvas called');
    const templateData = buildTemplateData();
    console.log('[CustomElementModal] templateData:', templateData);
    console.log('[CustomElementModal] onAddToCanvas exists:', !!onAddToCanvas);

    if (!templateData || !onAddToCanvas) {
      console.log('[CustomElementModal] Returning early - templateData or onAddToCanvas missing');
      return;
    }

    console.log('[CustomElementModal] Calling onAddToCanvas with:', templateData);
    onAddToCanvas(templateData);
    onClose();
  }, [buildTemplateData, onAddToCanvas, onClose]);

  // Keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleUndo();
    }
  }, [onClose, handleSave, handleUndo]);

  // Shape info
  const shapeInfo = useMemo(() => {
    if (vertices.length < 2) return null;
    const verticesInMeters = vertices.map(pixelsToMeters);
    const bbox = calculateBoundingBox(verticesInMeters);
    const hasCurves = curves.some((c: CurveControl) => c !== null);
    const hasArcs = curves.some((c: CurveControl) => c !== null && c.type === 'arc');
    return {
      width: bbox.width,
      height: bbox.height,
      points: vertices.length,
      hasCurves,
      hasArcs,
    };
  }, [vertices, curves, pixelsToMeters]);

  // SVG path for the shape
  const shapePath = useMemo(() => {
    return generatePathWithCurves(vertices, curves);
  }, [vertices, curves]);

  const canSave = name.trim().length > 0 && vertices.length >= 3;

  if (!isOpen) {
    return null;
  }

  console.log('[CustomElementModal] MODAL IS OPEN - canSave:', canSave, 'isClosed:', isClosed, 'onAddToCanvas exists:', !!onAddToCanvas, 'isEditing:', isEditing);

  const previewPoint = snappedPos || mousePos;
  const lastVertex = vertices.length > 0 ? vertices[vertices.length - 1] : null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
            }}>
              {isEditing ? 'Edit Custom Shape' : 'Create Custom Shape'}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: '#6b7280',
            }}>
              {!isClosed
                ? 'Click to draw edges • Click first point to close'
                : 'Double-click to cycle: straight → left → right'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {/* Name Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '6px',
            }}>
              Shape Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Curved Bar, Kidney Table"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Drawing Canvas */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                {!isClosed ? 'Draw Shape' : 'Adjust Curves'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUndo}
                  disabled={vertices.length === 0 && !isClosed}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: (vertices.length === 0 && !isClosed) ? '#9ca3af' : '#4b5563',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (vertices.length === 0 && !isClosed) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l6 6M3 10l6-6" />
                  </svg>
                  Undo
                </button>
                <button
                  onClick={handleClear}
                  disabled={vertices.length === 0}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: vertices.length === 0 ? '#9ca3af' : '#4b5563',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: vertices.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              overflow: 'hidden',
              cursor: isClosed ? (draggingEdge !== null ? 'grabbing' : 'default') : 'crosshair',
              backgroundColor: '#f8fafc',
            }}>
              <svg
                ref={svgRef}
                width="100%"
                height={CANVAS_HEIGHT}
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                style={{ display: 'block', userSelect: 'none' }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              >
                {/* Background */}
                <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8fafc" />

                {/* Grid pattern */}
                <defs>
                  <pattern id="smallGrid" width={GRID_SIZE_PX} height={GRID_SIZE_PX} patternUnits="userSpaceOnUse">
                    <path d={`M ${GRID_SIZE_PX} 0 L 0 0 0 ${GRID_SIZE_PX}`} fill="none" stroke="#e8eaed" strokeWidth="0.5" />
                  </pattern>
                  <pattern id="mediumGrid" width={GRID_SIZE_PX * 2} height={GRID_SIZE_PX * 2} patternUnits="userSpaceOnUse">
                    <rect width={GRID_SIZE_PX * 2} height={GRID_SIZE_PX * 2} fill="url(#smallGrid)" />
                    <path d={`M ${GRID_SIZE_PX * 2} 0 L 0 0 0 ${GRID_SIZE_PX * 2}`} fill="none" stroke="#d1d5db" strokeWidth="0.75" />
                  </pattern>
                  <pattern id="largeGrid" width={GRID_SIZE_PX * 10} height={GRID_SIZE_PX * 10} patternUnits="userSpaceOnUse">
                    <rect width={GRID_SIZE_PX * 10} height={GRID_SIZE_PX * 10} fill="url(#mediumGrid)" />
                    <path d={`M ${GRID_SIZE_PX * 10} 0 L 0 0 0 ${GRID_SIZE_PX * 10}`} fill="none" stroke="#94a3b8" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#largeGrid)" />

                {/* Center crosshair */}
                <line x1={CANVAS_WIDTH/2} y1={0} x2={CANVAS_WIDTH/2} y2={CANVAS_HEIGHT} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
                <line x1={0} y1={CANVAS_HEIGHT/2} x2={CANVAS_WIDTH} y2={CANVAS_HEIGHT/2} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

                {/* Closed shape with curves */}
                {isClosed && vertices.length >= 3 && (
                  <path
                    d={shapePath}
                    fill="rgba(59, 130, 246, 0.15)"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {/* Edges while drawing (not closed) */}
                {!isClosed && vertices.length >= 2 && vertices.map((vertex, i) => {
                  if (i === 0) return null;
                  const prev = vertices[i - 1];
                  if (!prev) return null;
                  const lengthM = getLineLength(prev, vertex);
                  const midX = (prev.x + vertex.x) / 2;
                  const midY = (prev.y + vertex.y) / 2;

                  return (
                    <g key={`edge-${i}`}>
                      <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={vertex.x}
                        y2={vertex.y}
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <rect x={midX - 22} y={midY - 9} width="44" height="18" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                      <text x={midX} y={midY + 4} fontSize="11" fill="#374151" textAnchor="middle" fontWeight="500">
                        {formatSize(lengthM)}
                      </text>
                    </g>
                  );
                })}

                {/* Closing edge preview */}
                {!isClosed && vertices.length >= 3 && isNearStart && (
                  <line
                    x1={vertices[vertices.length - 1]!.x}
                    y1={vertices[vertices.length - 1]!.y}
                    x2={vertices[0]!.x}
                    y2={vertices[0]!.y}
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="8,4"
                  />
                )}

                {/* Preview edge to cursor */}
                {!isClosed && lastVertex && previewPoint && !isNearStart && (
                  <g>
                    <line
                      x1={lastVertex.x}
                      y1={lastVertex.y}
                      x2={previewPoint.x}
                      y2={previewPoint.y}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="6,4"
                      opacity="0.7"
                    />
                    {distance(lastVertex, previewPoint) > 25 && (
                      <text
                        x={(lastVertex.x + previewPoint.x) / 2}
                        y={(lastVertex.y + previewPoint.y) / 2 - 10}
                        fontSize="11"
                        fill="#3b82f6"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {formatSize(getLineLength(lastVertex, previewPoint))}
                      </text>
                    )}
                  </g>
                )}

                {/* Vertices */}
                {vertices.map((vertex, i) => (
                  <g key={`vertex-${i}`}>
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={i === 0 ? 8 : 6}
                      fill={i === 0 ? '#2563eb' : '#ffffff'}
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />
                    {i === 0 && vertices.length >= 3 && !isClosed && (
                      <circle
                        cx={vertex.x}
                        cy={vertex.y}
                        r={isNearStart ? 18 : 16}
                        fill={isNearStart ? 'rgba(34, 197, 94, 0.2)' : 'none'}
                        stroke={isNearStart ? '#22c55e' : '#2563eb'}
                        strokeWidth="2"
                        strokeDasharray={isNearStart ? 'none' : '4,3'}
                        opacity={isNearStart ? 1 : 0.4}
                      />
                    )}
                  </g>
                ))}

                {/* Curve handles (when closed) */}
                {isClosed && vertices.map((vertex, i) => {
                  const nextIdx = (i + 1) % vertices.length;
                  const next = vertices[nextIdx]!;
                  const curve = curves[i];
                  const midpoint = getEdgeMidpoint(vertex, next, curve ?? null);
                  const isHovered = hoveredEdge === i;
                  const isDragging = draggingEdge === i;
                  const isCurved = curve !== null;
                  const isArc = curve !== null && curve.type === 'arc';
                  const isBezier = curve !== null && curve.type === 'bezier';
                  const curveSide = getCurveSide(i); // 0 = straight, 1 = left, -1 = right

                  return (
                    <g
                      key={`handle-${i}`}
                      style={{ cursor: 'pointer' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        cycleCurveState(i);
                      }}
                    >
                      {/* Control point line (only for bezier curves, not arcs) */}
                      {isBezier && curve.type === 'bezier' && (
                        <line
                          x1={midpoint.x}
                          y1={midpoint.y}
                          x2={curve.point.x}
                          y2={curve.point.y}
                          stroke="#f97316"
                          strokeWidth="1"
                          strokeDasharray="3,2"
                          opacity="0.5"
                        />
                      )}
                      {/* Handle circle - color indicates state (green for perfect arc, orange for bezier) */}
                      <circle
                        cx={midpoint.x}
                        cy={midpoint.y}
                        r={CURVE_HANDLE_RADIUS}
                        fill={
                          isDragging ? (isArc ? '#22c55e' : '#f97316') :
                          isHovered ? (curveSide === 0 ? '#3b82f6' : isArc ? '#22c55e' : curveSide === 1 ? '#f97316' : '#ef4444') :
                          curveSide === 0 ? '#ffffff' :
                          isArc ? '#bbf7d0' :
                          curveSide === 1 ? '#fdba74' : '#fca5a5'
                        }
                        stroke={
                          curveSide === 0 ? '#2563eb' :
                          isArc ? '#22c55e' :
                          curveSide === 1 ? '#f97316' : '#ef4444'
                        }
                        strokeWidth="2"
                      />
                      {/* Perfect semicircle badge */}
                      {isArc && (
                        <text
                          x={midpoint.x}
                          y={midpoint.y + 20}
                          fontSize="9"
                          fill="#22c55e"
                          textAnchor="middle"
                          fontWeight="600"
                          pointerEvents="none"
                        >
                          180°
                        </text>
                      )}
                      {/* Icon showing current state and next action */}
                      {curveSide === 0 && (
                        // Straight → show arc icon (will create left curve)
                        <path
                          d={`M ${midpoint.x - 4} ${midpoint.y + 2} A 4 4 0 0 1 ${midpoint.x + 4} ${midpoint.y + 2}`}
                          fill="none"
                          stroke={isHovered ? '#ffffff' : '#9ca3af'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          pointerEvents="none"
                        />
                      )}
                      {curveSide === 1 && (
                        // Left curve → show flip arrow (will flip to right)
                        <g pointerEvents="none">
                          <path
                            d={`M ${midpoint.x - 4} ${midpoint.y - 2} A 4 4 0 0 0 ${midpoint.x + 4} ${midpoint.y - 2}`}
                            fill="none"
                            stroke={isHovered ? '#ffffff' : '#f97316'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d={`M ${midpoint.x + 2} ${midpoint.y - 4} L ${midpoint.x + 4} ${midpoint.y - 2} L ${midpoint.x + 2} ${midpoint.y}`}
                            fill="none"
                            stroke={isHovered ? '#ffffff' : '#f97316'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                      {curveSide === -1 && (
                        // Right curve → show straight line icon (will reset)
                        <line
                          x1={midpoint.x - 4}
                          y1={midpoint.y}
                          x2={midpoint.x + 4}
                          y2={midpoint.y}
                          stroke={isHovered ? '#ffffff' : '#ef4444'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          pointerEvents="none"
                        />
                      )}
                      {/* Tooltip on hover showing next action */}
                      {isHovered && !isDragging && (
                        <g pointerEvents="none">
                          <rect
                            x={midpoint.x - 42}
                            y={midpoint.y - 28}
                            width="84"
                            height="18"
                            rx="4"
                            fill="rgba(0,0,0,0.85)"
                          />
                          <text
                            x={midpoint.x}
                            y={midpoint.y - 16}
                            fontSize="10"
                            fill="#ffffff"
                            textAnchor="middle"
                            fontWeight="500"
                          >
                            {curveSide === 0 ? '⟲ 180° arc left' : curveSide === 1 ? '⟳ 180° arc right' : '— Straighten'}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Cursor indicator (drawing mode) */}
                {!isClosed && previewPoint && !isNearStart && (
                  <circle
                    cx={previewPoint.x}
                    cy={previewPoint.y}
                    r="6"
                    fill={vertices.length === 0 ? '#2563eb' : '#3b82f6'}
                    opacity={vertices.length === 0 ? 0.6 : 0.4}
                  />
                )}

                {/* "Click to close" text */}
                {!isClosed && isNearStart && vertices.length >= 3 && (
                  <text
                    x={vertices[0]!.x}
                    y={vertices[0]!.y - 28}
                    fontSize="11"
                    fill="#22c55e"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    Click to close
                  </text>
                )}
              </svg>
            </div>

            {/* Scale and instructions */}
            <div style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{
                  width: `${GRID_SIZE_PX * 10}px`,
                  height: '3px',
                  backgroundColor: '#94a3b8',
                  borderRadius: '2px',
                  position: 'relative',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: -2, width: 1, height: 7, backgroundColor: '#94a3b8' }} />
                  <div style={{ position: 'absolute', right: 0, top: -2, width: 1, height: 7, backgroundColor: '#94a3b8' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  = 50cm
                </span>
              </div>

              <span style={{
                fontSize: '12px',
                color: isClosed ? '#f97316' : '#64748b',
                fontWeight: isClosed ? 500 : 400,
              }}>
                {vertices.length === 0 && 'Click to start drawing'}
                {vertices.length === 1 && 'Click to add next point'}
                {vertices.length === 2 && 'Add more points'}
                {vertices.length >= 3 && !isClosed && !isNearStart && 'Click first point to close'}
                {isNearStart && !isClosed && 'Click to close!'}
                {isClosed && 'Double-click: cycle semicircle direction'}
              </span>
            </div>
          </div>

          {/* Shape Info */}
          {shapeInfo && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: isClosed ? '#f0fdf4' : '#f3f4f6',
              border: isClosed ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Size</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    {formatSize(shapeInfo.width)} × {formatSize(shapeInfo.height)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    {shapeInfo.points}
                  </p>
                </div>
                {shapeInfo.hasCurves && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Style</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 600, color: shapeInfo.hasArcs ? '#22c55e' : '#f97316' }}>
                      {shapeInfo.hasArcs ? '180° Arcs' : 'Curved'}
                    </p>
                  </div>
                )}
              </div>
              {isClosed && (
                <div style={{
                  padding: '8px 14px',
                  backgroundColor: '#22c55e',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                    ✓ Ready
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#111827'}
            onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Save to Library button - secondary when Add to Canvas exists */}
            <button
              onClick={handleSave}
              disabled={!canSave || !isClosed}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                color: (canSave && isClosed) ? (onAddToCanvas ? '#374151' : '#ffffff') : '#9ca3af',
                backgroundColor: (canSave && isClosed) ? (onAddToCanvas ? '#ffffff' : '#22c55e') : '#f3f4f6',
                border: (canSave && isClosed) ? '1px solid #d1d5db' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: (canSave && isClosed) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17,21 17,13 7,13 7,21" />
                <polyline points="7,3 7,8 15,8" />
              </svg>
              {isEditing ? 'Save Changes' : 'Save to Library'}
            </button>

            {/* Add to Canvas button - primary action */}
            {onAddToCanvas && !isEditing && (
              <button
                onClick={() => {
                  console.log('[CustomElementModal] Add to Canvas button CLICKED!');
                  handleAddToCanvas();
                }}
                disabled={!canSave || !isClosed}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: (canSave && isClosed) ? '#2563eb' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (canSave && isClosed) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: (canSave && isClosed) ? '0 2px 4px rgba(37, 99, 235, 0.3)' : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8m-4-4h8" />
                </svg>
                Add to Canvas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default CustomElementModal;
