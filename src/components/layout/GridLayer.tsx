/**
 * Grid Layer
 *
 * Renders a grid overlay on the canvas for alignment assistance.
 */

import { useMemo } from 'react';
import { useLayoutScale } from '../../contexts/LayoutScaleContext';

/**
 * Grid Layer Component
 *
 * Displays grid lines aligned with meter marks.
 * Adjusts grid density based on zoom level for optimal visibility.
 */
export function GridLayer(): JSX.Element | null {
  const { scale, gridConfig } = useLayoutScale();

  const gridLines = useMemo(() => {
    if (!scale || !gridConfig.visible) {
      return null;
    }

    const { spaceBounds, pixelsPerMeter, offset } = scale;
    const lines: JSX.Element[] = [];

    // Determine grid interval based on zoom level
    // Show finer grid when zoomed in, coarser when zoomed out
    let interval = gridConfig.size;
    if (pixelsPerMeter > 100) {
      interval = 0.1; // 10cm when zoomed in
    } else if (pixelsPerMeter < 30) {
      interval = 1; // 1m when zoomed out
    }

    // Calculate canvas dimensions
    const canvasWidth = spaceBounds.width * pixelsPerMeter;
    const canvasHeight = spaceBounds.height * pixelsPerMeter;

    // Vertical lines
    for (let x = 0; x <= spaceBounds.width + interval; x += interval) {
      if (x > spaceBounds.width) break;

      const canvasX = x * pixelsPerMeter + offset.x;
      const isMajor = Math.abs(x % 1) < 0.001; // Major line every meter

      lines.push(
        <line
          key={`v-${x.toFixed(3)}`}
          x1={canvasX}
          y1={offset.y}
          x2={canvasX}
          y2={offset.y + canvasHeight}
          stroke={isMajor ? '#d1d5db' : '#e5e7eb'}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= spaceBounds.height + interval; y += interval) {
      if (y > spaceBounds.height) break;

      const canvasY = y * pixelsPerMeter + offset.y;
      const isMajor = Math.abs(y % 1) < 0.001;

      lines.push(
        <line
          key={`h-${y.toFixed(3)}`}
          x1={offset.x}
          y1={canvasY}
          x2={offset.x + canvasWidth}
          y2={canvasY}
          stroke={isMajor ? '#d1d5db' : '#e5e7eb'}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }

    return lines;
  }, [scale, gridConfig]);

  if (!gridLines) {
    return null;
  }

  return (
    <svg className="absolute inset-0 pointer-events-none">
      {gridLines}
    </svg>
  );
}

export default GridLayer;
