/**
 * Scale Bar Component
 *
 * Fixed-position scale indicator showing a visual representation of the current zoom level.
 * Displays a bar representing a round measurement (1m, 2m, 5m, 10m).
 */

import React, { useMemo } from 'react';
import type { ViewportState } from '../../types/viewport';
import { DEFAULT_PIXELS_PER_METER, WALL_COLOR } from '../../constants';

interface ScaleBarProps {
  viewport: ViewportState;
  pixelsPerMeter?: number;
  className?: string;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  viewport,
  pixelsPerMeter = DEFAULT_PIXELS_PER_METER,
  className = '',
}) => {
  const { zoom } = viewport;

  const { length, label } = useMemo(() => {
    const basePixelsPerMeter = pixelsPerMeter * zoom;

    const intervals = [
      { length: 1, label: '1m' },
      { length: 2, label: '2m' },
      { length: 5, label: '5m' },
      { length: 10, label: '10m' },
      { length: 20, label: '20m' },
      { length: 50, label: '50m' },
      { length: 100, label: '100m' },
    ];

    let best = intervals[0]!;
    let bestScreenPixels = best.length * basePixelsPerMeter;

    for (let i = 1; i < intervals.length; i++) {
      const interval = intervals[i];
      if (!interval) continue;
      const screenPixels = interval.length * basePixelsPerMeter;
      if (screenPixels >= 80 && screenPixels <= 200) {
        return { length: interval.length, label: interval.label };
      }
      if (Math.abs(screenPixels - 120) < Math.abs(bestScreenPixels - 120)) {
        best = interval;
        bestScreenPixels = screenPixels;
      }
    }

    return { length: best.length, label: best.label };
  }, [pixelsPerMeter, zoom]);

  const barWidth = length * pixelsPerMeter * zoom;

  return (
    <div
      className={`absolute bottom-4 left-4 flex items-center bg-white rounded-md shadow-sm border border-gray-200 px-3 py-1.5 ${className}`}
      style={{ pointerEvents: 'none' }}
    >
      <svg
        width={barWidth}
        height={16}
        className="overflow-visible"
        style={{ minWidth: barWidth }}
      >
        <line
          x1={0}
          y1={8}
          x2={barWidth}
          y2={8}
          stroke={WALL_COLOR}
          strokeWidth={1.5}
        />
        <line
          x1={0}
          y1={4}
          x2={0}
          y2={12}
          stroke={WALL_COLOR}
          strokeWidth={1.5}
        />
        <line
          x1={barWidth / 2}
          y1={6}
          x2={barWidth / 2}
          y2={10}
          stroke={WALL_COLOR}
          strokeWidth={1}
        />
        <line
          x1={barWidth}
          y1={4}
          x2={barWidth}
          y2={12}
          stroke={WALL_COLOR}
          strokeWidth={1.5}
        />
      </svg>
      <span className="ml-2 text-xs font-medium text-gray-600 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

export default ScaleBar;
