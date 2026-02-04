/**
 * Wall Adapter
 *
 * Converts wall data between pixel and meter coordinate systems.
 * The Wall Maker stores walls in pixels, but the proportion system works in meters.
 */

import type { Point } from '../../types/layout-scale';

/**
 * Default pixels per meter used by Wall Maker
 */
export const WALLMAKER_PIXELS_PER_METER = 100;

/**
 * Pixel wall structure (as stored by Wall Maker)
 */
export interface PixelWall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  length?: number;
  angle?: number;
  color?: string;
}

/**
 * Meter wall structure (for proportion system)
 */
export interface MeterWall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  length?: number;
  angle?: number;
  color?: string;
}

/**
 * Convert a single wall from pixel coordinates to meter coordinates.
 *
 * @param wall - Wall in pixel coordinates
 * @param pixelsPerMeter - Scale factor (default: 100)
 * @returns Wall in meter coordinates
 */
export function convertWallToMeters(
  wall: PixelWall,
  pixelsPerMeter: number = WALLMAKER_PIXELS_PER_METER
): MeterWall {
  return {
    id: wall.id,
    start: {
      x: wall.startX / pixelsPerMeter,
      y: wall.startY / pixelsPerMeter,
    },
    end: {
      x: wall.endX / pixelsPerMeter,
      y: wall.endY / pixelsPerMeter,
    },
    thickness: wall.thickness / pixelsPerMeter,
    length: wall.length !== undefined ? wall.length / pixelsPerMeter : undefined,
    angle: wall.angle,
    color: wall.color,
  };
}

/**
 * Convert an array of walls from pixel coordinates to meter coordinates.
 *
 * @param walls - Walls in pixel coordinates
 * @param pixelsPerMeter - Scale factor (default: 100)
 * @returns Walls in meter coordinates
 */
export function convertWallsToMeters(
  walls: PixelWall[],
  pixelsPerMeter: number = WALLMAKER_PIXELS_PER_METER
): MeterWall[] {
  return walls.map((wall) => convertWallToMeters(wall, pixelsPerMeter));
}

/**
 * Convert a single wall from meter coordinates to pixel coordinates.
 *
 * @param wall - Wall in meter coordinates
 * @param pixelsPerMeter - Scale factor (default: 100)
 * @returns Wall in pixel coordinates
 */
export function convertWallToPixels(
  wall: MeterWall,
  pixelsPerMeter: number = WALLMAKER_PIXELS_PER_METER
): PixelWall {
  return {
    id: wall.id,
    startX: wall.start.x * pixelsPerMeter,
    startY: wall.start.y * pixelsPerMeter,
    endX: wall.end.x * pixelsPerMeter,
    endY: wall.end.y * pixelsPerMeter,
    thickness: wall.thickness * pixelsPerMeter,
    length: wall.length !== undefined ? wall.length * pixelsPerMeter : undefined,
    angle: wall.angle,
    color: wall.color,
  };
}

/**
 * Convert an array of walls from meter coordinates to pixel coordinates.
 *
 * @param walls - Walls in meter coordinates
 * @param pixelsPerMeter - Scale factor (default: 100)
 * @returns Walls in pixel coordinates
 */
export function convertWallsToPixels(
  walls: MeterWall[],
  pixelsPerMeter: number = WALLMAKER_PIXELS_PER_METER
): PixelWall[] {
  return walls.map((wall) => convertWallToPixels(wall, pixelsPerMeter));
}

/**
 * Normalize walls to have origin at (0,0).
 * Shifts all wall coordinates so the minimum x and y become 0.
 *
 * @param walls - Walls in pixel coordinates
 * @returns Normalized walls and the offset applied
 */
export function normalizeWalls(walls: PixelWall[]): {
  walls: PixelWall[];
  offset: Point;
} {
  if (walls.length === 0) {
    return { walls: [], offset: { x: 0, y: 0 } };
  }

  // Find minimum x and y
  let minX = Infinity;
  let minY = Infinity;

  walls.forEach((wall) => {
    minX = Math.min(minX, wall.startX, wall.endX);
    minY = Math.min(minY, wall.startY, wall.endY);
  });

  const offset = { x: minX, y: minY };

  // Shift all walls
  const normalizedWalls = walls.map((wall) => ({
    ...wall,
    startX: wall.startX - minX,
    startY: wall.startY - minY,
    endX: wall.endX - minX,
    endY: wall.endY - minY,
  }));

  return { walls: normalizedWalls, offset };
}

/**
 * Normalize meter walls to have origin at (0,0).
 *
 * @param walls - Walls in meter coordinates
 * @returns Normalized walls and the offset applied
 */
export function normalizeMeterWalls(walls: MeterWall[]): {
  walls: MeterWall[];
  offset: Point;
} {
  if (walls.length === 0) {
    return { walls: [], offset: { x: 0, y: 0 } };
  }

  // Find minimum x and y
  let minX = Infinity;
  let minY = Infinity;

  walls.forEach((wall) => {
    minX = Math.min(minX, wall.start.x, wall.end.x);
    minY = Math.min(minY, wall.start.y, wall.end.y);
  });

  const offset = { x: minX, y: minY };

  // Shift all walls
  const normalizedWalls = walls.map((wall) => ({
    ...wall,
    start: {
      x: wall.start.x - minX,
      y: wall.start.y - minY,
    },
    end: {
      x: wall.end.x - minX,
      y: wall.end.y - minY,
    },
  }));

  return { walls: normalizedWalls, offset };
}

/**
 * Calculate the total length of all walls.
 *
 * @param walls - Walls in pixel coordinates
 * @param pixelsPerMeter - Scale factor for meter conversion
 * @returns Total length in meters
 */
export function calculateTotalWallLength(
  walls: PixelWall[],
  pixelsPerMeter: number = WALLMAKER_PIXELS_PER_METER
): number {
  return walls.reduce((total, wall) => {
    if (wall.length !== undefined) {
      return total + wall.length / pixelsPerMeter;
    }
    // Calculate length from coordinates
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    const lengthPx = Math.sqrt(dx * dx + dy * dy);
    return total + lengthPx / pixelsPerMeter;
  }, 0);
}
