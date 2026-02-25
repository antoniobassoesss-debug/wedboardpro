/**
 * Walls Layer Component
 *
 * Renders venue walls from layout.space.walls array.
 * Walls define the venue boundary and are rendered behind elements.
 */

import React from 'react';
import type { Wall } from '../../types/layout';
import type { ViewportBounds } from '../../types/viewport';
import { WALL_COLOR } from '../../constants';

interface WallsLayerProps {
  walls: Wall[];
  pixelsPerMeter: number;
}

// Generate SVG path for a curved wall in pixel coordinates
const generateWallPathPx = (
  x1: number, y1: number,
  x2: number, y2: number,
  wall: Wall,
  pixelsPerMeter: number,
): string => {
  const curve = wall.curve;
  if (!curve) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (curve.type === 'bezier') {
    const cpx = curve.point.x * pixelsPerMeter;
    const cpy = curve.point.y * pixelsPerMeter;
    return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
  }
  if (curve.type === 'arc') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radius = Math.sqrt(dx * dx + dy * dy) / 2;
    const sweepFlag = curve.direction === 1 ? 0 : 1;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweepFlag} ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${x2} ${y2}`;
};

export const WallsLayer: React.FC<WallsLayerProps> = ({
  walls,
  pixelsPerMeter,
}) => {
  if (!walls || walls.length === 0) {
    return null;
  }

  const wallElements = walls.map((wall) => {
    const x1 = wall.startX * pixelsPerMeter;
    const y1 = wall.startY * pixelsPerMeter;
    const x2 = wall.endX * pixelsPerMeter;
    const y2 = wall.endY * pixelsPerMeter;
    const thickness = (wall.thickness || 0.1) * pixelsPerMeter;

    // Curved walls render as path with stroke
    if (wall.curve) {
      const pathD = generateWallPathPx(x1, y1, x2, y2, wall, pixelsPerMeter);
      return (
        <g key={wall.id}>
          <path
            d={pathD}
            fill="none"
            stroke={wall.color || WALL_COLOR}
            strokeWidth={thickness}
            strokeLinecap="round"
          />
        </g>
      );
    }

    // Straight walls use rect (existing behavior)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return (
      <g key={wall.id}>
        <rect
          x={0}
          y={-thickness / 2}
          width={length}
          height={thickness}
          fill={wall.color || WALL_COLOR}
          transform={`translate(${x1}, ${y1}) rotate(${angle})`}
        />
      </g>
    );
  });

  return <g id="walls-layer">{wallElements}</g>;
};

export function getWallsBounds(walls: Wall[]): ViewportBounds | null {
  if (!walls || walls.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasValidWall = false;

  for (const wall of walls) {
    if (
      wall.startX === undefined ||
      wall.startY === undefined ||
      wall.endX === undefined ||
      wall.endY === undefined
    ) {
      continue;
    }

    hasValidWall = true;
    minX = Math.min(minX, wall.startX, wall.endX);
    minY = Math.min(minY, wall.startY, wall.endY);
    maxX = Math.max(maxX, wall.startX, wall.endX);
    maxY = Math.max(maxY, wall.startY, wall.endY);

    // Account for curve apex extending beyond endpoints
    if (wall.curve) {
      const midX = (wall.startX + wall.endX) / 2;
      const midY = (wall.startY + wall.endY) / 2;

      if (wall.curve.type === 'bezier') {
        // Bezier apex at t=0.5
        const apexX = 0.25 * wall.startX + 0.5 * wall.curve.point.x + 0.25 * wall.endX;
        const apexY = 0.25 * wall.startY + 0.5 * wall.curve.point.y + 0.25 * wall.endY;
        minX = Math.min(minX, apexX);
        minY = Math.min(minY, apexY);
        maxX = Math.max(maxX, apexX);
        maxY = Math.max(maxY, apexY);
      } else if (wall.curve.type === 'arc') {
        const dx = wall.endX - wall.startX;
        const dy = wall.endY - wall.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const radius = length / 2;
        const perpX = (-dy / length) * wall.curve.direction;
        const perpY = (dx / length) * wall.curve.direction;
        const apexX = midX + radius * perpX;
        const apexY = midY + radius * perpY;
        minX = Math.min(minX, apexX);
        minY = Math.min(minY, apexY);
        maxX = Math.max(maxX, apexX);
        maxY = Math.max(maxY, apexY);
      }
    }
  }

  if (!hasValidWall) {
    return null;
  }

  const padding = 1;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

export default WallsLayer;
