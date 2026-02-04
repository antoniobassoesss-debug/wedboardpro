/**
 * Chair Element Component
 *
 * Renders a single chair element on the canvas.
 * - 0.45m diameter circle
 * - Different styling for empty vs assigned
 * - Dietary indicator icons
 */

import React from 'react';
import type { ChairElement } from '../../types/elements';
import { ELEMENT_COLORS, DIETARY_COLORS, HOVER_COLOR, SELECTION_COLOR } from '../../constants';

interface ChairRenderProps {
  element: ChairElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const ChairRender: React.FC<ChairRenderProps> = ({
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
  const isAssigned = element.assignedGuestId != null;
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const radius = (element.width / 2) * pixelsPerMeter;

  let fill: string;
  let stroke: string;
  let strokeWidth: number;

  if (isSelected) {
    fill = ELEMENT_COLORS.chair.selected;
    stroke = SELECTION_COLOR;
    strokeWidth = 2;
  } else if (isAssigned) {
    fill = ELEMENT_COLORS.chair.assigned;
    stroke = ELEMENT_COLORS.chair.assignedStroke;
    strokeWidth = 1;
  } else {
    fill = ELEMENT_COLORS.chair.empty;
    stroke = ELEMENT_COLORS.chair.emptyStroke;
    strokeWidth = 1;
  }

  const dietaryColor = element.dietaryType && element.dietaryType !== 'regular'
    ? DIETARY_COLORS[element.dietaryType] || '#808080'
    : null;

  const getInitials = (name: string | null): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const dietaryIndicatorRadius = 4;
  const dietaryIndicatorX = element.x * pixelsPerMeter + element.width * pixelsPerMeter - dietaryIndicatorRadius - 2;
  const dietaryIndicatorY = element.y * pixelsPerMeter + dietaryIndicatorRadius + 2;

  return (
    <g
      transform={`rotate(${element.rotation}, ${centerX * pixelsPerMeter}, ${centerY * pixelsPerMeter})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={centerX * pixelsPerMeter}
        cy={centerY * pixelsPerMeter}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      {isAssigned && element.assignedGuestName && (
        <text
          x={centerX * pixelsPerMeter}
          y={centerY * pixelsPerMeter}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={radius * 0.8}
          fontWeight={600}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {getInitials(element.assignedGuestName)}
        </text>
      )}

      {dietaryColor && (
        <circle
          cx={dietaryIndicatorX}
          cy={dietaryIndicatorY}
          r={dietaryIndicatorRadius}
          fill={dietaryColor}
          stroke="white"
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {isHovered && !isSelected && (
        <circle
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          r={radius + 2}
          fill="none"
          stroke={HOVER_COLOR}
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
};

export type { ChairRenderProps };
