/**
 * useSelection Hook
 *
 * Complete selection system with:
 * - Click selection (single, shift+add, ctrl+toggle)
 * - Touch support: tap to select, long press for context menu
 * - Box selection (drag to select multiple)
 * - Keyboard support (Escape, Cmd+A, Shift+Click)
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useLayoutStore } from '../stores';
import { useHistoryStore } from '../stores';

interface SelectionPoint {
  x: number;
  y: number;
}

interface UseSelectionReturn {
  selectedIds: Set<string>;
  hoveredId: string | null;
  isBoxSelecting: boolean;
  selectionBox: { start: SelectionPoint; end: SelectionPoint } | null;

  handleElementMouseDown: (id: string, event: React.MouseEvent) => void;
  handleElementMouseEnter: (id: string) => void;
  handleElementMouseLeave: () => void;
  handleCanvasMouseDown: (event: React.MouseEvent) => void;
  handleCanvasMouseMove: (event: React.MouseEvent) => void;
  handleCanvasMouseUp: (event: React.MouseEvent) => void;

  handleElementTouchStart: (id: string, event: React.TouchEvent) => void;
  handleElementTouchMove: (event: React.TouchEvent) => void;
  handleElementTouchEnd: (event: React.TouchEvent) => void;
  handleCanvasTouchStart: (event: React.TouchEvent) => void;
  handleCanvasTouchEnd: (event: React.TouchEvent) => void;

  showContextMenu: (id: string | null, x: number, y: number) => void;
  hideContextMenu: () => void;
  contextMenuTarget: string | null;

  selectAll: () => void;
  deselectAll: () => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  setSelection: (ids: string[]) => void;
}

const LONG_PRESS_DURATION = 500;

export function useSelection(): UseSelectionReturn {
  const layoutStore = useLayoutStore();
  const historyStore = useHistoryStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: SelectionPoint; end: SelectionPoint } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);

  const boxStartRef = useRef<SelectionPoint | null>(null);
  const wasSelectedRef = useRef<boolean>(false);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number; elementId: string | null } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const getElements = useCallback(() => {
    const layout = layoutStore.layout;
    if (!layout) return [];
    return layoutStore.getElementsByType('all' as any) || [];
  }, [layoutStore]);

  const showContextMenu = useCallback((id: string | null, _x: number, _y: number) => {
    setContextMenuTarget(id);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenuTarget(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds(new Set());
        setHoveredId(null);
        hideContextMenu();
      } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const elements = getElements();
        setSelectedIds(new Set(elements.map(el => el.id)));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const previousState = {
            elements: {} as Record<string, any>,
            elementOrder: layoutStore.layout?.elementOrder || [],
          };
          selectedIds.forEach(id => {
            const el = layoutStore.getElementById(id);
            if (el) previousState.elements[id] = { ...el };
          });
          selectedIds.forEach(id => layoutStore.deleteElement(id));
          setSelectedIds(new Set());

          historyStore.record(
            'DELETE_ELEMENTS',
            `Delete ${selectedIds.size} elements`,
            previousState,
            { elements: {}, elementOrder: layoutStore.layout?.elementOrder || [] }
          );
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, layoutStore, getElements, historyStore, hideContextMenu]);

  const isBoxIntersectingElement = useCallback((box: { start: SelectionPoint; end: SelectionPoint }, element: any): boolean => {
    if (!element) return false;

    const boxLeft = Math.min(box.start.x, box.end.x);
    const boxRight = Math.max(box.start.x, box.end.x);
    const boxTop = Math.min(box.start.y, box.end.y);
    const boxBottom = Math.max(box.start.y, box.end.y);

    const elLeft = element.x;
    const elRight = element.x + element.width;
    const elTop = element.y;
    const elBottom = element.y + element.height;

    return !(boxRight < elLeft || boxLeft > elRight || boxBottom < elTop || boxTop > elBottom);
  }, []);

  const screenToCanvas = useCallback((screenX: number, screenY: number, svgElement: SVGSVGElement | null): SelectionPoint => {
    if (!svgElement) return { x: screenX, y: screenY };
    const rect = svgElement.getBoundingClientRect();
    return { x: screenX - rect.left, y: screenY - rect.top };
  }, []);

  const handleElementMouseDown = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const isShift = event.shiftKey;
    const isMeta = event.metaKey || event.ctrlKey;

    if (isShift) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else if (isMeta) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedIds(new Set([id]));
    }

    wasSelectedRef.current = selectedIds.has(id);
  }, [selectedIds]);

  const handleElementMouseEnter = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handleElementMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    const svgElement = event.currentTarget as SVGSVGElement;
    const point = screenToCanvas(event.clientX, event.clientY, svgElement);

    const target = event.target as HTMLElement;
    if (event.target === svgElement || target.tagName === 'svg') {
      setIsBoxSelecting(true);
      boxStartRef.current = point;
      setSelectionBox({ start: point, end: point });
    }
  }, [screenToCanvas]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    const svgElement = event.currentTarget as SVGSVGElement;
    const point = screenToCanvas(event.clientX, event.clientY, svgElement);

    if (isBoxSelecting && boxStartRef.current) {
      setSelectionBox({ start: boxStartRef.current, end: point });
    }
  }, [isBoxSelecting, screenToCanvas]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent) => {
    if (isBoxSelecting && selectionBox) {
      const elements = getElements();
      const selected: string[] = [];

      elements.forEach(element => {
        if (isBoxIntersectingElement(selectionBox, element)) {
          selected.push(element.id);
        }
      });

      if (selected.length > 0) {
        setSelectedIds(new Set(selected));
      } else {
        setSelectedIds(new Set());
      }
    }

    setIsBoxSelecting(false);
    setSelectionBox(null);
    boxStartRef.current = null;
  }, [isBoxSelecting, selectionBox, getElements, isBoxIntersectingElement]);

  const handleElementTouchStart = useCallback((id: string, event: React.TouchEvent) => {
    event.stopPropagation();

    const touch = event.touches[0]!;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, time: Date.now(), elementId: id };
    isDraggingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current?.elementId === id) {
        setSelectedIds(new Set([id]));
        showContextMenu(id, touch.clientX, touch.clientY);
      }
    }, LONG_PRESS_DURATION);
  }, [showContextMenu]);

  const handleElementTouchMove = useCallback((_event: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (touchStartRef.current) {
      isDraggingRef.current = true;
    }
  }, []);

  const handleElementTouchEnd = useCallback((event: React.TouchEvent) => {
    event.stopPropagation();

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartRef.current && touchStartRef.current.elementId !== null && !isDraggingRef.current) {
      setSelectedIds(new Set([touchStartRef.current.elementId]));
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const handleCanvasTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0]!;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, time: Date.now(), elementId: null };
    isDraggingRef.current = false;
  }, []);

  const handleCanvasTouchEnd = useCallback((_event: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartRef.current && !isDraggingRef.current) {
      setSelectedIds(new Set());
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const selectAll = useCallback(() => {
    const elements = getElements();
    setSelectedIds(new Set(elements.map(el => el.id)));
  }, [getElements]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setHoveredId(null);
  }, []);

  const select = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return {
    selectedIds,
    hoveredId,
    isBoxSelecting,
    selectionBox,
    handleElementMouseDown,
    handleElementMouseEnter,
    handleElementMouseLeave,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleElementTouchStart,
    handleElementTouchMove,
    handleElementTouchEnd,
    handleCanvasTouchStart,
    handleCanvasTouchEnd,
    showContextMenu,
    hideContextMenu,
    contextMenuTarget,
    selectAll,
    deselectAll,
    select,
    deselect,
    toggle,
    setSelection,
  };
}

export type { SelectionPoint };
