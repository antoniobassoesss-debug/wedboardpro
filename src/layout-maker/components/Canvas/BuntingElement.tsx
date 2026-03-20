/**
 * Bunting / Arraial Flags Element Component
 *
 * Renders a catenary string with hanging triangular or rectangular pennant flags.
 * Inspired by Portuguese arraial/festa decoration — vibrant, festive, premium.
 *
 * Coordinate system: SVG pixels = meters * pixelsPerMeter
 */

import React, { useMemo } from 'react';
import type { BuntingElement } from '../../types/elements';

interface BuntingElementProps {
  element: BuntingElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onAnchorMouseDown?: (elementId: string, anchor: 'start' | 'end', event: React.MouseEvent) => void;
}

// Flag dimensions in SVG pixels
const FLAG_DIMS = {
  small:  { w: 16, h: 22 },
  medium: { w: 26, h: 34 },
  large:  { w: 38, h: 50 },
} as const;

// Spacing multipliers (gap between flags relative to flag width)
const SPACING_MULT = { dense: 1.15, normal: 1.6, sparse: 2.2 } as const;

// Color palettes by scheme
const COLOR_PALETTES: Record<string, string[]> = {
  'arraial-classic': ['#dc2626', '#facc15', '#16a34a'],
  'rainbow': ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'],
  'solid': ['#dc2626'],
};

function getFlagColors(element: BuntingElement, index: number): string {
  if (element.colorScheme === 'custom' && element.customColors.length > 0) {
    return element.customColors[index % element.customColors.length]!;
  }
  if (element.colorScheme === 'solid' && element.customColors.length > 0) {
    return element.customColors[0]!;
  }
  const palette = COLOR_PALETTES[element.colorScheme] ?? COLOR_PALETTES['arraial-classic']!;
  return palette[index % palette.length]!;
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

/** Approximate arc length of a quadratic bezier */
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

/** Find t at a given arc length */
function bezierTAtArcLength(
  sx: number, sy: number,
  cx: number, cy: number,
  ex: number, ey: number,
  targetLen: number,
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

export const BuntingElementComponent: React.FC<BuntingElementProps> = ({
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

  // Catenary control point: midpoint + downward sag (5% of chord)
  const spanPx = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
  const sagPx = Math.max(2, 0.05 * spanPx);
  const cqx = (sx + ex) / 2;
  const cqy = (sy + ey) / 2 + sagPx;

  const wirePath = `M ${sx} ${sy} Q ${cqx} ${cqy} ${ex} ${ey}`;

  const { w: flagW, h: flagH } = FLAG_DIMS[element.flagSize];
  const spacingPx = flagW * SPACING_MULT[element.spacing];

  // Flag attachment positions — evenly distributed along arc
  const flags = useMemo(() => {
    if (spanPx < flagW) return [];
    const totalLen = bezierArcLength(sx, sy, cqx, cqy, ex, ey);
    const count = Math.max(1, Math.floor(totalLen / spacingPx));
    return Array.from({ length: count + 1 }, (_, i) => {
      const targetLen = (i / count) * totalLen;
      const t = bezierTAtArcLength(sx, sy, cqx, cqy, ex, ey, targetLen);
      return bezierPoint(sx, sy, cqx, cqy, ex, ey, t);
    });
  }, [sx, sy, cqx, cqy, ex, ey, spanPx, spacingPx, flagW]);

  const stringColor = element.stringColor || '#c8b9a2';

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible wide stroke for hit-testing */}
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

      {/* Flags */}
      {flags.map(({ x: tx, y: ty }, i) => {
        const color = getFlagColors(element, i);
        // Slightly darker shade for border/shadow
        const darkColor = color + 'cc';

        const flagPath =
          element.flagShape === 'rectangle'
            ? `M ${tx - flagW / 2} ${ty} L ${tx + flagW / 2} ${ty} L ${tx + flagW / 2} ${ty + flagH} L ${tx - flagW / 2} ${ty + flagH} Z`
            : `M ${tx} ${ty} L ${tx - flagW / 2} ${ty + flagH} L ${tx + flagW / 2} ${ty + flagH} Z`;

        return (
          <g key={i} style={{ pointerEvents: 'none' }}>
            {/* Flag shadow */}
            <path
              d={
                element.flagShape === 'rectangle'
                  ? `M ${tx - flagW / 2 + 1} ${ty + 1} L ${tx + flagW / 2 + 1} ${ty + 1} L ${tx + flagW / 2 + 1} ${ty + flagH + 1} L ${tx - flagW / 2 + 1} ${ty + flagH + 1} Z`
                  : `M ${tx + 1} ${ty + 1} L ${tx - flagW / 2 + 1} ${ty + flagH + 1} L ${tx + flagW / 2 + 1} ${ty + flagH + 1} Z`
              }
              fill="rgba(0,0,0,0.12)"
            />
            {/* Flag body */}
            <path d={flagPath} fill={color} stroke={darkColor} strokeWidth={0.8} />
            {/* Subtle highlight at top */}
            {element.flagShape === 'triangle' && (
              <path
                d={`M ${tx} ${ty} L ${tx - flagW * 0.3} ${ty + flagH * 0.35} L ${tx + flagW * 0.3} ${ty + flagH * 0.35} Z`}
                fill="white"
                opacity={0.12}
              />
            )}
            {element.flagShape === 'rectangle' && (
              <rect
                x={tx - flagW / 2 + 1}
                y={ty + 1}
                width={flagW - 2}
                height={flagH * 0.3}
                fill="white"
                opacity={0.12}
              />
            )}
          </g>
        );
      })}

      {/* String / rope (on top of flags) */}
      <path
        d={wirePath}
        stroke={stringColor}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />

      {/* Selection dashed outline */}
      {isSelected && (
        <path
          d={wirePath}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6,4"
          fill="none"
          opacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Anchor handles */}
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

export default BuntingElementComponent;
