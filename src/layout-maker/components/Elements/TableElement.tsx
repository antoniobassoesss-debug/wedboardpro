/**
 * Table Element Component
 *
 * Renders a table element on the canvas.
 * Supports round, rectangular, oval, and square tables with wood-tone styling.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { TableElement } from '../../types/elements';
import { ELEMENT_COLORS, HOVER_COLOR, SELECTION_COLOR } from '../../constants';
import { ChairRender } from './ChairElement';
import type { ChairElement } from '../../types/elements';
import { RotateButton } from './RotateButton';

interface TableElementProps {
  element: TableElement;
  pixelsPerMeter: number;
  chairs?: ChairElement[];
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onRotate?: (elementId: string, newRotation: number) => void;
}

export const TableRender: React.FC<TableElementProps> = ({
  element,
  pixelsPerMeter,
  chairs = [],
  isSelected = false,
  isHovered = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onRotate,
}) => {
  const [showRotateButton, setShowRotateButton] = useState(false);
  const [pendingRotation, setPendingRotation] = useState<number | null>(null);

  useEffect(() => {
    if (isSelected) {
      setShowRotateButton(true);
    } else {
      setShowRotateButton(false);
    }
  }, [isSelected]);

  const isRound = element.type === 'table-round';
  const isOval = element.type === 'table-oval';
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const radius = element.width / 2;

  const tableFill = element.color || '#D4A373';
  const tableStroke = '#8B5A2B';
  const textColor = '#5D4037';

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(event);
    }
  }, [onDoubleClick]);

  const handleRotate = useCallback(() => {
    if (onRotate) {
      const newRotation = ((element.rotation || 0) + 90) % 360;
      setPendingRotation(newRotation);
      onRotate(element.id, newRotation);
    }
    setTimeout(() => {
      setShowRotateButton(false);
      setPendingRotation(null);
    }, 250);
  }, [element.id, element.rotation, onRotate]);

  const handleCloseRotateButton = useCallback(() => {
    setShowRotateButton(false);
    setPendingRotation(null);
  }, []);

  const effectiveRotation = pendingRotation !== null ? pendingRotation : (element.rotation || 0);

  const renderTableShape = () => {
    if (isRound) {
      return (
        <circle
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          r={radius * pixelsPerMeter}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={2}
        />
      );
    }

    if (isOval) {
      const rx = (element.width / 2) * pixelsPerMeter;
      const ry = (element.height / 2) * pixelsPerMeter;
      return (
        <ellipse
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          rx={rx}
          ry={ry}
          fill={tableFill}
          stroke={tableStroke}
          strokeWidth={2}
        />
      );
    }

    return (
      <rect
        x={element.x * pixelsPerMeter}
        y={element.y * pixelsPerMeter}
        width={element.width * pixelsPerMeter}
        height={element.height * pixelsPerMeter}
        rx={8}
        ry={8}
        fill={tableFill}
        stroke={tableStroke}
        strokeWidth={2}
      />
    );
  };

  const renderLabel = () => {
    const labelText = element.label || element.tableNumber || '';
    if (!labelText) return null;

    return (
      <text
        x={centerX * pixelsPerMeter}
        y={centerY * pixelsPerMeter}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={Math.min(element.width, element.height) * pixelsPerMeter * 0.35}
        fontWeight={600}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {labelText}
      </text>
    );
  };

  const renderCapacityIndicator = () => {
    if (chairs.length > 0) return null;

    return (
      <text
        x={centerX * pixelsPerMeter}
        y={(centerY + element.height / 2 + 0.3) * pixelsPerMeter}
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

    if (isRound || isOval) {
      const rx = isRound ? radius * pixelsPerMeter : (element.width / 2) * pixelsPerMeter;
      const ry = (element.height / 2) * pixelsPerMeter;

      return (
        <ellipse
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          rx={rx + 4}
          ry={ry + 4}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={2}
          strokeDasharray="4,4"
          style={{ pointerEvents: 'none' }}
        />
      );
    }

    return (
      <rect
        x={element.x * pixelsPerMeter - 4}
        y={element.y * pixelsPerMeter - 4}
        width={element.width * pixelsPerMeter + 8}
        height={element.height * pixelsPerMeter + 8}
        rx={12}
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={2}
        strokeDasharray="4,4"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderHoverOutline = () => {
    if (!isHovered || isSelected) return null;

    if (isRound || isOval) {
      const rx = isRound ? radius * pixelsPerMeter : (element.width / 2) * pixelsPerMeter;
      const ry = (element.height / 2) * pixelsPerMeter;

      return (
        <ellipse
          cx={centerX * pixelsPerMeter}
          cy={centerY * pixelsPerMeter}
          rx={rx + 2}
          ry={ry + 2}
          fill="none"
          stroke={HOVER_COLOR}
          strokeWidth={2}
          strokeDasharray="8,4"
          style={{ pointerEvents: 'none' }}
        />
      );
    }

    return (
      <rect
        x={element.x * pixelsPerMeter - 2}
        y={element.y * pixelsPerMeter - 2}
        width={element.width * pixelsPerMeter + 4}
        height={element.height * pixelsPerMeter + 4}
        rx={10}
        fill="none"
        stroke={HOVER_COLOR}
        strokeWidth={2}
        strokeDasharray="8,4"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const rotateButtonX = centerX * pixelsPerMeter;
  const rotateButtonY = (element.y * pixelsPerMeter) - 30;

  return (
    <>
      <g
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseDown={onMouseDown}
        style={{ cursor: 'pointer' }}
      >
        {renderSelectionOutline()}
        {renderHoverOutline()}
        {renderTableShape()}
        {renderLabel()}
        {renderCapacityIndicator()}

        {chairs.map((chair) => (
          <ChairRender
            key={chair.id}
            element={chair}
            pixelsPerMeter={pixelsPerMeter}
          />
        ))}
      </g>

      {showRotateButton && (
        <RotateButton
          x={rotateButtonX}
          y={rotateButtonY}
          onRotate={handleRotate}
          onClose={handleCloseRotateButton}
          elementSize={{ width: element.width, height: element.height }}
        />
      )}
    </>
  );
};

export type { TableElementProps };
