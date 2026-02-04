/**
 * useDragDrop Hook
 *
 * Complete drag and drop system for elements:
 * - Single element drag
 * - Multi-element drag (selected elements)
 * - Table + chairs drag (chairs move with table)
 * - Axis constraint (Shift key)
 * - Collision detection (visual feedback)
 * - Snap guides (from useSnapGuides)
 * - Undo history recording
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useLayoutStore, useHistoryStore } from '../stores';
import type { BaseElement, TableElement, ChairElement } from '../types/elements';
import { useSnapGuides } from './useSnapGuides';

interface DragState {
  isDragging: boolean;
  dragElementId: string | null;
  dragStartMouse: { x: number; y: number } | null;
  dragStartPositions: Record<string, { x: number; y: number }>;
  dragOffset: { x: number; y: number };
  constrainedAxis: 'horizontal' | 'vertical' | null;
  hasCollision: boolean;
}

interface UseDragDropReturn {
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  hasCollision: boolean;
  snapGuides: ReturnType<typeof useSnapGuides>['guides'];

  handleDragStart: (elementId: string, event: React.MouseEvent | React.TouchEvent) => void;
  handleDragMove: (event: React.MouseEvent | React.TouchEvent) => void;
  handleDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;

  cancelDrag: () => void;

  toggleSnap: () => void;
  setGridSize: (size: number) => void;
}

const COLLISION_THRESHOLD = 5;

export function useDragDrop(
  selectedIds: Set<string>,
  setSelection: (ids: string[]) => void
): UseDragDropReturn {
  const layoutStore = useLayoutStore();
  const historyStore = useHistoryStore();
  const snapGuides = useSnapGuides();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragElementId: null,
    dragStartMouse: null,
    dragStartPositions: {},
    dragOffset: { x: 0, y: 0 },
    constrainedAxis: null,
    hasCollision: false,
  });

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const getChildElements = useCallback((tableId: string): string[] => {
    const table = layoutStore.getElementById(tableId);
    if (!table) return [];

    const isTable = table.type.startsWith('table-');
    if (!isTable) return [];

    const childChairs = layoutStore.getChildElements(tableId);
    return childChairs.map(c => c.id);
  }, [layoutStore]);

  const getDragGroup = useCallback((startElementId: string): string[] => {
    const element = layoutStore.getElementById(startElementId);
    if (!element) return [startElementId];

    if (element.type.startsWith('table-')) {
      const chairIds = getChildElements(startElementId);
      return [startElementId, ...chairIds];
    }

    if (selectedIds.has(startElementId)) {
      let group: string[] = [startElementId];

      selectedIds.forEach(id => {
        if (id !== startElementId) {
          const el = layoutStore.getElementById(id);
          if (el && el.type.startsWith('table-')) {
            group.push(id, ...getChildElements(id));
          } else if (el && !el.type.startsWith('table-')) {
            group.push(id);
          }
        }
      });

      return group;
    }

    return [startElementId];
  }, [selectedIds, layoutStore, getChildElements]);

  const checkCollisions = useCallback((
    positions: Record<string, { x: number; y: number }>,
    elementIds: string[]
  ): boolean => {
    const movingElements = elementIds.map(id => ({
      id,
      x: positions[id]?.x || 0,
      y: positions[id]?.y || 0,
      width: layoutStore.getElementById(id)?.width || 0,
      height: layoutStore.getElementById(id)?.height || 0,
    }));

    const allElements = layoutStore.layout?.elements || {};
    const otherElements = Object.values(allElements)
      .filter(el => !elementIds.includes(el.id))
      .map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      }));

    for (const moving of movingElements) {
      for (const other of otherElements) {
        const overlap = !(
          moving.x + moving.width - COLLISION_THRESHOLD <= other.x ||
          moving.x + COLLISION_THRESHOLD >= other.x + other.width ||
          moving.y + moving.height - COLLISION_THRESHOLD <= other.y ||
          moving.y + COLLISION_THRESHOLD >= other.y + other.height
        );

        if (overlap) {
          return true;
        }
      }
    }

    return false;
  }, [layoutStore]);

  const screenToCanvas = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    return { x: screenX, y: screenY };
  }, []);

  const handleDragStart = useCallback((elementId: string, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();

    const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
    const canvasCoords = screenToCanvas(clientX, clientY);

    if (!selectedIds.has(elementId)) {
      setSelection([elementId]);
    }

    const dragGroup = getDragGroup(elementId);

    const startPositions: Record<string, { x: number; y: number }> = {};
    dragGroup.forEach(id => {
      const element = layoutStore.getElementById(id);
      if (element) {
        startPositions[id] = { x: element.x, y: element.y };
      }
    });

    const isShiftPressed = 'shiftKey' in event && event.shiftKey;

    setDragState({
      isDragging: true,
      dragElementId: elementId,
      dragStartMouse: canvasCoords,
      dragStartPositions: startPositions,
      dragOffset: { x: 0, y: 0 },
      constrainedAxis: isShiftPressed ? null : null,
      hasCollision: false,
    });
  }, [selectedIds, setSelection, getDragGroup, layoutStore, screenToCanvas]);

  const handleDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging || !dragState.dragStartMouse || !dragState.dragElementId) {
      return;
    }

    event.preventDefault();

    const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
    const currentCanvas = screenToCanvas(clientX, clientY);
    const deltaX = currentCanvas.x - dragState.dragStartMouse.x;
    const deltaY = currentCanvas.y - dragState.dragStartMouse.y;

    let constrainedDeltaX = deltaX;
    let constrainedDeltaY = deltaY;

    if ('shiftKey' in event && event.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        constrainedDeltaY = 0;
      } else {
        constrainedDeltaX = 0;
      }
    }

    const newPositions: Record<string, { x: number; y: number }> = {};
    const elementIds = Object.keys(dragState.dragStartPositions);

    elementIds.forEach(id => {
      const startPos = dragState.dragStartPositions[id];
      if (startPos) {
        newPositions[id] = {
          x: startPos.x + constrainedDeltaX,
          y: startPos.y + constrainedDeltaY,
        };
      }
    });

    const elements = layoutStore.layout?.elements || {};
    const { snappedPosition } = snapGuides.calculateSnap(
      dragState.dragElementId,
      newPositions[dragState.dragElementId]!,
      elements
    );

    const snappedPositions: Record<string, { x: number; y: number }> = {};
    elementIds.forEach(id => {
      const startPos = dragState.dragStartPositions[id];
      if (startPos) {
        snappedPositions[id] = snappedPosition;
      }
    });

    Object.entries(newPositions).forEach(([id, pos]) => {
      if (id !== dragState.dragElementId) {
        snappedPositions[id] = pos;
      }
    });

    const hasCollision = checkCollisions(snappedPositions, elementIds);

    elementIds.forEach(id => {
      const newPos = snappedPositions[id];
      if (newPos) {
        layoutStore.updateElement(id, { x: newPos.x, y: newPos.y });
      }
    });

    setDragState(prev => ({
      ...prev,
      dragOffset: { x: constrainedDeltaX, y: constrainedDeltaY },
      hasCollision,
    }));
  }, [dragState, screenToCanvas, snapGuides, checkCollisions, layoutStore]);

  const handleDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging || !dragState.dragElementId) {
      return;
    }

    const elementIds = Object.keys(dragState.dragStartPositions);
    const previousState = {
      elements: {} as Record<string, BaseElement>,
      elementOrder: layoutStore.layout?.elementOrder || [],
    };

    elementIds.forEach(id => {
      const el = layoutStore.getElementById(id);
      if (el) {
        previousState.elements[id] = { ...el };
      }
    });

    if (elementIds.length > 0) {
      historyStore.record(
        'MOVE_ELEMENTS',
        `Move ${elementIds.length} element${elementIds.length > 1 ? 's' : ''}`,
        previousState,
        {
          elements: {},
          elementOrder: layoutStore.layout?.elementOrder || [],
        }
      );
    }

    setDragState({
      isDragging: false,
      dragElementId: null,
      dragStartMouse: null,
      dragStartPositions: {},
      dragOffset: { x: 0, y: 0 },
      constrainedAxis: null,
      hasCollision: false,
    });
  }, [dragState, layoutStore, historyStore]);

  const cancelDrag = useCallback(() => {
    if (!dragState.isDragging) return;

    Object.entries(dragState.dragStartPositions).forEach(([id, pos]) => {
      layoutStore.updateElement(id, { x: pos.x, y: pos.y });
    });

    setDragState({
      isDragging: false,
      dragElementId: null,
      dragStartMouse: null,
      dragStartPositions: {},
      dragOffset: { x: 0, y: 0 },
      constrainedAxis: null,
      hasCollision: false,
    });
  }, [dragState, layoutStore]);

  useEffect(() => {
    if (dragState.isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e as unknown as React.MouseEvent);
      };

      const handleMouseUp = (e: MouseEvent) => {
        handleDragEnd(e as unknown as React.MouseEvent);
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });

      const handleTouchMove = (e: TouchEvent) => {
        handleDragMove(e as unknown as React.TouchEvent);
      };

      const handleTouchEnd = (e: TouchEvent) => {
        handleDragEnd(e as unknown as React.TouchEvent);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dragState.isDragging && e.key === 'Shift') {
        setDragState(prev => ({ ...prev, constrainedAxis: 'horizontal' }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (dragState.isDragging && e.key === 'Shift') {
        setDragState(prev => ({ ...prev, constrainedAxis: null }));
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [dragState.isDragging]);

  return {
    isDragging: dragState.isDragging,
    dragOffset: dragState.dragOffset,
    hasCollision: dragState.hasCollision,
    snapGuides: snapGuides.guides,
    handleDragStart: handleDragStart as (elementId: string, event: React.MouseEvent | React.TouchEvent) => void,
    handleDragMove: handleDragMove as (event: React.MouseEvent | React.TouchEvent) => void,
    handleDragEnd: handleDragEnd as (event: React.MouseEvent | React.TouchEvent) => void,
    cancelDrag,
    toggleSnap: snapGuides.toggleSnap,
    setGridSize: snapGuides.setGridSize,
  };
}
