/**
 * Space Bounds From Walls Hook
 *
 * Automatically updates SpaceBounds when walls change.
 * Connects the Wall Maker output to the Layout Scale Context.
 */

import { useEffect, useMemo } from 'react';
import { useLayoutScale } from '../contexts/LayoutScaleContext';
import {
  calculateSpaceBoundsFromPixelWalls,
  getWallNormalizationOffset,
  type WallForBounds,
} from '../lib/layout/space-bounds';
import { WALLMAKER_PIXELS_PER_METER } from '../lib/layout/wall-adapter';
import type { Point, SpaceBounds } from '../types/layout-scale';

/**
 * Options for the hook
 */
export interface UseSpaceBoundsFromWallsOptions {
  /** Pixels per meter scale factor (default: 100) */
  pixelsPerMeter?: number;
  /** Additional padding in meters to add around the space */
  paddingMeters?: number;
  /** Minimum space size in meters (for very small or empty wall sets) */
  minSpaceSize?: number;
}

/**
 * Return type for the hook
 */
export interface UseSpaceBoundsFromWallsResult {
  /** Current space bounds (null if no valid walls) */
  spaceBounds: SpaceBounds | null;
  /** Offset needed to normalize wall coordinates to origin */
  normalizationOffset: Point | null;
  /** Whether bounds are ready */
  isReady: boolean;
}

/**
 * Hook that automatically updates SpaceBounds when walls change.
 *
 * @param walls - Array of walls from the Wall Maker (pixel coordinates)
 * @param options - Configuration options
 * @returns Space bounds and normalization data
 *
 * @example
 * ```tsx
 * function LayoutMakerCanvas() {
 *   const walls = useCanvasStore(s => Object.values(s.walls));
 *   const { spaceBounds, isReady } = useSpaceBoundsFromWalls(walls);
 *
 *   if (!isReady) {
 *     return <div>Draw walls to define the space...</div>;
 *   }
 *
 *   return <Canvas />;
 * }
 * ```
 */
export function useSpaceBoundsFromWalls(
  walls: WallForBounds[],
  options: UseSpaceBoundsFromWallsOptions = {}
): UseSpaceBoundsFromWallsResult {
  const {
    pixelsPerMeter = WALLMAKER_PIXELS_PER_METER,
    paddingMeters = 0,
    minSpaceSize = 1,
  } = options;

  const { setSpaceBounds } = useLayoutScale();

  // Calculate space bounds from walls
  const spaceBounds = useMemo(() => {
    const bounds = calculateSpaceBoundsFromPixelWalls(walls, pixelsPerMeter);

    if (!bounds) {
      return null;
    }

    // Apply minimum size
    const width = Math.max(bounds.width, minSpaceSize);
    const height = Math.max(bounds.height, minSpaceSize);

    // Apply padding
    const paddedWidth = width + paddingMeters * 2;
    const paddedHeight = height + paddingMeters * 2;

    return {
      minX: 0,
      minY: 0,
      maxX: paddedWidth,
      maxY: paddedHeight,
      width: paddedWidth,
      height: paddedHeight,
    };
  }, [walls, pixelsPerMeter, paddingMeters, minSpaceSize]);

  // Calculate normalization offset
  const normalizationOffset = useMemo(() => {
    return getWallNormalizationOffset(walls);
  }, [walls]);

  // Update context when bounds change
  useEffect(() => {
    setSpaceBounds(spaceBounds);
  }, [spaceBounds, setSpaceBounds]);

  return {
    spaceBounds,
    normalizationOffset,
    isReady: spaceBounds !== null,
  };
}

/**
 * Hook variant that accepts walls from the canvas store directly.
 * Use this when you want the hook to connect to the store itself.
 *
 * @param getWalls - Function to extract walls from store (called on each render)
 * @param options - Configuration options
 */
export function useSpaceBoundsFromWallsSelector<T>(
  wallsSelector: () => WallForBounds[],
  options: UseSpaceBoundsFromWallsOptions = {}
): UseSpaceBoundsFromWallsResult {
  // Get walls using the selector
  const walls = wallsSelector();

  // Delegate to main hook
  return useSpaceBoundsFromWalls(walls, options);
}

/**
 * Create default space bounds for when no walls exist.
 * Useful for initial state or empty layouts.
 *
 * @param widthMeters - Default width in meters
 * @param heightMeters - Default height in meters
 * @returns Default space bounds
 */
export function createDefaultSpaceBounds(
  widthMeters: number = 10,
  heightMeters: number = 10
): SpaceBounds {
  return {
    minX: 0,
    minY: 0,
    maxX: widthMeters,
    maxY: heightMeters,
    width: widthMeters,
    height: heightMeters,
  };
}
