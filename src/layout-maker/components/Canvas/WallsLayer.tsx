/**
 * Walls Layer Component
 *
 * Renders venue walls from layout.space.walls array.
 * Walls define the venue boundary and are rendered behind elements.
 */

import React, { useMemo } from 'react';
import type { Wall } from '../../types/layout';
import type { ViewportBounds } from '../../types/viewport';
import { WALL_COLOR } from '../../constants';

interface WallsLayerProps {
  walls: Wall[];
  pixelsPerMeter: number;
}

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

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

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
