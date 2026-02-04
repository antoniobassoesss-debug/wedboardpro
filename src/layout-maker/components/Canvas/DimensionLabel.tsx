/**
 * Dimension Label Component
 *
 * Shows element dimensions on the canvas:
 * - Tables: "180 × 90 cm" or "Ø1.5m"
 * - Rectangular/oval elements: width × height
 * - Circular elements: diameter symbol
 */

import React from 'react';
import type { TableType } from '../../../types/layout-elements';

interface DimensionLabelProps {
  width: number;
  height: number;
  unit: 'cm' | 'm';
  tableType?: TableType;
  position?: 'above' | 'below';
  isSelected?: boolean;
}

export const DimensionLabel: React.FC<DimensionLabelProps> = ({
  width,
  height,
  unit,
  tableType,
  position = 'below',
  isSelected = false,
}) => {
  const formatDimension = (value: number): string => {
    if (unit === 'm') {
      return value < 1 ? `${Math.round(value * 100)}` : value.toFixed(2);
    }
    return Math.round(value).toString();
  };

  const formatDimensions = (): string => {
    const w = formatDimension(width);
    const h = formatDimension(height);

    if (tableType === 'table-round') {
      return `Ø${formatDimension(width)}${unit}`;
    }

    if (tableType === 'table-oval') {
      return `Ø${formatDimension(width)}×${formatDimension(height)}${unit}`;
    }

    if (tableType === 'table-rectangular') {
      return `${w} × ${h} ${unit}`;
    }

    return `${w} × ${h} ${unit}`;
  };

  const label = formatDimensions();

  return (
    <g className="dimension-label">
      <rect
        x={-24}
        y={position === 'above' ? -18 : 6}
        width={label.length * 7 + 16}
        height={16}
        rx={4}
        fill="white"
        fillOpacity={isSelected ? 0.95 : 0.85}
        stroke={isSelected ? '#3b82f6' : '#d4d4d4'}
        strokeWidth={isSelected ? 1 : 0.5}
      />
      <text
        x={4}
        y={position === 'above' ? -6 : 18}
        fontSize={10}
        fontWeight={500}
        fill={isSelected ? '#3b82f6' : '#6b7280'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  );
};

export default DimensionLabel;
