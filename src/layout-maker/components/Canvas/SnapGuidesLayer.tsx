/**
 * SnapGuidesLayer Component
 *
 * Renders visual snap guides during drag operations:
 * - Vertical guides (left, center, right alignment)
 * - Horizontal guides (top, center, bottom alignment)
 * - Highlighted when elements align
 */

import React from 'react';

interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  elementIds: string[];
}

interface SnapGuidesLayerProps {
  snapGuides: SnapGuide[];
  canvasBounds?: { x: number; y: number; width: number; height: number };
}

export const SnapGuidesLayer: React.FC<SnapGuidesLayerProps> = ({
  snapGuides,
  canvasBounds,
}) => {
  if (snapGuides.length === 0) {
    return null;
  }

  // Group guides by type and position to avoid duplicates
  const verticalGuides = snapGuides
    .filter((g: SnapGuide) => g.type === 'vertical')
    .reduce((acc: SnapGuide[], guide) => {
      const existing = acc.find(g => Math.abs(g.position - guide.position) < 1);
      if (!existing) {
        acc.push(guide);
      }
      return acc;
    }, []);

  const horizontalGuides = snapGuides
    .filter((g: SnapGuide) => g.type === 'horizontal')
    .reduce((acc: SnapGuide[], guide) => {
      const existing = acc.find(g => Math.abs(g.position - guide.position) < 1);
      if (!existing) {
        acc.push(guide);
      }
      return acc;
    }, []);

  return (
    <g className="snap-guides-layer">
      {/* Vertical snap guides */}
      {verticalGuides.map((guide: SnapGuide, index: number) => (
        <line
          key={`v-${index}`}
          x1={guide.position}
          y1={canvasBounds?.y || -1000}
          x2={guide.position}
          y2={(canvasBounds?.y || 0) + (canvasBounds?.height || 2000)}
          stroke="#0066FF"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.8}
        />
      ))}

      {/* Horizontal snap guides */}
      {horizontalGuides.map((guide: SnapGuide, index: number) => (
        <line
          key={`h-${index}`}
          x1={canvasBounds?.x || -1000}
          y1={guide.position}
          x2={(canvasBounds?.x || 0) + (canvasBounds?.width || 2000)}
          y2={guide.position}
          stroke="#0066FF"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.8}
        />
      ))}

      {/* Snap indicator at intersection points */}
      {snapGuides.slice(0, 10).map((guide: SnapGuide, index: number) => {
        const matchingVertical = verticalGuides.find((v: SnapGuide) =>
          Math.abs(v.position - guide.position) < 1 && guide.type === 'horizontal'
        );
        const matchingHorizontal = horizontalGuides.find((h: SnapGuide) =>
          Math.abs(h.position - guide.position) < 1 && guide.type === 'vertical'
        );

        if (matchingVertical && matchingHorizontal) {
          return (
            <circle
              key={`intersection-${index}`}
              cx={matchingVertical.position}
              cy={matchingHorizontal.position}
              r={6}
              fill="#0066FF"
              opacity={0.3}
            />
          );
        }
        return null;
      })}
    </g>
  );
};

export default SnapGuidesLayer;
