/**
 * Position Tooltip Component
 *
 * Displays real-world coordinates during drag operations.
 */

import type { Point } from '../../types/layout-scale';
import { useLayoutScale } from '../../contexts/LayoutScaleContext';

/**
 * Props for PositionTooltip
 */
export interface PositionTooltipProps {
  /** Real-world position in meters */
  position: Point;
  /** Whether the tooltip should be visible */
  visible: boolean;
  /** Offset from cursor position */
  offset?: { x: number; y: number };
}

/**
 * Position Tooltip Component
 *
 * Shows the current position in meters during element dragging.
 */
export function PositionTooltip({
  position,
  visible,
  offset = { x: 15, y: -30 },
}: PositionTooltipProps): JSX.Element | null {
  const { scale } = useLayoutScale();

  if (!visible || !scale) {
    return null;
  }

  const canvasPos = scale.realToCanvas(position);

  return (
    <div
      className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-50 whitespace-nowrap shadow-lg"
      style={{
        left: canvasPos.x + offset.x,
        top: canvasPos.y + offset.y,
      }}
    >
      <span className="font-mono">
        {position.x.toFixed(2)}m, {position.y.toFixed(2)}m
      </span>
    </div>
  );
}

export default PositionTooltip;
