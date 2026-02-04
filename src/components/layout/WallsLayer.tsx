/**
 * Walls Layer
 *
 * Renders walls on the canvas using the scale system.
 */

import { useLayoutScale } from '../../contexts/LayoutScaleContext';
import type { Point } from '../../types/layout-scale';

/**
 * Wall interface for rendering
 */
export interface WallData {
  id?: string;
  start: Point;
  end: Point;
  thickness?: number;
  color?: string;
}

/**
 * Props for WallsLayer
 */
export interface WallsLayerProps {
  walls: WallData[];
}

/**
 * Walls Layer Component
 *
 * Renders walls at correct proportional positions using scale.
 */
export function WallsLayer({ walls }: WallsLayerProps): JSX.Element | null {
  const { scale } = useLayoutScale();

  if (!scale) {
    return null;
  }

  return (
    <svg className="absolute inset-0 pointer-events-none">
      {walls.map((wall, index) => {
        // Convert wall coordinates to canvas
        const start = scale.realToCanvas(wall.start);
        const end = scale.realToCanvas(wall.end);

        // Calculate stroke width based on thickness
        const strokeWidth = Math.max(
          2,
          scale.metersToPixels(wall.thickness ?? 0.2)
        );

        return (
          <line
            key={wall.id ?? `wall-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={wall.color ?? '#374151'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default WallsLayer;
