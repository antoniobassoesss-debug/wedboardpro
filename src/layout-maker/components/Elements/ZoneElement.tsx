/**
 * Zone Element Component
 *
 * Renders zone elements (dance floor, stage, ceremony area, etc.)
 * - Semi-transparent fill to see grid through
 * - Configurable border style (solid, dashed, dotted)
 * - Label in center
 */

import React from 'react';
import type { ZoneElement } from '../../types/elements';
import { getZoneColor, HOVER_COLOR, SELECTION_COLOR } from '../../constants';

interface ZoneElementProps {
  element: ZoneElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const ZoneRender: React.FC<ZoneElementProps> = ({
  element,
  pixelsPerMeter,
  isSelected = false,
  isHovered = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const colors = element.fillColor
    ? { fill: element.fillColor, stroke: element.borderColor || '#333333', opacity: 0.3 }
    : getZoneColor(element.type);

  const strokeDasharray = (() => {
    switch (element.borderStyle) {
      case 'dashed':
        return '8,4';
      case 'dotted':
        return '2,2';
      default:
        return 'none';
    }
  })();

  const x = element.x * pixelsPerMeter;
  const y = element.y * pixelsPerMeter;
  const width = element.width * pixelsPerMeter;
  const height = element.height * pixelsPerMeter;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const renderOutline = () => {
    if (!isSelected && !isHovered) return null;

    const strokeColor = isSelected ? SELECTION_COLOR : HOVER_COLOR;
    const dashArray = isSelected ? '4,4,4' : '8,4';

    return (
      <rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={height + 4}
        rx={6}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={dashArray}
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  return (
    <g
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: 'pointer' }}
    >
      {renderOutline()}

      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors.fill}
        fillOpacity={colors.opacity}
        stroke={colors.stroke}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        rx={4}
      />

      {element.label && (
        <>
          <text
            x={x + 12}
            y={y + 20}
            fill={colors.stroke}
            fontSize={12}
            fontWeight={500}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {element.label}
          </text>
          {element.estimatedCapacity && (
            <text
              x={x + 12}
              y={y + 36}
              fill={colors.stroke}
              fontSize={10}
              opacity={0.7}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              ~{element.estimatedCapacity} guests
            </text>
          )}
        </>
      )}
    </g>
  );
};

export type { ZoneElementProps };
