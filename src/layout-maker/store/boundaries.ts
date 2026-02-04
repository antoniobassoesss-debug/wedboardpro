/**
 * A4 Canvas Boundary Enforcement
 *
 * All elements must stay within A4 canvas bounds.
 * This module provides clamping functions used by the store
 * to enforce boundaries at the data layer.
 */

export interface A4Bounds {
  x: number;      // Left edge (negative, centered at origin)
  y: number;      // Top edge (negative, centered at origin)
  width: number;  // A4 width in pixels
  height: number; // A4 height in pixels
}

export interface PositionedElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WallElement {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PointElement {
  x: number;
  y: number;
}

/**
 * Clamp a single coordinate value within A4 bounds
 */
function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp element position so it stays fully within A4 bounds.
 * Element is anchored at top-left corner.
 *
 * @returns Clamped x and y coordinates
 */
export function clampPositionToA4(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  a4: A4Bounds
): { x: number; y: number } {
  const minX = a4.x;
  const maxX = a4.x + a4.width - elementWidth;
  const minY = a4.y;
  const maxY = a4.y + a4.height - elementHeight;

  return {
    x: clampValue(x, minX, maxX),
    y: clampValue(y, minY, maxY),
  };
}

/**
 * Clamp element size so it doesn't exceed A4 bounds from current position.
 * Ensures minimum size of 10px to prevent invisible elements.
 *
 * @returns Clamped width and height
 */
export function clampSizeToA4(
  x: number,
  y: number,
  width: number,
  height: number,
  a4: A4Bounds,
  minSize: number = 10
): { width: number; height: number } {
  const maxWidth = a4.x + a4.width - x;
  const maxHeight = a4.y + a4.height - y;

  return {
    width: Math.max(minSize, Math.min(width, maxWidth)),
    height: Math.max(minSize, Math.min(height, maxHeight)),
  };
}

/**
 * Full element clamping - ensures both position and size are within A4.
 * First clamps size, then position with the clamped size.
 */
export function clampElementToA4<T extends PositionedElement>(
  element: T,
  a4: A4Bounds
): T {
  // First ensure size fits within A4 at all
  const clampedWidth = Math.min(element.width, a4.width);
  const clampedHeight = Math.min(element.height, a4.height);

  // Then clamp position with the (possibly adjusted) size
  const { x, y } = clampPositionToA4(
    element.x,
    element.y,
    clampedWidth,
    clampedHeight,
    a4
  );

  return {
    ...element,
    x,
    y,
    width: clampedWidth,
    height: clampedHeight,
  };
}

/**
 * Clamp wall endpoints to A4 bounds.
 * Walls are line elements defined by start and end points.
 */
export function clampWallToA4<T extends WallElement>(
  wall: T,
  a4: A4Bounds
): T {
  const minX = a4.x;
  const maxX = a4.x + a4.width;
  const minY = a4.y;
  const maxY = a4.y + a4.height;

  return {
    ...wall,
    startX: clampValue(wall.startX, minX, maxX),
    startY: clampValue(wall.startY, minY, maxY),
    endX: clampValue(wall.endX, minX, maxX),
    endY: clampValue(wall.endY, minY, maxY),
  };
}

/**
 * Clamp a point element (power point, marker) to A4 bounds.
 */
export function clampPointToA4<T extends PointElement>(
  point: T,
  a4: A4Bounds
): T {
  return {
    ...point,
    x: clampValue(point.x, a4.x, a4.x + a4.width),
    y: clampValue(point.y, a4.y, a4.y + a4.height),
  };
}

/**
 * Check if an element is fully within A4 bounds.
 * Used for validation on load/import.
 */
export function isElementWithinA4(
  element: PositionedElement,
  a4: A4Bounds
): boolean {
  return (
    element.x >= a4.x &&
    element.y >= a4.y &&
    element.x + element.width <= a4.x + a4.width &&
    element.y + element.height <= a4.y + a4.height
  );
}

/**
 * Check if a wall is fully within A4 bounds.
 */
export function isWallWithinA4(
  wall: WallElement,
  a4: A4Bounds
): boolean {
  const minX = a4.x;
  const maxX = a4.x + a4.width;
  const minY = a4.y;
  const maxY = a4.y + a4.height;

  return (
    wall.startX >= minX && wall.startX <= maxX &&
    wall.startY >= minY && wall.startY <= maxY &&
    wall.endX >= minX && wall.endX <= maxX &&
    wall.endY >= minY && wall.endY <= maxY
  );
}

/**
 * Check if a point is within A4 bounds.
 */
export function isPointWithinA4(
  point: PointElement,
  a4: A4Bounds
): boolean {
  return (
    point.x >= a4.x &&
    point.x <= a4.x + a4.width &&
    point.y >= a4.y &&
    point.y <= a4.y + a4.height
  );
}

/**
 * Calculate the default A4 bounds centered at origin.
 * Uses standard A4 aspect ratio (297mm / 210mm ≈ 1.414).
 */
export function calculateA4Bounds(
  screenWidth: number,
  screenHeight: number,
  scaleFactor: number = 0.75
): A4Bounds {
  const A4_ASPECT_RATIO = 297 / 210;

  const targetWidth = screenWidth * scaleFactor;
  const targetHeight = screenHeight * scaleFactor;

  let a4Width: number;
  let a4Height: number;

  if (targetWidth / targetHeight > 1 / A4_ASPECT_RATIO) {
    a4Height = targetHeight;
    a4Width = a4Height / A4_ASPECT_RATIO;
  } else {
    a4Width = targetWidth;
    a4Height = a4Width * A4_ASPECT_RATIO;
  }

  return {
    x: -a4Width / 2,
    y: -a4Height / 2,
    width: a4Width,
    height: a4Height,
  };
}

/**
 * Constrain a resize operation to stay within A4 bounds.
 * Returns the maximum allowed delta for the resize.
 */
export function constrainResizeDelta(
  element: PositionedElement,
  deltaWidth: number,
  deltaHeight: number,
  a4: A4Bounds,
  minSize: number = 10
): { deltaWidth: number; deltaHeight: number } {
  const maxDeltaWidth = (a4.x + a4.width) - (element.x + element.width);
  const maxDeltaHeight = (a4.y + a4.height) - (element.y + element.height);

  const minDeltaWidth = minSize - element.width;
  const minDeltaHeight = minSize - element.height;

  return {
    deltaWidth: clampValue(deltaWidth, minDeltaWidth, maxDeltaWidth),
    deltaHeight: clampValue(deltaHeight, minDeltaHeight, maxDeltaHeight),
  };
}

/**
 * Constrain a move operation to stay within A4 bounds.
 * Returns the maximum allowed delta for the move.
 */
export function constrainMoveDelta(
  element: PositionedElement,
  deltaX: number,
  deltaY: number,
  a4: A4Bounds
): { deltaX: number; deltaY: number } {
  const minDeltaX = a4.x - element.x;
  const maxDeltaX = (a4.x + a4.width - element.width) - element.x;
  const minDeltaY = a4.y - element.y;
  const maxDeltaY = (a4.y + a4.height - element.height) - element.y;

  return {
    deltaX: clampValue(deltaX, minDeltaX, maxDeltaX),
    deltaY: clampValue(deltaY, minDeltaY, maxDeltaY),
  };
}
