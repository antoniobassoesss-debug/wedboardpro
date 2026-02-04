/**
 * Seat Count Badge Component
 *
 * Shows seat count below table elements.
 * Displays as a small pill with seat number.
 */

import React from 'react';

interface SeatCountBadgeProps {
  count: number;
  position?: 'below' | 'inside';
  isSelected?: boolean;
}

export const SeatCountBadge: React.FC<SeatCountBadgeProps> = ({
  count,
  position = 'below',
  isSelected = false,
}) => {
  if (count === 0) return null;

  return (
    <g className="seat-count-badge">
      <rect
        x={-12}
        y={position === 'below' ? 28 : -8}
        width={28}
        height={16}
        rx={8}
        fill={isSelected ? '#3b82f6' : '#1a1a1a'}
        fillOpacity={isSelected ? 0.1 : 0.05}
        stroke={isSelected ? '#3b82f6' : '#1a1a1a'}
        strokeWidth={0.5}
      />
      <text
        x={2}
        y={position === 'below' ? 40 : 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={500}
        fill={isSelected ? '#3b82f6' : '#6b7280'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {count}
      </text>
    </g>
  );
};

export default SeatCountBadge;
