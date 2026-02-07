/**
 * Decoration Element Component
 *
 * Renders decoration elements on the canvas.
 */

import React from 'react';
import type { DecorationElement } from '../../types/elements';
import { getDecorationColor } from '../../constants';

interface DecorationElementProps {
  element: DecorationElement;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const DecorationElementComponent: React.FC<DecorationElementProps> = ({
  element,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const colors = getDecorationColor(element.type);
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;

  if (element.customShape) {
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
        <path
          d={element.customShape}
          fill={element.color || colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
        />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.stroke}
          fontSize={10}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {element.label}
        </text>
      </g>
    );
  }

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
        rx={element.type === 'flower-arrangement' ? 50 : 4}
        fill={element.color || colors.fill}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.stroke}
        fontSize={10}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {element.label}
      </text>
    </g>
  );
};

export default DecorationElementComponent;
