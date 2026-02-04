/**
 * Space Bounds Calculator
 *
 * Extracts SpaceBounds from wall vertices for the proportion system.
 * Normalizes coordinates so the space origin is at (0,0).
 */

import type { SpaceBounds, Point } from '../../types/layout-scale';

/**
 * Wall interface for bounds calculation
 * Matches the structure used in Wall Maker (pixel coordinates)
 */
export interface WallForBounds {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Wall interface with meter coordinates
 */
export interface MeterWall {
  start: Point;
  end: Point;
}

/**
 * Calculate the bounding box from an array of walls in pixel coordinates.
 * Converts to meters and normalizes coordinates so minX and minY are 0.
 *
 * @param walls - Array of walls with pixel coordinates
 * @param pixelsPerMeter - Scale factor for conversion (default: 100)
 * @returns SpaceBounds in meters, or null if no valid bounds
 */
export function calculateSpaceBoundsFromPixelWalls(
  walls: WallForBounds[],
  pixelsPerMeter: number = 100
): SpaceBounds | null {
  if (walls.length === 0 || pixelsPerMeter <= 0) {
    return null;
  }

  // Extract all vertices
  const vertices: Point[] = [];
  walls.forEach((wall) => {
    vertices.push({ x: wall.startX, y: wall.startY });
    vertices.push({ x: wall.endX, y: wall.endY });
  });

  // Find extremes in pixels
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);

  const rawMinX = Math.min(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxX = Math.max(...xs);
  const rawMaxY = Math.max(...ys);

  // Calculate dimensions in pixels
  const widthPx = rawMaxX - rawMinX;
  const heightPx = rawMaxY - rawMinY;

  // Validate
  if (widthPx <= 0 || heightPx <= 0) {
    return null;
  }

  // Convert to meters
  const width = widthPx / pixelsPerMeter;
  const height = heightPx / pixelsPerMeter;

  // Return normalized bounds (origin at 0,0)
  return {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
  };
}

/**
 * Calculate the bounding box from an array of walls in meter coordinates.
 * Normalizes coordinates so minX and minY are 0.
 *
 * @param walls - Array of walls with meter coordinates
 * @returns SpaceBounds in meters, or null if no valid bounds
 */
export function calculateSpaceBounds(walls: MeterWall[]): SpaceBounds | null {
  if (walls.length === 0) {
    return null;
  }

  // Extract all vertices
  const vertices: Point[] = [];
  walls.forEach((wall) => {
    vertices.push(wall.start);
    vertices.push(wall.end);
  });

  // Find extremes
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);

  const rawMinX = Math.min(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxX = Math.max(...xs);
  const rawMaxY = Math.max(...ys);

  // Calculate dimensions
  const width = rawMaxX - rawMinX;
  const height = rawMaxY - rawMinY;

  // Validate
  if (width <= 0 || height <= 0) {
    return null;
  }

  // Return normalized bounds (origin at 0,0)
  return {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
  };
}

/**
 * Get the offset needed to normalize wall coordinates to origin (0,0).
 * This is the vector to subtract from all wall coordinates.
 *
 * @param walls - Array of walls with pixel coordinates
 * @returns Offset point in pixels, or null if no walls
 */
export function getWallNormalizationOffset(walls: WallForBounds[]): Point | null {
  if (walls.length === 0) {
    return null;
  }

  const vertices: Point[] = [];
  walls.forEach((wall) => {
    vertices.push({ x: wall.startX, y: wall.startY });
    vertices.push({ x: wall.endX, y: wall.endY });
  });

  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
  };
}

/**
 * Get the offset in meter coordinates.
 *
 * @param walls - Array of walls with pixel coordinates
 * @param pixelsPerMeter - Scale factor for conversion
 * @returns Offset point in meters, or null if no walls
 */
export function getWallNormalizationOffsetMeters(
  walls: WallForBounds[],
  pixelsPerMeter: number = 100
): Point | null {
  const offsetPx = getWallNormalizationOffset(walls);
  if (!offsetPx) return null;

  return {
    x: offsetPx.x / pixelsPerMeter,
    y: offsetPx.y / pixelsPerMeter,
  };
}

/**
 * Normalize a point by subtracting the offset.
 * Used to convert wall coordinates to normalized space coordinates.
 *
 * @param point - Point to normalize
 * @param offset - Offset to subtract
 * @returns Normalized point
 */
export function normalizePoint(point: Point, offset: Point): Point {
  return {
    x: point.x - offset.x,
    y: point.y - offset.y,
  };
}

/**
 * Convert a point from pixel coordinates to meter coordinates.
 *
 * @param point - Point in pixels
 * @param pixelsPerMeter - Scale factor
 * @returns Point in meters
 */
export function pixelPointToMeters(point: Point, pixelsPerMeter: number): Point {
  return {
    x: point.x / pixelsPerMeter,
    y: point.y / pixelsPerMeter,
  };
}

/**
 * Convert a point from meter coordinates to pixel coordinates.
 *
 * @param point - Point in meters
 * @param pixelsPerMeter - Scale factor
 * @returns Point in pixels
 */
export function meterPointToPixels(point: Point, pixelsPerMeter: number): Point {
  return {
    x: point.x * pixelsPerMeter,
    y: point.y * pixelsPerMeter,
  };
}

/**
 * Calculate space bounds with additional padding.
 *
 * @param bounds - Original bounds
 * @param paddingMeters - Padding to add on all sides (in meters)
 * @returns Padded bounds
 */
export function addPaddingToBounds(
  bounds: SpaceBounds,
  paddingMeters: number
): SpaceBounds {
  const width = bounds.width + paddingMeters * 2;
  const height = bounds.height + paddingMeters * 2;

  return {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
  };
}

/**
 * Check if a point is within the space bounds.
 *
 * @param point - Point to check (in meters)
 * @param bounds - Space bounds
 * @returns True if point is within bounds
 */
export function isPointInBounds(point: Point, bounds: SpaceBounds): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Clamp a point to stay within bounds.
 *
 * @param point - Point to clamp (in meters)
 * @param bounds - Space bounds
 * @returns Clamped point
 */
export function clampPointToBounds(point: Point, bounds: SpaceBounds): Point {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y)),
  };
}
