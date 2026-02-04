/**
 * Guides Layer Component
 *
 * Renders snap guides and alignment guides during drag operations:
 * - Vertical guides (left, center, right alignment)
 * - Horizontal guides (top, center, bottom alignment)
 * - Color-coded by snap type (grid, edge, center, wall)
 */

import React from 'react';
import type { SnapGuide } from '../../hooks/useSnapGuides';

interface GuidesLayerProps {
  guides?: SnapGuide[];
  canvasBounds?: { x: number; y: number; width: number; height: number };
}

const SNAP_COLORS: Record<SnapGuide['snapType'], string> = {
  grid: '#00CC66',
  edge: '#0066FF',
  center: '#FF6600',
  wall: '#9933FF',
};

export const GuidesLayer: React.FC<GuidesLayerProps> = ({
  guides = [],
  canvasBounds,
}) => {
  if (guides.length === 0) {
    return (
      <g id="guides-layer">
        {/* Empty state - no guides to render */}
      </g>
    );
  }

  const bounds = canvasBounds || { x: -1000, y: -1000, width: 4000, height: 4000 };

  const verticalGuides = guides
    .filter((g) => g.type === 'vertical')
    .reduce((acc: SnapGuide[], guide) => {
      const existing = acc.find((g) => Math.abs(g.position - guide.position) < 0.01);
      if (!existing) {
        acc.push(guide);
      }
      return acc;
    }, []);

  const horizontalGuides = guides
    .filter((g) => g.type === 'horizontal')
    .reduce((acc: SnapGuide[], guide) => {
      const existing = acc.find((g) => Math.abs(g.position - guide.position) < 0.01);
      if (!existing) {
        acc.push(guide);
      }
      return acc;
    }, []);

  return (
    <g id="guides-layer">
      {/* Vertical snap guides */}
      {verticalGuides.map((guide, index) => (
        <g key={`v-${index}`}>
          <line
            x1={guide.position}
            y1={bounds.y}
            x2={guide.position}
            y2={bounds.y + bounds.height}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.9}
          />
          {/* Snap point indicator */}
          <circle
            cx={guide.position}
            cy={bounds.y + bounds.height / 2}
            r={4}
            fill={SNAP_COLORS[guide.snapType]}
            opacity={0.6}
          />
        </g>
      ))}

      {/* Horizontal snap guides */}
      {horizontalGuides.map((guide, index) => (
        <g key={`h-${index}`}>
          <line
            x1={bounds.x}
            y1={guide.position}
            x2={bounds.x + bounds.width}
            y2={guide.position}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.9}
          />
          {/* Snap point indicator */}
          <circle
            cx={bounds.x + bounds.width / 2}
            cy={guide.position}
            r={4}
            fill={SNAP_COLORS[guide.snapType]}
            opacity={0.6}
          />
        </g>
      ))}

      {/* Snap indicator at intersection points */}
      {verticalGuides.map((vGuide) =>
        horizontalGuides.map((hGuide, hIndex) => (
          <circle
            key={`intersection-${vGuide.position}-${hGuide.position}`}
            cx={vGuide.position}
            cy={hGuide.position}
            r={5}
            fill="white"
            stroke={SNAP_COLORS[vGuide.snapType]}
            strokeWidth={2}
            opacity={0.9}
          />
        ))
      )}
    </g>
  );
};

export default GuidesLayer;
