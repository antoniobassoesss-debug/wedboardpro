/**
 * useViewport Hook
 *
 * Custom hook for viewport interaction and coordinate transformations.
 * Provides pan, zoom, and coordinate conversion utilities.
 * Supports mouse and touch interactions including pinch-to-zoom.
 */

import { useCallback, useRef } from 'react';
import { useViewportStore, useUIStore, useLayoutStore } from '../stores';
import { useLayoutStore as useRealLayoutStore } from '../stores/layoutStore';
import type { ViewportState, WorldPoint, ScreenPoint } from '../types/viewport';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_WHEEL_SENSITIVITY } from '../constants';

interface UseViewportReturn {
  viewport: ViewportState;
  pixelsPerMeter: number;

  zoomTo: (level: number, pivot?: ScreenPoint) => void;
  zoomIn: (pivot?: ScreenPoint) => void;
  zoomOut: (pivot?: ScreenPoint) => void;
  zoomBy: (delta: number, pivot?: ScreenPoint) => void;

  panStart: (screenPoint: ScreenPoint) => void;
  panMove: (screenPoint: ScreenPoint) => void;
  panEnd: () => void;
  isPanning: boolean;

  worldToScreen: (point: WorldPoint) => ScreenPoint;
  screenToWorld: (point: ScreenPoint) => WorldPoint;
  screenToWorldDelta: (delta: { dx: number; dy: number }) => { dx: number; dy: number };

  zoomLevel: number;
  canZoomIn: boolean;
  canZoomOut: boolean;

  handleWheelZoom: (event: WheelEvent) => void;
  handlePanStart: (event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => void;
  handlePanMove: (event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => void;
  handlePanEnd: () => void;

  handleTouchStart: (event: React.TouchEvent | TouchEvent) => void;
  handleTouchMove: (event: React.TouchEvent | TouchEvent) => void;
  handleTouchEnd: (event: React.TouchEvent | TouchEvent) => void;
}

export function useViewport(): UseViewportReturn {
  const viewportStore = useViewportStore();
  const uiStore = useUIStore();
  const layoutStore = useRealLayoutStore();

  const pixelsPerMeter = viewportStore.pixelsPerMeter || 100;
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<ScreenPoint | null>(null);

  const viewport = viewportStore.viewport;
  const zoomLevel = viewport.zoom;
  const canZoomIn = zoomLevel < MAX_ZOOM;
  const canZoomOut = zoomLevel > MIN_ZOOM;

  const zoomTo = useCallback(
    (level: number, pivot?: ScreenPoint) => {
      viewportStore.zoomTo(level, pivot);
    },
    [viewportStore]
  );

  const zoomIn = useCallback(
    (pivot?: ScreenPoint) => {
      viewportStore.zoomIn(pivot);
    },
    [viewportStore]
  );

  const zoomOut = useCallback(
    (pivot?: ScreenPoint) => {
      viewportStore.zoomOut(pivot);
    },
    [viewportStore]
  );

  const zoomBy = useCallback(
    (delta: number, pivot?: ScreenPoint) => {
      viewportStore.zoomBy(delta, pivot);
    },
    [viewportStore]
  );

  const panStart = useCallback(
    (screenPoint: ScreenPoint) => {
      isPanningRef.current = true;
      lastPanPointRef.current = screenPoint;
    },
    []
  );

  const panMove = useCallback(
    (screenPoint: ScreenPoint) => {
      if (!isPanningRef.current || !lastPanPointRef.current) return;

      const deltaX = screenPoint.x - lastPanPointRef.current.x;
      const deltaY = screenPoint.y - lastPanPointRef.current.y;

      viewportStore.panBy(deltaX / viewport.zoom, deltaY / viewport.zoom);
      lastPanPointRef.current = screenPoint;
    },
    [viewportStore, viewport.zoom]
  );

  const panEnd = useCallback(() => {
    isPanningRef.current = false;
    lastPanPointRef.current = null;
  }, []);

  const worldToScreen = useCallback(
    (point: WorldPoint): ScreenPoint => {
      return {
        x: (point.x * pixelsPerMeter + viewport.x) * viewport.zoom,
        y: (point.y * pixelsPerMeter + viewport.y) * viewport.zoom,
      };
    },
    [viewport, pixelsPerMeter]
  );

  const screenToWorld = useCallback(
    (point: ScreenPoint): WorldPoint => {
      return {
        x: (point.x / viewport.zoom - viewport.x) / pixelsPerMeter,
        y: (point.y / viewport.zoom - viewport.y) / pixelsPerMeter,
      };
    },
    [viewport, pixelsPerMeter]
  );

  const screenToWorldDelta = useCallback(
    (delta: { dx: number; dy: number }): { dx: number; dy: number } => {
      return {
        dx: delta.dx / viewport.zoom / pixelsPerMeter,
        dy: delta.dy / viewport.zoom / pixelsPerMeter,
      };
    },
    [viewport, pixelsPerMeter]
  );

  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        zoomBy(delta);
        return;
      }

      const rect = (event.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const pivot: ScreenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const zoomDelta = event.deltaY * ZOOM_WHEEL_SENSITIVITY * -1;
      zoomBy(zoomDelta, pivot);
    },
    [zoomBy]
  );

