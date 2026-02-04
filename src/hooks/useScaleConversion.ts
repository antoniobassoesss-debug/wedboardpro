/**
 * Scale Conversion Hooks
 *
 * Convenience hooks for using scale conversions in components.
 * Provides null-safe wrappers around scale state functions.
 */

import { useCallback, useMemo } from 'react';
import type { Point, ScaleState } from '../types/layout-scale';
import { useLayoutScale } from '../contexts/LayoutScaleContext';
import { snapToGrid } from '../lib/layout/scale-utils';

/**
 * Return type for useScaleConversion hook
 */
export interface ScaleConversionResult {
  // Current scale state (null if not ready)
  scale: ScaleState | null;

  // Whether scale is ready for use
  isReady: boolean;

  // Pixels per meter (null if not ready)
  pixelsPerMeter: number | null;

  // Conversion functions (return null if scale not ready)
  metersToPixels: (meters: number) => number | null;
  pixelsToMeters: (pixels: number) => number | null;
  realToCanvas: (realPos: Point) => Point | null;
  canvasToReal: (canvasPos: Point) => Point | null;

  // Conversion with grid snap
  canvasToRealSnapped: (canvasPos: Point) => Point | null;

  // Convert dimensions
  dimensionsToPixels: (width: number, height: number) => { width: number; height: number } | null;
  dimensionsToMeters: (width: number, height: number) => { width: number; height: number } | null;
}

/**
 * Hook for using scale conversions in components
 *
 * Provides null-safe wrappers around scale state functions.
 * All conversion functions return null if scale is not ready.
 */
export function useScaleConversion(): ScaleConversionResult {
  const { scale, gridConfig } = useLayoutScale();

  const isReady = scale !== null;
  const pixelsPerMeter = scale?.pixelsPerMeter ?? null;

  // Convert meters to pixels
  const metersToPixels = useCallback(
    (meters: number): number | null => {
      if (!scale) return null;
      return scale.metersToPixels(meters);
    },
    [scale]
  );

  // Convert pixels to meters
  const pixelsToMeters = useCallback(
    (pixels: number): number | null => {
      if (!scale) return null;
      return scale.pixelsToMeters(pixels);
    },
    [scale]
  );

  // Convert real-world position to canvas position
  const realToCanvas = useCallback(
    (realPos: Point): Point | null => {
      if (!scale) return null;
      return scale.realToCanvas(realPos);
    },
    [scale]
  );

  // Convert canvas position to real-world position
  const canvasToReal = useCallback(
    (canvasPos: Point): Point | null => {
      if (!scale) return null;
      return scale.canvasToReal(canvasPos);
    },
    [scale]
  );

  // Convert canvas position to real-world position with grid snap
  const canvasToRealSnapped = useCallback(
    (canvasPos: Point): Point | null => {
      if (!scale) return null;
      const realPos = scale.canvasToReal(canvasPos);
      if (gridConfig.enabled) {
        return snapToGrid(realPos, gridConfig.size);
      }
      return realPos;
    },
    [scale, gridConfig.enabled, gridConfig.size]
  );

  // Convert dimensions from meters to pixels
  const dimensionsToPixels = useCallback(
    (width: number, height: number): { width: number; height: number } | null => {
      if (!scale) return null;
      return {
        width: scale.metersToPixels(width),
        height: scale.metersToPixels(height),
      };
    },
    [scale]
  );

  // Convert dimensions from pixels to meters
  const dimensionsToMeters = useCallback(
    (width: number, height: number): { width: number; height: number } | null => {
      if (!scale) return null;
      return {
        width: scale.pixelsToMeters(width),
        height: scale.pixelsToMeters(height),
      };
    },
    [scale]
  );

  return {
    scale,
    isReady,
    pixelsPerMeter,
    metersToPixels,
    pixelsToMeters,
    realToCanvas,
    canvasToReal,
    canvasToRealSnapped,
    dimensionsToPixels,
    dimensionsToMeters,
  };
}

/**
 * Hook for element positioning
 *
 * Converts real-world element position and dimensions to canvas pixels.
 */
export function useElementPosition(
  position: Point | null,
  width: number,
  height: number
): {
  canvasPosition: Point | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  isReady: boolean;
} {
  const { scale } = useLayoutScale();

  return useMemo(() => {
    if (!scale || !position) {
      return {
        canvasPosition: null,
        canvasWidth: null,
        canvasHeight: null,
        isReady: false,
      };
    }

    return {
      canvasPosition: scale.realToCanvas(position),
      canvasWidth: scale.metersToPixels(width),
      canvasHeight: scale.metersToPixels(height),
      isReady: true,
    };
  }, [scale, position, width, height]);
}

/**
 * Hook for grid calculations
 *
 * Provides grid-related utilities.
 */
export function useGridCalculations(): {
  gridSizePixels: number | null;
  snapPositionToGrid: (realPos: Point) => Point;
  isSnapEnabled: boolean;
  isGridVisible: boolean;
} {
  const { scale, gridConfig } = useLayoutScale();

  const gridSizePixels = useMemo(() => {
    if (!scale) return null;
    return scale.metersToPixels(gridConfig.size);
  }, [scale, gridConfig.size]);

  const snapPositionToGrid = useCallback(
    (realPos: Point): Point => {
      if (!gridConfig.enabled) return realPos;
      return snapToGrid(realPos, gridConfig.size);
    },
    [gridConfig.enabled, gridConfig.size]
  );

  return {
    gridSizePixels,
    snapPositionToGrid,
    isSnapEnabled: gridConfig.enabled,
    isGridVisible: gridConfig.visible,
  };
}

/**
 * Hook for zoom state
 *
 * Provides zoom level and formatted display string.
 */
export function useZoomState(): {
  zoom: number;
  zoomPercent: number;
  zoomDisplay: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
} {
  const { zoom } = useLayoutScale();

  return useMemo(() => {
    const { MIN_ZOOM, MAX_ZOOM } = require('../lib/layout/scale-utils').SCALE_CONSTANTS;

    return {
      zoom,
      zoomPercent: Math.round(zoom * 100),
      zoomDisplay: `${Math.round(zoom * 100)}%`,
      canZoomIn: zoom < MAX_ZOOM,
      canZoomOut: zoom > MIN_ZOOM,
    };
  }, [zoom]);
}
