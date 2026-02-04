/**
 * Selection Handles Component
 *
 * Renders resize and rotate handles for selected elements:
 * - 8 resize handles (4 corners + 4 edges)
 * - 1 rotate handle (above top edge)
 * - SVG-based handles with appropriate cursors
 */

import React, { useCallback } from 'react';
import type { BaseElement } from '../../types/elements';
import type { ResizeHandle } from '../../hooks/useTransform';

interface SelectionHandlesProps {
  element: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  onResize: (id: string, width: number, height: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onDelete?: (id: string) => void;
  onResizeStart: (handle: ResizeHandle, elementId: string, event: React.MouseEvent) => void;
  onRotateStart: (elementId: string, event: React.MouseEvent) => void;
  scale?: number;
}

const HANDLE_SIZE = 10;
const ROTATE_HANDLE_SIZE = 14;
const ROTATE_HANDLE_DISTANCE = 30;

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  element,
  onResize,
  onRotate,
  onDelete,
  onResizeStart,
  onRotateStart,
  scale = 1,
}) => {
  const centerX = element.x + element.width / 2;
  const rotateHandleY = element.y - ROTATE_HANDLE_DISTANCE - ROTATE_HANDLE_SIZE / 2;

  const handleMouseDown = useCallback((handle: ResizeHandle, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onResizeStart(handle, element.id, event);
  }, [element.id, onResizeStart]);

  const handleRotateMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onRotateStart(element.id, event);
  }, [element.id, onRotateStart]);

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete) {
      onDelete(element.id);
    }
  }, [element.id, onDelete]);

  // Get cursor for each handle
  const getCursor = (handle: ResizeHandle): string => {
    const cursors: Record<ResizeHandle, string> = {
      nw: 'nwse-resize',
      n: 'ns-resize',
      ne: 'nesw-resize',
      e: 'ew-resize',
      se: 'nwse-resize',
      s: 'ns-resize',
      sw: 'nesw-resize',
      w: 'ew-resize',
    };
    return cursors[handle];
  };

  return (
    <g>
      {/* Corner resize handles */}
      <rect
        x={element.x - HANDLE_SIZE / 2}
        y={element.y - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('nw')}
        onMouseDown={(e) => handleMouseDown('nw', e)}
      />
      <rect
        x={element.x + element.width - HANDLE_SIZE / 2}
        y={element.y - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('ne')}
        onMouseDown={(e) => handleMouseDown('ne', e)}
      />
      <rect
        x={element.x - HANDLE_SIZE / 2}
        y={element.y + element.height - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('sw')}
        onMouseDown={(e) => handleMouseDown('sw', e)}
      />
      <rect
        x={element.x + element.width - HANDLE_SIZE / 2}
        y={element.y + element.height - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('se')}
        onMouseDown={(e) => handleMouseDown('se', e)}
      />

      {/* Edge resize handles */}
      <rect
        x={element.x + element.width / 2 - HANDLE_SIZE / 2}
        y={element.y - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('n')}
        onMouseDown={(e) => handleMouseDown('n', e)}
      />
      <rect
        x={element.x + element.width / 2 - HANDLE_SIZE / 2}
        y={element.y + element.height - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('s')}
        onMouseDown={(e) => handleMouseDown('s', e)}
      />
      <rect
        x={element.x - HANDLE_SIZE / 2}
        y={element.y + element.height / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('w')}
        onMouseDown={(e) => handleMouseDown('w', e)}
      />
      <rect
        x={element.x + element.width - HANDLE_SIZE / 2}
        y={element.y + element.height / 2 - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor={getCursor('e')}
        onMouseDown={(e) => handleMouseDown('e', e)}
      />

      {/* Rotate handle line */}
      <line
        x1={element.x + element.width / 2}
        y1={element.y}
        x2={element.x + element.width / 2}
        y2={rotateHandleY + ROTATE_HANDLE_SIZE / 2}
        stroke="#0066FF"
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* Rotate handle */}
      <circle
        cx={element.x + element.width / 2}
        cy={rotateHandleY + ROTATE_HANDLE_SIZE / 2}
        r={ROTATE_HANDLE_SIZE / 2}
        fill="white"
        stroke="#0066FF"
        strokeWidth={1.5}
        cursor="grab"
        onMouseDown={handleRotateMouseDown}
      />
      <path
        d={`M${element.x + element.width / 2 - 4} ${rotateHandleY + ROTATE_HANDLE_SIZE / 2 - 2}
           L${element.x + element.width / 2} ${rotateHandleY + ROTATE_HANDLE_SIZE / 2 - 6}
           L${element.x + element.width / 2 + 4} ${rotateHandleY + ROTATE_HANDLE_SIZE / 2 - 2}`}
        fill="none"
        stroke="#0066FF"
        strokeWidth={1.5}
      />

      {/* Selection border */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="none"
        stroke="#0066FF"
        strokeWidth={1.5}
        strokeDasharray="6,4"
      />

      {/* Rotation label */}
      {element.rotation !== undefined && element.rotation !== 0 && (
        <text
          x={element.x + element.width / 2}
          y={element.y - 8}
          textAnchor="middle"
          fontSize="11"
          fill="#0066FF"
          fontWeight="500"
        >
          {Math.round(element.rotation)}°
        </text>
      )}

      {/* Delete button (optional) */}
      {onDelete && (
        <g
          onClick={handleDelete}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={element.x + element.width + 12}
            cy={element.y}
            r={10}
            fill="#EF4444"
          />
          <path
            d={`M${element.x + element.width + 8} ${element.y}
               L${element.x + element.width + 16} ${element.y}`}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
};

export default SelectionHandles;
