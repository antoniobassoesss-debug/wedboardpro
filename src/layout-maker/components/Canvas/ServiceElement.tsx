/**
 * Service Element Component
 *
 * Renders service elements (bar, buffet, cake table, etc.) on the canvas.
 */

import React from 'react';
import type { ServiceElement } from '../../types/elements';
import { getServiceColor } from '../../constants';

interface ServiceElementProps {
  element: ServiceElement;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const ServiceElementComponent: React.FC<ServiceElementProps> = ({
  element,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const colors = getServiceColor(element.type);
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;

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
        rx={2}
        fill={element.color || colors.fill}
        stroke={colors.stroke}
        strokeWidth={2}
      />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        fontSize={12}
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {element.label}
      </text>
    </g>
  );
};

export default ServiceElementComponent;
