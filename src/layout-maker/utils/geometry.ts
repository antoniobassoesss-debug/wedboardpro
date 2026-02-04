/**
 * Geometry Utilities
 *
 * Mathematical operations for points, angles, rectangles, and circles.
 * All world coordinates are in meters.
 */

import type { BaseElement } from '../types/elements';
import type { WorldPoint } from '../types/viewport';
import type { ViewportBounds } from '../types/viewport';

/**
 * Calculate the distance between two points.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * distance({ x: 0, y: 0 }, { x: 3, y: 4 }) // Returns 5
 * ```
 */
export function distance(p1: WorldPoint, p2: WorldPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the midpoint between two points.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Midpoint coordinates
 *
 * @example
 * ```typescript
 * midpoint({ x: 0, y: 0 }, { x: 4, y: 2 }) // Returns { x: 2, y: 1 }
 * ```
 */
export function midpoint(p1: WorldPoint, p2: WorldPoint): WorldPoint {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Rotate a point around a center point by a given angle.
 *
 * @param point - The point to rotate
 * @param center - The center of rotation
 * @param angleDegrees - Angle in degrees (positive = counterclockwise)
 * @returns Rotated point coordinates
 *
 * @example
 * ```typescript
 * rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90) // Returns { x: 0, y: 1 }
 * ```
 */
export function rotatePoint(
  point: WorldPoint,
  center: WorldPoint,
  angleDegrees: number
): WorldPoint {
  const angleRad = toRadians(angleDegrees);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Convert degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 *
 * @example
 * ```typescript
 * toRadians(180) // Returns Math.PI
 * ```
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 *
 * @example
 * ```typescript
 * toDegrees(Math.PI) // Returns 180
 * ```
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Normalize an angle to the range [0, 360).
 *
 * @param degrees - Angle in degrees
 * @returns Normalized angle in the range [0, 360)
 *
 * @example
 * ```typescript
 * normalizeAngle(450) // Returns 90
 * normalizeAngle(-30) // Returns 330
 * ```
 */
export function normalizeAngle(degrees: number): number {
  let normalized = degrees % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Get the four corner points of an element considering its rotation.
 *
 * @param element - The element with position, dimensions, and rotation
 * @returns Array of four corner points in order: top-left, top-right, bottom-right, bottom-left
 *
 * @example
 * ```typescript
 * const element = { x: 2, y: 3, width: 2, height: 1, rotation: 45 };
 * const corners = getRectCorners(element);
 * ```
 */
export function getRectCorners(element: BaseElement): WorldPoint[] {
  const halfWidth = element.width / 2;
  const halfHeight = element.height / 2;

  const center: WorldPoint = {
    x: element.x + halfWidth,
    y: element.y + halfHeight,
  };

  const corners: WorldPoint[] = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ];

  if (element.rotation === 0) {
    return corners;
  }

  return corners.map((corner) => rotatePoint(corner, center, element.rotation));
}

/**
 * Calculate the axis-aligned bounding box of an element with rotation.
 *
 * @param element - The element with position, dimensions, and rotation
 * @returns The bounding box in world coordinates
 *
 * @example
 * ```typescript
 * const element = { x: 2, y: 3, width: 2, height: 1, rotation: 45 };
 * const bounds = getRotatedBoundingBox(element);
 * // Returns { minX: ..., maxX: ..., minY: ..., maxY: ... }
 * ```
 */
export function getRotatedBoundingBox(element: BaseElement): ViewportBounds {
  const corners = getRectCorners(element);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

/**
 * Check if a point is inside an element's bounding box.
 *
 * @param point - The point to check
 * @param element - The element to check against
 * @returns True if the point is inside the element's bounds
 *
 * @example
 * ```typescript
 * const element = { x: 0, y: 0, width: 2, height: 2, rotation: 0 };
 * pointInRect({ x: 1, y: 1 }, element) // Returns true
 * pointInRect({ x: 3, y: 3 }, element) // Returns false
 * ```
 */
export function pointInRect(point: WorldPoint, element: BaseElement): boolean {
  const bounds = getRotatedBoundingBox(element);
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/**
 * Check if two axis-aligned bounding boxes intersect.
 *
 * @param a - First bounding box
 * @param b - Second bounding box
 * @returns True if the boxes intersect
 *
 * @example
 * ```typescript
 * const a = { minX: 0, maxX: 2, minY: 0, maxY: 2 };
 * const b = { minX: 1, maxX: 3, minY: 1, maxY: 3 };
 * rectsIntersect(a, b) // Returns true
 * ```
 */
export function rectsIntersect(a: ViewportBounds, b: ViewportBounds): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/**
 * Check if a point is inside a circle.
 *
 * @param point - The point to check
 * @param center - The center of the circle
 * @param radius - The radius of the circle in meters
 * @returns True if the point is inside or on the circle
 *
 * @example
 * ```typescript
 * pointInCircle({ x: 0, y: 0 }, { x: 0, y: 0 }, 1) // Returns true (at center)
 * pointInCircle({ x: 1, y: 0 }, { x: 0, y: 0 }, 1) // Returns true (on edge)
 * pointInCircle({ x: 1.5, y: 0 }, { x: 0, y: 0 }, 1) // Returns false (outside)
 * ```
 */
export function pointInCircle(
  point: WorldPoint,
  center: WorldPoint,
  radius: number
): boolean {
  const dist = distance(point, center);
  return dist <= radius;
}

/**
 * Check if a point is on the boundary of an element.
 *
 * @param point - The point to check
 * @param element - The element to check against
 * @param tolerance - Tolerance in meters for considering a point "on" the boundary
 * @returns True if the point is on the element's boundary
 */
export function pointOnBoundary(
  point: WorldPoint,
  element: BaseElement,
  tolerance: number = 0.01
): boolean {
  const bounds = getRotatedBoundingBox(element);
  const { minX, maxX, minY, maxY } = bounds;

  const onXBoundary = Math.abs(point.x - minX) <= tolerance || Math.abs(point.x - maxX) <= tolerance;
  const onYBoundary = Math.abs(point.y - minY) <= tolerance || Math.abs(point.y - maxY) <= tolerance;

  return (onXBoundary && point.y >= minY && point.y <= maxY) ||
         (onYBoundary && point.x >= minX && point.x <= maxX);
}

/**
 * Calculate the area of an element's bounding box.
 *
 * @param element - The element
 * @returns Area in square meters
 */
export function getElementArea(element: BaseElement): number {
  const bounds = getRotatedBoundingBox(element);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return width * height;
}

/**
 * Calculate the perimeter of an element's bounding box.
 *
 * @param element - The element
 * @returns Perimeter in meters
 */
export function getElementPerimeter(element: BaseElement): number {
  const bounds = getRotatedBoundingBox(element);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return 2 * (width + height);
}

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 *
 * @example
 * ```typescript
 * clamp(5, 0, 10) // Returns 5
 * clamp(15, 0, 10) // Returns 10
 * clamp(-5, 0, 10) // Returns 0
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated value
 *
 * @example
 * ```typescript
 * lerp(0, 10, 0.5) // Returns 5
 * lerp(0, 100, 0) // Returns 0
 * lerp(0, 100, 1) // Returns 100
 * ```
 */
export function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Map a value from one range to another.
 *
 * @param value - The value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 *
 * @example
 * ```typescript
 * mapRange(50, 0, 100, 0, 1) // Returns 0.5
 * mapRange(0, -1, 1, 0, 100) // Returns 50
 * ```
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
