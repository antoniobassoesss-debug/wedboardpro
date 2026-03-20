/**
 * String Lights Element Component
 *
 * Renders a catenary wire with Edison/festoon bulbs.
 * Premium quality: real sag physics, glow effects, bulb anatomy.
 *
 * Coordinate system: SVG pixels = meters * pixelsPerMeter
 */

import React, { useMemo } from 'react';
import type { StringLightsElement } from '../../types/elements';

interface StringLightsElementProps {
  element: StringLightsElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onAnchorMouseDown?: (elementId: string, anchor: 'start' | 'end', event: React.MouseEvent) => void;
}

// Bulb globe radius in SVG pixels
const BULB_RADIUS = { small: 4, medium: 6, large: 9 } as const;

// Spacing between bulb centers in SVG pixels
const SPACING_PX = { dense: 50, normal: 75, sparse: 110 } as const;

// Wire color presets
const WIRE_DEFAULT = '#3d2b1f';

interface BulbColors {
  fill: string;
  glow: string;
  stroke: string;
}

function getBulbColors(bulbColor: string, index: number): BulbColors {
  if (bulbColor === 'warm-white') {
    return { fill: '#fff9e6', glow: '#fbbf24', stroke: '#f59e0b' };
  }
  if (bulbColor === 'cool-white') {
    return { fill: '#f0f8ff', glow: '#93c5fd', stroke: '#3b82f6' };
  }
  if (bulbColor === 'multicolor') {
    const palette = ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];
    const c = palette[index % palette.length]!;
    return { fill: c + '33', glow: c, stroke: c };
  }
  // Custom hex color
  return { fill: bulbColor + '33', glow: bulbColor, stroke: bulbColor };
}

/** Sample a point on a quadratic bezier at parameter t */
function bezierPoint(
  sx: number, sy: number,
  cx: number, cy: number,
  ex: number, ey: number,
  t: number
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * sx + 2 * mt * t * cx + t * t * ex,
    y: mt * mt * sy + 2 * mt * t * cy + t * t * ey,
  };
}

/** Approximate arc length of a quadratic bezier (20-segment estimation) */
function bezierArcLength(
  sx: number, sy: number,
  cx: number, cy: number,
  ex: number, ey: number,
  segments = 20
): number {
  let len = 0;
  let prev = bezierPoint(sx, sy, cx, cy, ex, ey, 0);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const curr = bezierPoint(sx, sy, cx, cy, ex, ey, t);
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    len += Math.sqrt(dx * dx + dy * dy);
    prev = curr;
  }
  return len;
}

/** Find t value at a given arc length along the bezier (arc-length parameterization) */
function bezierTAtArcLength(
  sx: number, sy: number,
  cx: number, cy: number,
  ex: number, ey: number,
  targetLen: number,
  totalLen: number,
  segments = 100
): number {
  let accumulated = 0;
  let prev = bezierPoint(sx, sy, cx, cy, ex, ey, 0);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const curr = bezierPoint(sx, sy, cx, cy, ex, ey, t);
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    accumulated += Math.sqrt(dx * dx + dy * dy);
    if (accumulated >= targetLen) return t;
    prev = curr;
  }
  return 1;
}

