/**
 * Viewport Store
 *
 * State store for canvas viewport, zoom, and coordinate transformations.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  DEFAULT_VIEWPORT,
  ZOOM_MIN,
  ZOOM_MAX,
} from '../types/viewport';
import { DEFAULT_PIXELS_PER_METER, VIEWPORT_PADDING } from '../constants';
import type { ViewportState, WorldPoint, ScreenPoint, ViewportBounds } from '../types/viewport';
import { screenToWorld as utilScreenToWorld, worldToScreen as utilWorldToScreen, calculateZoomToFit, getViewportBounds } from '../types/viewport';

interface ViewportStore {
  viewport: ViewportState;
  pixelsPerMeter: number;

  setViewport: (viewport: Partial<ViewportState>) => void;
  setSize: (width: number, height: number) => void;

  zoomTo: (level: number, pivot?: ScreenPoint) => void;
  zoomIn: (pivot?: ScreenPoint) => void;
  zoomOut: (pivot?: ScreenPoint) => void;
  zoomBy: (delta: number, pivot?: ScreenPoint) => void;

  panTo: (worldPoint: WorldPoint) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  panToScreen: (screenPoint: ScreenPoint) => void;

  resetView: () => void;
  fitToContent: (bounds: ViewportBounds, padding?: number) => void;
  fitToElements: (elementIds: string[], getElement: (id: string) => { x: number; y: number; width: number; height: number } | null) => void;

  setPixelsPerMeter: (ppm: number) => void;

  worldToScreen: (point: WorldPoint) => ScreenPoint;
  screenToWorld: (point: ScreenPoint) => WorldPoint;
  worldToScreenRect: (rect: { x: number; y: number; width: number; height: number }) => { x: number; y: number; width: number; height: number };
  screenToWorldRect: (rect: { x: number; y: number; width: number; height: number }) => { x: number; y: number; width: number; height: number };

  getBounds: () => ViewportBounds;
}

export const useViewportStore = create<ViewportStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      viewport: { ...DEFAULT_VIEWPORT, width: 800, height: 600 },
      pixelsPerMeter: DEFAULT_PIXELS_PER_METER,

      setViewport: (viewport) =>
        set((state) => {
          state.viewport = { ...state.viewport, ...viewport };
        }),

      setSize: (width, height) =>
        set((state) => {
          state.viewport = { ...state.viewport, width, height };
        }),

      zoomTo: (level, pivot) =>
        set((state) => {
          const clampedLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
          const currentZoom = state.viewport.zoom;

          if (pivot) {
            const worldBefore = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = { ...state.viewport, zoom: clampedLevel };
            const worldAfter = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = {
              ...state.viewport,
              x: state.viewport.x + (worldAfter.x - worldBefore.x) * state.pixelsPerMeter,
              y: state.viewport.y + (worldAfter.y - worldBefore.y) * state.pixelsPerMeter,
            };
          } else {
            state.viewport = { ...state.viewport, zoom: clampedLevel };
          }
        }),

      zoomIn: (pivot) =>
        set((state) => {
          const currentZoom = state.viewport.zoom;
          const newZoom = Math.min(ZOOM_MAX, currentZoom * 1.2);

          if (pivot) {
            const worldBefore = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = { ...state.viewport, zoom: newZoom };
            const worldAfter = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = {
              ...state.viewport,
              x: state.viewport.x + (worldAfter.x - worldBefore.x) * state.pixelsPerMeter,
              y: state.viewport.y + (worldAfter.y - worldBefore.y) * state.pixelsPerMeter,
            };
          } else {
            state.viewport = { ...state.viewport, zoom: newZoom };
          }
        }),

      zoomOut: (pivot) =>
        set((state) => {
          const currentZoom = state.viewport.zoom;
          const newZoom = Math.max(ZOOM_MIN, currentZoom / 1.2);

          if (pivot) {
            const worldBefore = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = { ...state.viewport, zoom: newZoom };
            const worldAfter = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = {
              ...state.viewport,
              x: state.viewport.x + (worldAfter.x - worldBefore.x) * state.pixelsPerMeter,
              y: state.viewport.y + (worldAfter.y - worldBefore.y) * state.pixelsPerMeter,
            };
          } else {
            state.viewport = { ...state.viewport, zoom: newZoom };
          }
        }),

      zoomBy: (delta, pivot) =>
        set((state) => {
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.viewport.zoom + delta));

          if (pivot) {
            const worldBefore = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = { ...state.viewport, zoom: newZoom };
            const worldAfter = utilScreenToWorld(pivot, state.viewport, state.pixelsPerMeter);
            state.viewport = {
              ...state.viewport,
              x: state.viewport.x + (worldAfter.x - worldBefore.x) * state.pixelsPerMeter,
              y: state.viewport.y + (worldAfter.y - worldBefore.y) * state.pixelsPerMeter,
            };
          } else {
            state.viewport = { ...state.viewport, zoom: newZoom };
          }
        }),

      panTo: (worldPoint) =>
        set((state) => {
          state.viewport = {
            ...state.viewport,
            x: state.viewport.width / 2 / state.viewport.zoom - worldPoint.x * state.pixelsPerMeter,
            y: state.viewport.height / 2 / state.viewport.zoom - worldPoint.y * state.pixelsPerMeter,
          };
        }),

      panBy: (deltaX, deltaY) =>
        set((state) => {
          state.viewport = {
            ...state.viewport,
            x: state.viewport.x + deltaX / state.viewport.zoom,
            y: state.viewport.y + deltaY / state.viewport.zoom,
          };
        }),

      panToScreen: (screenPoint) =>
        set((state) => {
          const worldPoint = utilScreenToWorld(screenPoint, state.viewport, state.pixelsPerMeter);
          state.viewport = {
            ...state.viewport,
            x: state.viewport.width / 2 / state.viewport.zoom - worldPoint.x * state.pixelsPerMeter,
            y: state.viewport.height / 2 / state.viewport.zoom - worldPoint.y * state.pixelsPerMeter,
          };
        }),

      resetView: () =>
        set((state) => {
          state.viewport = { ...state.viewport, x: 0, y: 0, zoom: 1 };
        }),

      fitToContent: (bounds, padding = VIEWPORT_PADDING) =>
        set((state) => {
          const { zoom, x, y } = calculateZoomToFit(
            bounds,
            state.viewport.width,
            state.viewport.height,
            state.pixelsPerMeter,
            padding
          );
          state.viewport = { ...state.viewport, zoom, x, y };
        }),

      fitToElements: (elementIds, getElement) => {
        const store = get();
        if (elementIds.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const id of elementIds) {
          const element = getElement(id);
          if (element) {
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + element.width);
            maxY = Math.max(maxY, element.y + element.height);
          }
        }

        if (minX === Infinity) return;

        store.fitToContent({ minX, maxX, minY, maxY });
      },

      setPixelsPerMeter: (ppm) =>
        set((state) => {
          const scaleFactor = ppm / state.pixelsPerMeter;
          state.pixelsPerMeter = ppm;
          state.viewport.x *= scaleFactor;
          state.viewport.y *= scaleFactor;
        }),

      worldToScreen: (point) => {
        const { viewport, pixelsPerMeter } = get();
        return utilWorldToScreen(point, viewport, pixelsPerMeter);
      },

      screenToWorld: (point) => {
        const { viewport, pixelsPerMeter } = get();
        return utilScreenToWorld(point, viewport, pixelsPerMeter);
      },

      worldToScreenRect: (rect) => {
        const { viewport, pixelsPerMeter } = get();
        const topLeft = utilWorldToScreen({ x: rect.x, y: rect.y }, viewport, pixelsPerMeter);
        const bottomRight = utilWorldToScreen(
          { x: rect.x + rect.width, y: rect.y + rect.height },
          viewport,
          pixelsPerMeter
        );
        return {
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        };
      },

      screenToWorldRect: (rect) => {
        const { viewport, pixelsPerMeter } = get();
        const topLeft = utilScreenToWorld({ x: rect.x, y: rect.y }, viewport, pixelsPerMeter);
        const bottomRight = utilScreenToWorld(
          { x: rect.x + rect.width, y: rect.y + rect.height },
          viewport,
          pixelsPerMeter
        );
        return {
          x: topLeft.x,
          y: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        };
      },

      getBounds: () => {
        const { viewport, pixelsPerMeter } = get();
        return getViewportBounds(viewport, pixelsPerMeter);
      },
    }))
  )
);
