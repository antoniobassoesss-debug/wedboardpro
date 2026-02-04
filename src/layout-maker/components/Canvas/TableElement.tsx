/**
 * Table Element Component (Line-Only Rendering)
 *
 * Renders table elements with architectural floor plan style:
 * - Transparent fill with black outline (#1a1a1a)
 * - Center cross mark for alignment
 * - Seat indicators positioned around edges
 */

import React from 'react';
import type { TableElement as TableElementType } from '../../../types/layout-elements';
import { SeatIndicators, distributeSeatPositions } from './SeatIndicators';

interface TableElementProps {
  element: TableElementType;
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

export const TableElement: React.FC<TableElementProps> = ({
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
  const centerX = element.x + element.dimensions.width / 2;
  const centerY = element.y + element.dimensions.height / 2;
  
  const isRound = element.type === 'table-round';
  const isOval = element.type === 'table-oval';
  const radius = element.dimensions.width / 2;

  const strokeColor = isColliding ? '#EF4444' : '#1a1a1a';
  const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;

  const renderTableShape = () => {
    const shapeProps = {
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth,
      className: `layout-element element-table ${isSelected ? 'selected' : ''} ${element.locked ? 'locked' : ''}`,
    };

    if (isRound) {
      return (
        <circle
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          r={radius * pixelsPerMeter}
          {...shapeProps}
        />
      );
    }

    if (isOval) {
      const rx = (element.dimensions.width / 2) * pixelsPerMeter;
      const ry = (element.dimensions.height / 2) * pixelsPerMeter;
      return (
        <ellipse
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          rx={rx}
          ry={ry}
          {...shapeProps}
        />
      );
    }

    return (
      <rect
        x={element.x * pixelsPerMeter}
        y={element.y * pixelsPerMeter}
        width={element.dimensions.width * pixelsPerMeter}
        height={element.dimensions.height * pixelsPerMeter}
        rx={4}
        {...shapeProps}
      />
    );
  };

  const renderCenterCross = () => {
    const crossSize = 8;
    const crossColor = '#cccccc';
    const crossStrokeWidth = 0.5;

    return (
      <g className="center-cross" opacity={0.6}>
        <line
          x1={(centerX - crossSize / 100) * pixelsPerMeter}
          y1={centerY * pixelsPerMeter}
          x2={(centerX + crossSize / 100) * pixelsPerMeter}
          y2={centerY * pixelsPerMeter}
          stroke={crossColor}
          strokeWidth={crossStrokeWidth}
        />
        <line
          x1={centerX * pixelsPerMeter}
          y1={(centerY - crossSize / 100) * pixelsPerMeter}
          x2={centerX * pixelsPerMeter}
          y2={(centerY + crossSize / 100) * pixelsPerMeter}
          stroke={crossColor}
          strokeWidth={crossStrokeWidth}
        />
      </g>
    );
  };

  const renderLabel = () => {
    const labelText = element.tableNumber || '';
    if (!labelText) return null;

    return (
      <text
        x={centerX * pixelsPerMeter}
        y={centerY * pixelsPerMeter}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#1a1a1a"
        fontSize={12}
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {labelText}
      </text>
    );
  };

  const renderCapacityLabel = () => {
    if (element.seats.length > 0 || element.capacity === 0) return null;

    return (
      <text
        x={centerX * pixelsPerMeter}
        y={(centerY + element.dimensions.height / 2 + 0.15) * pixelsPerMeter}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#666666"
        fontSize={10}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {element.capacity} seats
      </text>
    );
  };

  const renderSelectionOutline = () => {
    if (!isSelected) return null;

    const outlineProps = {
      fill: 'none',
      stroke: '#3b82f6',
      strokeWidth: 2,
      strokeDasharray: '4,4',
      style: { pointerEvents: 'none' as const },
    };

    if (isRound || isOval) {
      const rx = (element.dimensions.width / 2) * pixelsPerMeter;
      const ry = (element.dimensions.height / 2) * pixelsPerMeter;
      const padding = 4;
      return (
        <ellipse
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          rx={rx + padding}
          ry={ry + padding}
          {...outlineProps}
        />
      );
    }

    return (
      <rect
        x={element.x * pixelsPerMeter - 4}
        y={element.y * pixelsPerMeter - 4}
        width={element.dimensions.width * pixelsPerMeter + 8}
        height={element.dimensions.height * pixelsPerMeter + 8}
        rx={8}
        {...outlineProps}
      />
    );
  };

  const renderHoverOutline = () => {
    if (!isHovered || isSelected) return null;

    return (
      <g style={{ pointerEvents: 'none' }}>
        {isRound || isOval ? (
          <ellipse
            cx={centerX * pixelsPerMeter}
            cy={centerY * pixelsPerMeter}
            rx={(element.dimensions.width / 2 + 0.02) * pixelsPerMeter}
            ry={(element.dimensions.height / 2 + 0.02) * pixelsPerMeter}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="6,3"
            opacity={0.6}
          />
        ) : (
          <rect
            x={(element.x - 0.02) * pixelsPerMeter}
            y={(element.y - 0.02) * pixelsPerMeter}
            width={(element.dimensions.width + 0.04) * pixelsPerMeter}
            height={(element.dimensions.height + 0.04) * pixelsPerMeter}
            rx={6}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="6,3"
            opacity={0.6}
          />
        )}
      </g>
    );
  };

  const seatPositions = element.seats.length > 0 ? element.seats : 
    distributeSeatPositions(
      element.type,
      { width: element.dimensions.width, height: element.dimensions.height },
      element.capacity,
      element.chairConfig?.offset ?? 0.1
    );

  return (
    <g
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: isColliding ? 'not-allowed' : 'pointer' }}
      className={`table-element ${element.locked ? 'locked' : ''}`}
    >
      {renderSelectionOutline()}
      {renderHoverOutline()}
      {renderTableShape()}
      {renderCenterCross()}
      {renderLabel()}
      {renderCapacityLabel()}
      
      <SeatIndicators
        tableType={element.type}
        dimensions={{ width: element.dimensions.width, height: element.dimensions.height }}
        seatCount={element.capacity}
        seatPositions={seatPositions}
        chairOffset={element.chairConfig?.offset ?? 0.1}
        pixelsPerMeter={pixelsPerMeter}
        isSelected={isSelected}
      />
    </g>
  );
};

export default TableElement;