export const StringLightsElementComponent: React.FC<StringLightsElementProps> = ({
  element,
  pixelsPerMeter,
  isSelected = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onAnchorMouseDown,
}) => {
  const ppm = pixelsPerMeter;

  // Anchor positions in SVG pixels
  const sx = element.x * ppm;
  const sy = element.y * ppm;
  const ex = (element.x + element.endAnchorOffset.x) * ppm;
  const ey = (element.y + element.endAnchorOffset.y) * ppm;

  // Catenary control point: midpoint + downward sag (5% of chord length)
  const spanPx = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
  const sagPx = Math.max(2, 0.05 * spanPx);
  const cqx = (sx + ex) / 2;
  const cqy = (sy + ey) / 2 + sagPx;

  // Wire path
  const wirePath = `M ${sx} ${sy} Q ${cqx} ${cqy} ${ex} ${ey}`;

  // Bulb positions — evenly distributed along arc length
  const bulbs = useMemo(() => {
    if (spanPx < 10) return [];
    const spacingPx = SPACING_PX[element.spacing];
    const totalLen = bezierArcLength(sx, sy, cqx, cqy, ex, ey);
    const count = Math.max(1, Math.floor(totalLen / spacingPx));
    // Distribute evenly including endpoints
    return Array.from({ length: count + 1 }, (_, i) => {
      const targetLen = (i / count) * totalLen;
      const t = bezierTAtArcLength(sx, sy, cqx, cqy, ex, ey, targetLen, totalLen);
      return bezierPoint(sx, sy, cqx, cqy, ex, ey, t);
    });
  }, [sx, sy, cqx, cqy, ex, ey, spanPx, element.spacing]);

  const r = BULB_RADIUS[element.bulbSize];
  const wireColor = element.wireColor || WIRE_DEFAULT;

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible wide stroke for easy hit-testing */}
      <path
        d={wirePath}
        stroke="transparent"
        strokeWidth={24}
        fill="none"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        style={{ cursor: 'pointer' }}
      />

      {/* Wire / rope */}
      <path
        d={wirePath}
        stroke={wireColor}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />

      {/* Bulbs */}
      {bulbs.map(({ x: bx, y: by }, i) => {
        const { fill, glow, stroke } = getBulbColors(element.bulbColor, i);
        const socketH = r * 0.55;
        const socketW = r * 0.75;

        return (
          <g key={i} style={{ pointerEvents: 'none' }}>
            {/* Outer atmospheric glow */}
            <circle cx={bx} cy={by} r={r * 3.2} fill={glow} opacity={0.06} />
            {/* Inner glow halo */}
            <circle cx={bx} cy={by} r={r * 2.0} fill={glow} opacity={0.13} />
            {/* Socket / cap (sits above the globe) */}
            <rect
              x={bx - socketW / 2}
              y={by - r - socketH}
              width={socketW}
              height={socketH}
              rx={1.5}
              fill="#555"
              stroke="#333"
              strokeWidth={0.5}
            />
            {/* Wire-to-socket connecting line */}
            <line
              x1={bx}
              y1={by - r - socketH}
              x2={bx}
              y2={by - r}
              stroke={wireColor}
              strokeWidth={1}
              opacity={0.6}
            />
            {/* Globe — main body */}
            <circle
              cx={bx}
              cy={by}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.8}
            />
            {/* Globe — highlight (top-left) */}
            <circle
              cx={bx - r * 0.3}
              cy={by - r * 0.3}
              r={r * 0.22}
              fill="white"
              opacity={0.5}
            />
            {/* Filament / center glow */}
            <circle
              cx={bx}
              cy={by}
              r={r * 0.28}
              fill={glow}
              opacity={0.9}
            />
          </g>
        );
      })}

      {/* Selection state: dashed outline + anchor handles */}
      {isSelected && (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={wirePath}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6,4"
            fill="none"
            opacity={0.5}
          />
        </g>
      )}

      {/* Anchor handles (interactive) */}
      {isSelected && (
        <>
          {/* Start anchor */}
          <circle
            cx={sx}
            cy={sy}
            r={8}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onAnchorMouseDown?.(element.id, 'start', e);
            }}
          />
          <circle cx={sx} cy={sy} r={3.5} fill="#3b82f6" style={{ pointerEvents: 'none' }} />

          {/* End anchor */}
          <circle
            cx={ex}
            cy={ey}
            r={8}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onAnchorMouseDown?.(element.id, 'end', e);
            }}
          />
          <circle cx={ex} cy={ey} r={3.5} fill="#3b82f6" style={{ pointerEvents: 'none' }} />
        </>
      )}
    </g>
  );
};

export default StringLightsElementComponent;
