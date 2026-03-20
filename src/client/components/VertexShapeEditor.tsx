/**
 * VertexShapeEditor
 *
 * Reusable interactive SVG shape editor — draggable corner vertices and
 * edge midpoints. Pulling a midpoint off the line converts that segment
 * to a quadratic bezier curve.
 *
 * Exports:
 *   CustomShapeData   — data type
 *   computeShapePath  — converts data + bounds → SVG path string
 *   BASE_SHAPE_DATA   — canonical starting shapes keyed by variant name
 *   VertexShapeEditor — the React component
 */

import React, { useRef, useState, useEffect, useCallback, useId } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShapeVertex { x: number; y: number; }
export interface ShapeEdge {
  curved: boolean;
  cpx: number; // control point, normalized 0-1 (may exceed [0,1])
  cpy: number;
}
export interface CustomShapeData {
  corners: ShapeVertex[];
  edges: ShapeEdge[];    // edges.length === corners.length; edge[i] goes from corner[i] to corner[(i+1)%n]
}

// ── Path computation ──────────────────────────────────────────────────────────

export function computeShapePath(
  data: CustomShapeData,
  bx: number, by: number, bw: number, bh: number
): string {
  const px = (nx: number) => bx + nx * bw;
  const py = (ny: number) => by + ny * bh;
  const { corners, edges } = data;
  const n = corners.length;
  if (n === 0) return '';
  const c0 = corners[0]!;
  let path = `M${px(c0.x).toFixed(1)},${py(c0.y).toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const next = corners[(i + 1) % n]!;
    const e = edges[i]!;
    if (e.curved) {
      path += ` Q${px(e.cpx).toFixed(1)},${py(e.cpy).toFixed(1)} ${px(next.x).toFixed(1)},${py(next.y).toFixed(1)}`;
    } else {
      path += ` L${px(next.x).toFixed(1)},${py(next.y).toFixed(1)}`;
    }
  }
  return path + 'Z';
}

// ── Base shape library ────────────────────────────────────────────────────────

const straight = (): ShapeEdge => ({ curved: false, cpx: 0.5, cpy: 0.5 });
const straightN = (n: number): ShapeEdge[] => Array.from({ length: n }, straight);

export const BASE_SHAPE_DATA: Record<string, CustomShapeData> = {
  rectangular: {
    corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    edges: straightN(4),
  },
  semicircular: {
    corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    edges: [
      straight(),
      straight(),
      { curved: true, cpx: 0.5, cpy: 1.38 },  // front edge bows out
      straight(),
    ],
  },
  hexagonal: {
    corners: [
      { x: 0.5, y: 0 },
      { x: 1,   y: 0.27 },
      { x: 1,   y: 0.73 },
      { x: 0.5, y: 1 },
      { x: 0,   y: 0.73 },
      { x: 0,   y: 0.27 },
    ],
    edges: straightN(6),
  },
  circular: {
    // Diamond corners + curved edges approximate a circle
    corners: [{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }],
    edges: [
      { curved: true, cpx: 1,   cpy: 0 },
      { curved: true, cpx: 1,   cpy: 1 },
      { curved: true, cpx: 0,   cpy: 1 },
      { curved: true, cpx: 0,   cpy: 0 },
    ],
  },
  't-shape': {
    corners: [
      { x: 0,    y: 0   },
      { x: 1,    y: 0   },
      { x: 1,    y: 0.4 },
      { x: 0.65, y: 0.4 },
      { x: 0.65, y: 1   },
      { x: 0.35, y: 1   },
      { x: 0.35, y: 0.4 },
      { x: 0,    y: 0.4 },
    ],
    edges: straightN(8),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cloneData(d: CustomShapeData): CustomShapeData {
  return {
    corners: d.corners.map((c) => ({ ...c })),
    edges:   d.edges.map((e)   => ({ ...e })),
  };
}

function getMidpointHandle(
  c1: ShapeVertex, c2: ShapeVertex, edge: ShapeEdge
): { x: number; y: number } {
  return edge.curved
    ? { x: edge.cpx, y: edge.cpy }
    : { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
}

function snapN(v: number): number {
  return Math.round(v * 20) / 20; // snap to 5% grid
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VertexShapeEditorProps {
  shapeData: CustomShapeData;
  onChange: (data: CustomShapeData) => void;
  fillColor: string;
  svgWidth?: number;
  svgHeight?: number;
}

const EDIT_PAD = 40; // px padding inside svg for vertex overshoot room

export const VertexShapeEditor: React.FC<VertexShapeEditorProps> = ({
  shapeData,
  onChange,
  fillColor,
  svgWidth = 380,
  svgHeight = 240,
}) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ type: 'corner' | 'mid'; idx: number } | null>(null);
  const [localData, setLocalData] = useState<CustomShapeData>(cloneData(shapeData));

  // Sync from parent when not actively dragging
  useEffect(() => {
    if (!dragRef.current) setLocalData(cloneData(shapeData));
  }, [shapeData]);

  const editW = svgWidth  - EDIT_PAD * 2;
  const editH = svgHeight - EDIT_PAD * 2;

  const toSvgX = useCallback((nx: number) => EDIT_PAD + nx * editW, [editW]);
  const toSvgY = useCallback((ny: number) => EDIT_PAD + ny * editH, [editH]);

  const fromSvg = useCallback((cx: number, cy: number, rect: DOMRect) => {
    const rawNx = (cx - rect.left - EDIT_PAD) / editW;
    const rawNy = (cy - rect.top  - EDIT_PAD) / editH;
    return { nx: snapN(rawNx), ny: snapN(rawNy) };
  }, [editW, editH]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent, type: 'corner' | 'mid', idx: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type, idx };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const { nx, ny } = fromSvg(e.clientX, e.clientY, rect);
    const { type, idx } = dragRef.current;
    const next = cloneData(localData);

    if (type === 'corner') {
      next.corners[idx] = { x: nx, y: ny };
    } else {
      next.edges[idx] = { curved: true, cpx: nx, cpy: ny };
    }
    setLocalData(next);
    onChange(next);
  }, [localData, fromSvg, onChange]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const shapePath = computeShapePath(localData, EDIT_PAD, EDIT_PAD, editW, editH);
  const n = localData.corners.length;

  return (
    <svg
      ref={svgRef}
      width={svgWidth} height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ display: 'block', userSelect: 'none', touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        {/* Snap grid pattern */}
        <pattern id={`${uid}-grid`}
          x={EDIT_PAD} y={EDIT_PAD}
          width={editW / 20} height={editH / 20}
          patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.9" fill="#cbd5e1" opacity="0.55" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width={svgWidth} height={svgHeight} fill="#f8fafc" rx={10} />
      <rect x={EDIT_PAD - 4} y={EDIT_PAD - 4}
        width={editW + 8} height={editH + 8}
        fill="url(#${uid}-grid)" rx={4} />
      {/* Inline fill for pattern (template literal doesn't work in SVG attr directly) */}
      <rect x={EDIT_PAD - 4} y={EDIT_PAD - 4}
        width={editW + 8} height={editH + 8}
        fill="none" stroke="#e2e8f0" strokeWidth={1} rx={4} />

      {/* Snap dots via explicit grid */}
      {Array.from({ length: 21 }, (_, row) =>
        Array.from({ length: 21 }, (_, col) => (
          <circle key={`${row}-${col}`}
            cx={toSvgX(col / 20)} cy={toSvgY(row / 20)}
            r={0.9} fill="#cbd5e1" opacity={0.5} />
        ))
      )}

      {/* Shape fill */}
      <path d={shapePath} fill={fillColor} fillOpacity={0.35} />

      {/* Shape outline */}
      <path d={shapePath} fill="none" stroke="#0f172a" strokeWidth={1.5} opacity={0.7} />

      {/* Edge midpoint handles */}
      {Array.from({ length: n }, (_, i) => {
        const c1 = localData.corners[i]!;
        const c2 = localData.corners[(i + 1) % n]!;
        const edge = localData.edges[i]!;
        const mid = getMidpointHandle(c1, c2, edge);
        const sx = toSvgX(mid.x);
        const sy = toSvgY(mid.y);
        const isCurved = edge.curved;
        return (
          <g key={`mid-${i}`} style={{ cursor: 'crosshair' }}
            onMouseDown={(e) => handleMouseDown(e, 'mid', i)}>
            <circle cx={sx} cy={sy} r={9} fill="transparent" /> {/* hit area */}
            <circle cx={sx} cy={sy} r={5}
              fill={isCurved ? '#7c3aed' : '#ffffff'}
              stroke={isCurved ? '#6d28d9' : '#94a3b8'}
              strokeWidth={1.5}
              opacity={0.9} />
            {isCurved && (
              <>
                {/* Control point line to corners */}
                <line x1={toSvgX(c1.x)} y1={toSvgY(c1.y)} x2={sx} y2={sy}
                  stroke="#a78bfa" strokeWidth={0.8} strokeDasharray="3,2" />
                <line x1={sx} y1={sy} x2={toSvgX(c2.x)} y2={toSvgY(c2.y)}
                  stroke="#a78bfa" strokeWidth={0.8} strokeDasharray="3,2" />
              </>
            )}
          </g>
        );
      })}

      {/* Corner handles */}
      {localData.corners.map((c, i) => {
        const sx = toSvgX(c.x);
        const sy = toSvgY(c.y);
        return (
          <g key={`corner-${i}`} style={{ cursor: 'grab' }}
            onMouseDown={(e) => handleMouseDown(e, 'corner', i)}>
            <circle cx={sx} cy={sy} r={11} fill="transparent" /> {/* hit area */}
            <circle cx={sx} cy={sy} r={7}
              fill="#0f172a" stroke="#ffffff" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
};

export default VertexShapeEditor;