  const handlePanStart = useCallback(
    (event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
      const isHandTool = uiStore.activeTool === 'hand';
      const isMiddleClick = 'button' in event && event.button === 1;
      const isSpacePressed = event instanceof MouseEvent && event.shiftKey === false && event.metaKey === false && event.ctrlKey === false && 'buttons' in event && event.buttons === 4;

      if (isHandTool || isMiddleClick || (event instanceof MouseEvent && event.buttons === 4)) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
        const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
        panStart({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }
    },
    [uiStore.activeTool, panStart]
  );

  const handlePanMove = useCallback(
    (event: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
      if (!isPanningRef.current) return;

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
      const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY;
      panMove({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    },
    [panMove]
  );

  const handlePanEnd = useCallback(() => {
    panEnd();
  }, [panEnd]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent | TouchEvent) => {
      const touches = event.touches;

      if (touches.length === 2) {
        event.preventDefault();

        const touch1 = touches[0]!;
        const touch2 = touches[1]!;
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        initialPinchDistanceRef.current = distance;
        initialPinchZoomRef.current = viewport.zoom;

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        pinchCenterRef.current = {
          x: centerX - rect.left,
          y: centerY - rect.top,
        };
      } else if (touches.length === 1 && uiStore.activeTool === 'hand') {
        const touch = touches[0]!;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        panStart({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    },
    [uiStore.activeTool, panStart, viewport.zoom]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent | TouchEvent) => {
      const touches = event.touches;

      if (touches.length === 2 && initialPinchDistanceRef.current !== null) {
        event.preventDefault();

        const touch1 = touches[0]!;
        const touch2 = touches[1]!;
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        const scale = distance / initialPinchDistanceRef.current;
        const initialZoom = initialPinchZoomRef.current ?? viewport.zoom;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialZoom * scale));

        if (pinchCenterRef.current) {
          zoomTo(newZoom, pinchCenterRef.current);
        }

        const currentCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };

        if (lastPinchCenterRef.current) {
          const deltaX = currentCenter.x - lastPinchCenterRef.current.x;
          const deltaY = currentCenter.y - lastPinchCenterRef.current.y;

          if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
            panMove({
              x: deltaX,
              y: deltaY,
            });
          }
        }

        lastPinchCenterRef.current = currentCenter;
      } else if (touches.length === 1 && isPanningRef.current) {
        const touch = touches[0]!;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        panMove({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    },
    [panMove, zoomTo, viewport.zoom]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent | TouchEvent) => {
      if (event.touches.length === 0) {
        panEnd();
      }

      if (event.touches.length < 2) {
        initialPinchDistanceRef.current = null;
        initialPinchZoomRef.current = null;
        lastPinchCenterRef.current = null;
        pinchCenterRef.current = null;
      }
    },
    [panEnd]
  );

  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number | null>(null);
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const pinchCenterRef = useRef<ScreenPoint | null>(null);

  return {
    viewport,
    pixelsPerMeter,
    zoomTo,
    zoomIn,
    zoomOut,
    zoomBy,
    panStart,
    panMove,
    panEnd,
    isPanning: isPanningRef.current,
    worldToScreen,
    screenToWorld,
    screenToWorldDelta,
    zoomLevel,
    canZoomIn,
    canZoomOut,
    handleWheelZoom,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

export default useViewport;
