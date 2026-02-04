/**
 * Distance Indicators Component
 *
 * Shows distance labels between selected element and nearby elements.
 * Only visible when an element is selected.
 */

import React, { useMemo } from 'react';
import type { BaseElement } from '../../types/elements';

interface DistanceIndicatorsProps {
  selectedElement: BaseElement | null;
  nearbyElements: BaseElement[];
  canvasBounds?: { x: number; y: number; width: number; height: number };
  pixelsPerMeter: number;
}

export const DistanceIndicators: React.FC<DistanceIndicatorsProps> = ({
  selectedElement,
  nearbyElements,
  canvasBounds,
  pixelsPerMeter,
}) => {
  const distances = useMemo(() => {
    if (!selectedElement) return [];

    const results: Array<{
      id: string;
      x: number;
      y: number;
      distance: number;
      unit: string;
      orientation: 'horizontal' | 'vertical';
    }> = [];

    const selLeft = selectedElement.x;
    const selRight = selectedElement.x + selectedElement.width;
    const selTop = selectedElement.y;
    const selBottom = selectedElement.y + selectedElement.height;
    const selCenterX = selectedElement.x + selectedElement.width / 2;
    const selCenterY = selectedElement.y + selectedElement.height / 2;

    nearbyElements.forEach((other) => {
      if (other.id === selectedElement.id) return;

      const otherLeft = other.x;
      const otherRight = other.x + other.width;
      const otherTop = other.y;
      const otherBottom = other.y + other.height;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;

      const horizontalDistance = Math.min(
        Math.abs(selLeft - otherRight),
        Math.abs(selRight - otherLeft),
        Math.abs(selCenterX - otherCenterX)
      );

      const verticalDistance = Math.min(
        Math.abs(selTop - otherBottom),
        Math.abs(selBottom - otherTop),
        Math.abs(selCenterY - otherCenterY)
      );

      const threshold = 2;

      if (horizontalDistance < threshold && horizontalDistance > 0) {
        const y = (Math.max(selTop, otherTop) + Math.min(selBottom, otherBottom)) / 2;
        const x = Math.min(selRight, otherRight) + horizontalDistance / 2;
        results.push({
          id: `h-${other.id}`,
          x: x * pixelsPerMeter,
          y: y * pixelsPerMeter,
          distance: horizontalDistance,
          unit: 'm',
          orientation: 'horizontal',
        });
      }

      if (verticalDistance < threshold && verticalDistance > 0) {
        const x = (Math.max(selLeft, otherLeft) + Math.min(selRight, otherRight)) / 2;
        const y = Math.min(selBottom, otherBottom) + verticalDistance / 2;
        results.push({
          id: `v-${other.id}`,
          x: x * pixelsPerMeter,
          y: y * pixelsPerMeter,
          distance: verticalDistance,
          unit: 'm',
          orientation: 'vertical',
        });
      }
    });

    return results;
  }, [selectedElement, nearbyElements, pixelsPerMeter]);

  if (!selectedElement || distances.length === 0) {
    return null;
  }

  const formatDistance = (meters: number): string => {
    if (meters < 1) {
      return `${Math.round(meters * 100)} cm`;
    }
    return `${meters.toFixed(2)} m`;
  };

  return (
    <g className="distance-indicators">
      {distances.map((dist) => (
        <g key={dist.id}>
          <rect
            x={dist.x * pixelsPerMeter - 24}
            y={dist.y * pixelsPerMeter - 10}
            width={48}
            height={20}
            rx={4}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            opacity={0.95}
          />
          <text
            x={dist.x * pixelsPerMeter}
            y={dist.y * pixelsPerMeter + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={500}
            fill="#3b82f6"
          >
            {formatDistance(dist.distance)}
          </text>
          {dist.orientation === 'horizontal' && (
            <>
              <line
                x1={(dist.x - 0.2) * pixelsPerMeter}
                y1={dist.y * pixelsPerMeter}
                x2={(dist.x + 0.2) * pixelsPerMeter}
                y2={dist.y * pixelsPerMeter}
                stroke="#3b82f6"
                strokeWidth={1}
              />
            </>
          )}
        </g>
      ))}
    </g>
  );
};

export default DistanceIndicators;
