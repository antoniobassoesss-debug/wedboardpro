/**
 * Selection Layer Component
 *
 * Renders selection-related visual elements:
 * - Selection box during box selection (dashed blue rectangle)
 * - Selection handles for selected elements (blue border + resize handles)
 * - Multi-select bounding box (dashed blue)
 * - Hover highlight
 */

import React, { useMemo } from 'react';
import { useLayoutStore, useSelectionStore } from '../../stores';
import { SelectionHandles } from './SelectionHandles';
import type { BaseElement } from '../../types/elements';

interface SelectionLayerProps {
  selectedIds: Set<string>;
  hoveredId: string | null;
  selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  scale?: number;
}

const SELECTION_COLOR = '#3b82f6';

export const SelectionLayer: React.FC<SelectionLayerProps> = ({
  selectedIds,
  hoveredId,
  selectionBox,
  scale = 1,
}) => {
  const layoutStore = useLayoutStore();

  const selectedElements = useMemo(() => {
    return Array.from(selectedIds)
      .map(id => layoutStore.getElementById(id))
      .filter((el): el is BaseElement => el !== undefined);
  }, [selectedIds, layoutStore]);

  const selectionBoxBounds = useMemo(() => {
    if (!selectionBox) return null;

    const left = Math.min(selectionBox.start.x, selectionBox.end.x);
    const right = Math.max(selectionBox.start.x, selectionBox.end.x);
    const top = Math.min(selectionBox.start.y, selectionBox.end.y);
    const bottom = Math.max(selectionBox.start.y, selectionBox.end.y);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }, [selectionBox]);

  const singleSelectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  const renderHandles = (element: BaseElement) => {
    const handleResize = (id: string, width: number, height: number) => {
      layoutStore.resizeElement(id, width, height);
    };

    const handleRotate = (id: string, rotation: number) => {
      layoutStore.rotateElement(id, rotation);
    };

    const handleDelete = (id: string) => {
      layoutStore.deleteElement(id);
    };

    const handleResizeStart = (_handle: any, _id: string, _event: React.MouseEvent) => {
      // Resize started - connected to useTransform hook
    };

    const handleRotateStart = (_id: string, _event: React.MouseEvent) => {
      // Rotate started - connected to useTransform hook
    };

    return (
      <SelectionHandles
        key={element.id}
        element={{
          id: element.id,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
        }}
        onResize={handleResize}
        onRotate={handleRotate}
        onDelete={handleDelete}
        onResizeStart={handleResizeStart}
        onRotateStart={handleRotateStart}
        scale={scale}
      />
    );
  };

  return (
    <g className="selection-layer">
      {selectionBoxBounds && (
        <g className="selection-box">
          <rect
            x={selectionBoxBounds.x}
            y={selectionBoxBounds.y}
            width={selectionBoxBounds.width}
            height={selectionBoxBounds.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke={SELECTION_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          <circle cx={selectionBoxBounds.x} cy={selectionBoxBounds.y} r={4} fill={SELECTION_COLOR} />
          <circle cx={selectionBoxBounds.x + selectionBoxBounds.width} cy={selectionBoxBounds.y} r={4} fill={SELECTION_COLOR} />
          <circle cx={selectionBoxBounds.x} cy={selectionBoxBounds.y + selectionBoxBounds.height} r={4} fill={SELECTION_COLOR} />
          <circle cx={selectionBoxBounds.x + selectionBoxBounds.width} cy={selectionBoxBounds.y + selectionBoxBounds.height} r={4} fill={SELECTION_COLOR} />
        </g>
      )}

      {singleSelectedElement && renderHandles(singleSelectedElement)}

      {selectedElements.length > 1 && (
        <g className="multiple-selection">
          {(() => {
            const bounds = selectedElements.reduce(
              (acc, el) => ({
                minX: Math.min(acc.minX, el.x),
                minY: Math.min(acc.minY, el.y),
                maxX: Math.max(acc.maxX, el.x + el.width),
                maxY: Math.max(acc.maxY, el.y + el.height),
              }),
              { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            );

            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;

            return (
              <g>
                <rect
                  x={bounds.minX}
                  y={bounds.minY}
                  width={width}
                  height={height}
                  fill="none"
                  stroke={SELECTION_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                />
                <text
                  x={bounds.minX + 4}
                  y={bounds.minY - 8}
                  fill={SELECTION_COLOR}
                  fontSize="11"
                  fontWeight="500"
                >
                  {selectedElements.length} selected
                </text>
              </g>
            );
          })()}
        </g>
      )}

      {hoveredId && !selectedIds.has(hoveredId) && (() => {
        const hoveredElement = layoutStore.getElementById(hoveredId);
        if (!hoveredElement) return null;

        return (
          <rect
            x={hoveredElement.x}
            y={hoveredElement.y}
            width={hoveredElement.width}
            height={hoveredElement.height}
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth={1}
            strokeDasharray="3,3"
            style={{ pointerEvents: 'none', opacity: 0.6 }}
          />
        );
      })()}
    </g>
  );
};

export default SelectionLayer;
