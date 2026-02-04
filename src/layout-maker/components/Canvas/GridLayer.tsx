/**
 * Grid Layer Component
 *
 * Renders an efficient grid using SVG patterns.
 * Uses pattern-based rendering for optimal performance.
 */

import React, { useMemo } from 'react';
import type { ViewportState } from '../../types/viewport';
import { GRID_COLOR, GRID_MAJOR_COLOR } from '../../constants';

interface GridLayerProps {
  viewport: ViewportState;
  pixelsPerMeter: number;
  gridSize?: number;
  showMajorEvery?: number;
}

export const GridLayer: React.FC<GridLayerProps> = ({
  viewport,
  pixelsPerMeter,
  gridSize = 0.5,
  showMajorEvery = 5,
}) => {
  const { width, height, zoom } = viewport;

  if (!width || !height || gridSize <= 0) {
    return null;
  }

  const scale = pixelsPerMeter * zoom;
  const cellSize = gridSize * scale;
  const majorSize = cellSize * showMajorEvery;

  const bounds = {
    minX: viewport.x * zoom,
    minY: viewport.y * zoom,
    maxX: (viewport.x + width / zoom) * zoom,
    maxY: (viewport.y + height / zoom) * zoom,
  };

  const patternId = `grid-pattern-${gridSize}-${zoom}`;
  const majorPatternId = `grid-major-pattern-${gridSize}-${zoom}`;

  const startMajorX = Math.floor(bounds.minX / majorSize) * majorSize;
  const endMajorX = Math.ceil(bounds.maxX / majorSize) * majorSize;
  const startMajorY = Math.floor(bounds.minY / majorSize) * majorSize;
  const endMajorY = Math.ceil(bounds.maxY / majorSize) * majorSize;

  const majorRects: React.ReactNode[] = [];
  const minorRects: React.ReactNode[] = [];

  for (let mx = startMajorX; mx <= endMajorX; mx += majorSize) {
    for (let my = startMajorY; my <= endMajorY; my += majorSize) {
      const x = mx / zoom;
      const y = my / zoom;
      const w = majorSize / zoom;
      const h = majorSize / zoom;

      majorRects.push(
        <rect
          key={`major-${mx}-${my}`}
          x={x}
          y={y}
          width={w}
          height={h}
          fill={`url(#${patternId})`}
        />
      );

      const startMinorX = mx;
      const startMinorY = my;
      for (let sx = startMinorX; sx < mx + majorSize; sx += cellSize) {
        for (let sy = startMinorY; sy < my + majorSize; sy += cellSize) {
          const nx = sx / zoom;
          const ny = sy / zoom;

          if (sx === mx && sy === my) continue;

          minorRects.push(
            <rect
              key={`minor-${sx}-${sy}`}
              x={nx}
              y={ny}
              width={cellSize / zoom}
              height={cellSize / zoom}
              fill={`url(#${patternId})`}
            />
          );
        }
      }
    }
  }

  return (
    <g id="grid-layer">
      <defs>
        <pattern
          id={patternId}
          width={cellSize / zoom}
          height={cellSize / zoom}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize / zoom} 0 L 0 0 0 ${cellSize / zoom}`}
            fill="none"
            stroke={GRID_COLOR}
            strokeWidth={0.5 / zoom}
          />
        </pattern>
      </defs>
      {minorRects}
      {majorRects}
    </g>
  );
};

export default GridLayer;
