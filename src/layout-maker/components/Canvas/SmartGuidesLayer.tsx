/**
 * Smart Guides Layer Component
 *
 * Renders snap guides and alignment guides during drag operations:
 * - Vertical guides (left, center, right alignment)
 * - Horizontal guides (top, center, bottom alignment)
 * - Color-coded by snap type (grid, edge, center, wall)
 */

import React from 'react';
import type { SnapGuide } from '../../hooks/useSnapGuides';

interface SmartGuidesLayerProps {
  guides?: SnapGuide[];
  canvasBounds?: { x: number; y: number; width: number; height: number };
  showGuides?: boolean;
}

const SNAP_COLORS: Record<SnapGuide['snapType'], string> = {
  grid: '#22c55e',
  edge: '#3b82f6',
  center: '#f97316',
  wall: '#8b5cf6',
};

export const SmartGuidesLayer: React.FC<SmartGuidesLayerProps> = ({
  guides = [],
  canvasBounds,
  showGuides = true,
}) => {
  if (!showGuides || guides.length === 0) {
    return null;
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
    <g className="smart-guides-layer">
      <defs>
        <linearGradient id="guideGradientV" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0} />
          <stop offset="50%" stopColor="currentColor" stopOpacity={1} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="guideGradientH" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0} />
          <stop offset="50%" stopColor="currentColor" stopOpacity={1} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      {verticalGuides.map((guide, index) => (
        <g key={`v-${index}`}>
          <line
            x1={guide.position}
            y1={bounds.y}
            x2={guide.position}
            y2={bounds.y + bounds.height}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={1}
            strokeDasharray="8,4"
            opacity={0.9}
          />
          <line
            x1={guide.position}
            y1={bounds.y + 20}
            x2={guide.position}
            y2={bounds.y + bounds.height - 20}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={2}
            opacity={0.4}
          />
        </g>
      ))}

      {horizontalGuides.map((guide, index) => (
        <g key={`h-${index}`}>
          <line
            x1={bounds.x}
            y1={guide.position}
            x2={bounds.x + bounds.width}
            y2={guide.position}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={1}
            strokeDasharray="8,4"
            opacity={0.9}
          />
          <line
            x1={bounds.x + 20}
            y1={guide.position}
            x2={bounds.x + bounds.width - 20}
            y2={guide.position}
            stroke={SNAP_COLORS[guide.snapType]}
            strokeWidth={2}
            opacity={0.4}
          />
        </g>
      ))}

      {verticalGuides.map((vGuide) =>
        horizontalGuides.map((hGuide) => (
          <g key={`intersect-${vGuide.position}-${hGuide.position}`}>
            <circle
              cx={vGuide.position}
              cy={hGuide.position}
              r={6}
              fill="white"
              stroke={SNAP_COLORS[vGuide.snapType]}
              strokeWidth={2}
              opacity={0.95}
            />
            <circle
              cx={vGuide.position}
              cy={hGuide.position}
              r={3}
              fill={SNAP_COLORS[vGuide.snapType]}
            />
          </g>
        ))
      )}

      <g className="guide-legend" transform={`translate(${bounds.x + 10}, ${bounds.y + bounds.height - 60})`}>
        <rect width="100" height="50" rx="4" fill="white" fillOpacity={0.9} stroke="#e5e7eb" />
        <circle cx="15" cy="15" r={4} fill={SNAP_COLORS.edge} />
        <text x="25" y={18} fontSize={10} fill="#374151">Edges</text>
        <circle cx="15" cy={35} r={4} fill={SNAP_COLORS.center} />
        <text x="25" y={38} fontSize={10} fill="#374151">Centers</text>
        <line x1="60" y1={15} x2="85" y2={15} stroke={SNAP_COLORS.grid} strokeWidth={1} strokeDasharray="4,2" />
        <text x={60} y={28} fontSize={9} fill="#6b7280">Grid</text>
      </g>
    </g>
  );
};

export default SmartGuidesLayer;
