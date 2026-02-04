/**
 * Background Layer Component
 *
 * Renders the imported floor plan image as a reference layer.
 * Supports positioning, scaling, opacity, and rotation.
 */

import React, { useMemo } from 'react';
import type { FloorPlanBackground } from '../../types/layout';

interface BackgroundLayerProps {
  floorPlan: FloorPlanBackground | null;
  pixelsPerMeter: number;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  floorPlan,
  pixelsPerMeter,
}) => {
  if (!floorPlan) {
    return null;
  }

  if (!floorPlan.visible) {
    return null;
  }

  const { imageUrl, x, y, width, height, opacity = 1, rotation = 0 } = floorPlan;

  if (!imageUrl) {
    return null;
  }

  const screenX = x * pixelsPerMeter;
  const screenY = y * pixelsPerMeter;
  const screenWidth = width * pixelsPerMeter;
  const screenHeight = height * pixelsPerMeter;

  const centerX = screenX + screenWidth / 2;
  const centerY = screenY + screenHeight / 2;

  const transform = useMemo(() => {
    if (rotation === 0) {
      return undefined;
    }
    return `rotate(${rotation}, ${centerX}, ${centerY})`;
  }, [rotation, centerX, centerY]);

  return (
    <g id="background-layer" style={{ pointerEvents: 'none' }}>
      <image
        href={imageUrl}
        x={screenX}
        y={screenY}
        width={screenWidth}
        height={screenHeight}
        opacity={opacity}
        preserveAspectRatio="none"
        transform={transform}
        style={{
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      {rotation !== 0 && (
        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          <rect
            x={screenX}
            y={screenY}
            width={screenWidth}
            height={screenHeight}
            fill="none"
            stroke="#0066FF"
            strokeWidth={1 / pixelsPerMeter}
            strokeDasharray="0.5, 0.5"
            opacity={0.5}
          />
        </g>
      )}
    </g>
  );
};

export default BackgroundLayer;
