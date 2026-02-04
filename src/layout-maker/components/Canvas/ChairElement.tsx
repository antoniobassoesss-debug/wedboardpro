/**
 * Chair Element Component (Line-Only Rendering)
 *
 * Renders chair elements with architectural floor plan style:
 * - Transparent fill with black outline (#1a1a1a)
 * - Line indicator for chair facing direction
 * - Optional guest assignment indicator
 */

import React from 'react';
import type { ChairElement } from '../../../types/layout-elements';

interface ChairElementProps {
  element: ChairElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isColliding?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

export const ChairElementComponent: React.FC<ChairElementProps> = ({
  element,
  pixelsPerMeter,
  isSelected = false,
  isHovered = false,
  isColliding = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const radius = 0.025 * pixelsPerMeter;

  const strokeColor = isColliding ? '#EF4444' : isSelected ? '#3b82f6' : isHovered ? '#2563eb' : '#1a1a1a';
  const strokeWidth = isSelected ? 2 : 1;
  const opacity = element.locked ? 0.6 : 1;

  const isAssigned = element.assignedGuestId != null;

  const renderChair = () => {
    if (isAssigned) {
      return (
        <g>
          <circle
            cx={centerX * pixelsPerMeter}
            cy={centerY * pixelsPerMeter}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="layout-element element-seat"
          />
          <line
            x1={(centerX - radius * 0.5) * pixelsPerMeter}
            y1={centerY * pixelsPerMeter}
            x2={(centerX + radius * 0.5) * pixelsPerMeter}
            y2={centerY * pixelsPerMeter}
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.7}
          />
        </g>
      );
    }

    return (
      <circle
        cx={centerX * pixelsPerMeter}
        cy={centerY * pixelsPerMeter}
        r={radius}
        fill="transparent"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray="2,2"
        className="layout-element element-seat"
      />
    );
  };

  const renderSelection = () => {
    if (!isSelected) return null;

    return (
      <circle
        cx={centerX * pixelsPerMeter}
        cy={centerY * pixelsPerMeter}
        r={radius + 3}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeDasharray="3,2"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderDietaryIndicator = () => {
    if (!element.dietaryType || element.dietaryType === 'regular') return null;

    const dietaryColors: Record<string, string> = {
      vegetarian: '#22c55e',
      vegan: '#84cc16',
      halal: '#8b5cf6',
      kosher: '#f59e0b',
      'gluten-free': '#f97316',
      other: '#6b7280',
    };

    const color = dietaryColors[element.dietaryType] || '#6b7280';
    const indicatorRadius = 3;

    return (
      <circle
        cx={(element.x + element.width - 0.015) * pixelsPerMeter}
        cy={(element.y + 0.015) * pixelsPerMeter}
        r={indicatorRadius}
        fill={color}
        stroke="white"
        strokeWidth={0.5}
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  return (
    <g
      transform={`rotate(${element.rotation}, ${centerX * pixelsPerMeter}, ${centerY * pixelsPerMeter})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: element.locked ? 'not-allowed' : 'pointer', opacity }}
      className={`chair-element ${element.locked ? 'locked' : ''}`}
    >
      {renderSelection()}
      {renderChair()}
      {renderDietaryIndicator()}
    </g>
  );
};

export default ChairElementComponent;
