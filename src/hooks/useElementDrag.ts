/**
 * Element Drag Hook
 *
 * Handles dragging elements with grid snap support.
 * All positions are stored in real-world meters.
 */

import { useCallback, useRef, useState } from 'react';
import type { Point, LayoutElement } from '../types/layout-scale';
import { useLayoutScale } from '../contexts/LayoutScaleContext';
import { snapToGrid, roundToPrecision } from '../lib/layout/scale-utils';

/**
 * Drag state interface
 */
export interface DragState {
  isDragging: boolean;
  elementId: string | null;
  startPosition: Point | null;
  currentPosition: Point | null;
}

/**
 * Options for the drag hook
 */
export interface UseElementDragOptions {
  onDragStart?: (elementId: string, position: Point) => void;
  onDrag?: (elementId: string, position: Point) => void;
  onDragEnd?: (elementId: string, finalPosition: Point) => void;
}

/**
 * Initial drag state
 */
const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  elementId: null,
  startPosition: null,
  currentPosition: null,
};

/**
 * Hook for handling element dragging with grid snap
 */
export function useElementDrag(options: UseElementDragOptions = {}) {
  const { scale, gridConfig } = useLayoutScale();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);

  const canvasRectRef = useRef<DOMRect | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });

  /**
   * Start dragging an element
   */
  const startDrag = useCallback(
    (
      elementId: string,
      element: LayoutElement,
      mouseEvent: React.MouseEvent,
      canvasRect: DOMRect
    ) => {
      if (!scale) return;

      canvasRectRef.current = canvasRect;

      // Calculate the offset from mouse to element center
      // This ensures smooth dragging from wherever you clicked
      const mouseCanvasPos: Point = {
        x: mouseEvent.clientX - canvasRect.left,
        y: mouseEvent.clientY - canvasRect.top,
      };
      const mouseRealPos = scale.canvasToReal(mouseCanvasPos);

      dragOffsetRef.current = {
        x: element.position.x - mouseRealPos.x,
        y: element.position.y - mouseRealPos.y,
      };

      setDragState({
        isDragging: true,
        elementId,
        startPosition: { ...element.position },
        currentPosition: { ...element.position },
      });

      options.onDragStart?.(elementId, element.position);
    },
    [scale, options]
  );

  /**
   * Update drag position based on mouse movement
   */
  const updateDrag = useCallback(
    (mouseEvent: MouseEvent) => {
      if (!scale || !dragState.isDragging || !canvasRectRef.current) return;

      // Calculate mouse position relative to canvas
      const canvasPos: Point = {
        x: mouseEvent.clientX - canvasRectRef.current.left,
        y: mouseEvent.clientY - canvasRectRef.current.top,
      };

      // Convert to real-world position and apply drag offset
      const mouseRealPos = scale.canvasToReal(canvasPos);
      let realPos: Point = {
        x: mouseRealPos.x + dragOffsetRef.current.x,
        y: mouseRealPos.y + dragOffsetRef.current.y,
      };

      // Apply grid snap if enabled
      if (gridConfig.enabled) {
        realPos = snapToGrid(realPos, gridConfig.size);
      } else {
        // Snap to centimeter precision to avoid floating point drift
        realPos = {
          x: roundToPrecision(realPos.x, 0.01),
          y: roundToPrecision(realPos.y, 0.01),
        };
      }

      setDragState((prev) => ({
        ...prev,
        currentPosition: realPos,
      }));

      if (dragState.elementId) {
        options.onDrag?.(dragState.elementId, realPos);
      }
    },
    [scale, gridConfig, dragState, options]
  );

  /**
   * End the drag operation
   */
  const endDrag = useCallback(() => {
    if (
      !dragState.isDragging ||
      !dragState.elementId ||
      !dragState.currentPosition
    ) {
      setDragState(INITIAL_DRAG_STATE);
      return;
    }

    // Final snap to ensure precision
    let finalPosition = dragState.currentPosition;
    if (gridConfig.enabled) {
      finalPosition = snapToGrid(finalPosition, gridConfig.size);
    } else {
      // Snap to centimeter precision
      finalPosition = {
        x: roundToPrecision(finalPosition.x, 0.01),
        y: roundToPrecision(finalPosition.y, 0.01),
      };
    }

    options.onDragEnd?.(dragState.elementId, finalPosition);

    setDragState(INITIAL_DRAG_STATE);
    canvasRectRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
  }, [dragState, gridConfig, options]);

  /**
   * Cancel the drag and restore original position
   */
  const cancelDrag = useCallback(() => {
    if (
      dragState.isDragging &&
      dragState.elementId &&
      dragState.startPosition
    ) {
      // Restore original position
      options.onDragEnd?.(dragState.elementId, dragState.startPosition);
    }

    setDragState(INITIAL_DRAG_STATE);
    canvasRectRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
  }, [dragState, options]);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
}

export default useElementDrag;
