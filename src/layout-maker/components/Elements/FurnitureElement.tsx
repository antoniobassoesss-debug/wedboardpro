/**
 * Furniture Element Component
 *
 * Renders furniture elements (bar, buffet, cake table, gift table, DJ booth).
 * - Simple rectangles with appropriate colors
 * - Icons or labels to identify type
 * - Rotation support
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { ServiceElement } from '../../types/elements';
import { getServiceColor, HOVER_COLOR, SELECTION_COLOR } from '../../constants';
import { RotateButton } from './RotateButton';

interface FurnitureElementProps {
  element: ServiceElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onRotate?: (elementId: string, newRotation: number) => void;
}

export const FurnitureRender: React.FC<FurnitureElementProps> = ({
  element,
  pixelsPerMeter,
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

  const colors = element.color
    ? { fill: element.color, stroke: '#333333' }
    : getServiceColor(element.type);

  const x = element.x * pixelsPerMeter;
  const y = element.y * pixelsPerMeter;
  const width = element.width * pixelsPerMeter;
  const height = element.height * pixelsPerMeter;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

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

  const getIcon = () => {
    switch (element.type) {
      case 'bar':
        return (
          <g>
            <rect x={x + 4} y={y + 4} width={width - 8} height={height - 20} fill={colors.stroke} />
            <line x1={x + 8} y1={height - 12} x2={x + width - 8} y2={height - 12} stroke={colors.stroke} strokeWidth={2} />
          </g>
        );
      case 'buffet':
        return (
          <g>
            <rect x={x + 4} y={y + 4} width={width - 8} height={height - 8} fill={colors.stroke} rx={2} />
            <line x1={x + width / 2} y1={y + 8} x2={x + width / 2} y2={y + height - 8} stroke={colors.fill} strokeWidth={2} />
          </g>
        );
      case 'cake-table':
        return (
          <g>
            <rect x={x + 4} y={y + 4} width={width - 8} height={height - 8} fill={colors.stroke} rx={4} />
            <polygon
              points={`${centerX},${y + 8} ${centerX - 8},${y + 16} ${centerX + 8},${y + 16}`}
              fill={colors.fill}
            />
          </g>
        );
      case 'gift-table':
        return (
          <g>
            <rect x={x + 4} y={y + 4} width={width - 8} height={height - 8} fill={colors.stroke} rx={4} />
            <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="central" fill={colors.fill} fontSize={Math.min(width, height) * 0.4}>
              🎁
            </text>
          </g>
        );
      case 'dj-booth':
        return (
          <g>
            <rect x={x + 2} y={y + 2} width={width - 4} height={height - 4} fill={colors.stroke} />
            <rect x={x + 6} y={y + 6} width={width - 12} height={height - 20} fill={colors.fill} />
            <circle cx={centerX} cy={y + height - 8} r={4} fill={colors.fill} />
          </g>
        );
      default:
        return null;
    }
  };

  const renderOutline = () => {
    if (!isSelected && !isHovered) return null;

    const strokeColor = isSelected ? SELECTION_COLOR : HOVER_COLOR;
    const dashArray = isSelected ? '4,4' : '8,4';

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

  const rotateButtonX = centerX;
  const rotateButtonY = y - 30;

  return (
    <>
      <g
        transform={`rotate(${effectiveRotation}, ${centerX}, ${centerY})`}
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
          rx={4}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
        />

        {getIcon()}

        {element.label && (
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#FFFFFF"
            fontSize={Math.min(width, height) * 0.3}
            fontWeight={500}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {element.label}
          </text>
        )}
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

export type { FurnitureElementProps };
