/**
 * Zone Element Component
 *
 * Renders a zone element (dance floor, stage, etc.) on the canvas.
 */

import React from 'react';
import type { ZoneElement } from '../../types/elements';
import { getZoneColor } from '../../constants';

interface ZoneElementProps {
  element: ZoneElement;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const ZoneElementComponent: React.FC<ZoneElementProps> = ({
  element,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const colors = getZoneColor(element.type);
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;

  const strokeDasharray =
    element.borderStyle === 'dashed'
      ? '8,4'
      : element.borderStyle === 'dotted'
      ? '2,2'
      : 'none';

  return (
    <g
      transform={`rotate(${element.rotation}, ${centerX}, ${centerY})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.fillColor || colors.fill}
        fillOpacity={colors.opacity}
        stroke={element.borderColor || colors.stroke}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        rx={4}
      />
      <text
        x={element.x + 8}
        y={element.y + 20}
        fill={colors.stroke}
        fontSize={12}
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {element.label}
      </text>
      {element.estimatedCapacity && (
        <text
          x={element.x + 8}
          y={element.y + 36}
          fill={colors.stroke}
          fontSize={10}
          opacity={0.7}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          ~{element.estimatedCapacity} guests
        </text>
      )}
    </g>
  );
};

export default ZoneElementComponent;
