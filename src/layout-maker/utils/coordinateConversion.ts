/**
 * Coordinate Conversion Utilities
 *
 * Functions for converting between world coordinates (meters) and screen coordinates (pixels).
 */

import type { WorldPoint, ScreenPoint, ViewportState } from '../types/viewport';

/**
 * Convert a world point to screen coordinates.
 *
 * @param worldPoint - Point in world coordinates (meters, relative to canvas origin)
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor (pixels per meter)
 * @returns Point in screen coordinates (pixels)
 *
 * @example
 * ```typescript
 * const screen = worldToScreen(
 *   { x: 5, y: 3 },
 *   { x: 100, y: 50, zoom: 1, width: 800, height: 600 },
 *   100
 * );
 * // Returns { x: 600, y: 350 }
 * ```
 */
export function worldToScreen(
  worldPoint: WorldPoint,
  viewport: ViewportState,
  pixelsPerMeter: number
): ScreenPoint {
  return {
    x: (worldPoint.x * pixelsPerMeter + viewport.x) * viewport.zoom,
    y: (worldPoint.y * pixelsPerMeter + viewport.y) * viewport.zoom,
  };
}

/**
 * Convert a screen point to world coordinates.
 *
 * @param screenPoint - Point in screen coordinates (pixels)
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor (pixels per meter)
 * @returns Point in world coordinates (meters)
 *
 * @example
 * ```typescript
 * const world = screenToWorld(
 *   { x: 600, y: 350 },
 *   { x: 100, y: 50, zoom: 1, width: 800, height: 600 },
 *   100
 * );
 * // Returns { x: 5, y: 3 }
 * ```
 */
export function screenToWorld(
  screenPoint: ScreenPoint,
  viewport: ViewportState,
  pixelsPerMeter: number
): WorldPoint {
  return {
    x: (screenPoint.x / viewport.zoom - viewport.x) / pixelsPerMeter,
    y: (screenPoint.y / viewport.zoom - viewport.y) / pixelsPerMeter,
  };
}

/**
 * Convert meters to pixels.
 *
 * @param meters - Distance in meters
 * @param pixelsPerMeter - Scale factor (pixels per meter)
 * @returns Distance in pixels
 *
 * @example
 * ```typescript
 * metersToPixels(2.5, 100) // Returns 250
 * ```
 */
export function metersToPixels(meters: number, pixelsPerMeter: number): number {
  return meters * pixelsPerMeter;
}

/**
 * Convert pixels to meters.
 *
 * @param pixels - Distance in pixels
 * @param pixelsPerMeter - Scale factor (pixels per meter)
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * pixelsToMeters(250, 100) // Returns 2.5
 * ```
 */
export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
  return pixels / pixelsPerMeter;
}

/**
 * Calculate the SVG viewBox string for the canvas.
 *
 * @param viewport - Current viewport state
 * @param canvasWidth - Width of the canvas element in pixels
 * @param canvasHeight - Height of the canvas element in pixels
 * @returns SVG viewBox string
 *
 * @example
 * ```typescript
 * const viewBox = calculateViewBox(
 *   { x: 100, y: 50, zoom: 2, width: 800, height: 600 },
 *   800,
 *   600
 * );
 * // Returns "50 25 400 300"
 * ```
 */
export function calculateViewBox(
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number
): string {
  const viewX = viewport.x * viewport.zoom;
  const viewY = viewport.y * viewport.zoom;
  const viewWidth = canvasWidth / viewport.zoom;
  const viewHeight = canvasHeight / viewport.zoom;

  return `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
}

/**
 * Convert a world rectangle to screen coordinates.
 *
 * @param rect - Rectangle in world coordinates
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns Rectangle in screen coordinates
 */
export function worldRectToScreen(
  rect: { x: number; y: number; width: number; height: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): { x: number; y: number; width: number; height: number } {
  const topLeft = worldToScreen({ x: rect.x, y: rect.y }, viewport, pixelsPerMeter);
  const bottomRight = worldToScreen(
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
}

/**
 * Convert a screen rectangle to world coordinates.
 *
 * @param rect - Rectangle in screen coordinates
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns Rectangle in world coordinates
 */
export function screenRectToWorld(
  rect: { x: number; y: number; width: number; height: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): { x: number; y: number; width: number; height: number } {
  const topLeft = screenToWorld({ x: rect.x, y: rect.y }, viewport, pixelsPerMeter);
  const bottomRight = screenToWorld(
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
}

/**
 * Get the screen position of an element for rendering.
 *
 * @param element - The element with world coordinates
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns Screen position and dimensions
 */
export function getElementScreenRect(
  element: { x: number; y: number; width: number; height: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): { x: number; y: number; width: number; height: number } {
  return worldRectToScreen(
    {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
    viewport,
    pixelsPerMeter
  );
}

/**
 * Convert a delta in world units to screen pixels.
 *
 * @param delta - Delta in world coordinates (meters)
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns Delta in screen coordinates (pixels)
 */
export function worldDeltaToScreen(
  delta: { dx: number; dy: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): { dx: number; dy: number } {
  return {
    dx: delta.dx * pixelsPerMeter * viewport.zoom,
    dy: delta.dy * pixelsPerMeter * viewport.zoom,
  };
}

/**
 * Convert a delta in screen pixels to world units.
 *
 * @param delta - Delta in screen coordinates (pixels)
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns Delta in world coordinates (meters)
 */
export function screenDeltaToWorld(
  delta: { dx: number; dy: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): { dx: number; dy: number } {
  return {
    dx: delta.dx / viewport.zoom / pixelsPerMeter,
    dy: delta.dy / viewport.zoom / pixelsPerMeter,
  };
}

/**
 * Calculate the zoom level needed to fit a world rectangle in the viewport.
 *
 * @param bounds - World coordinates bounds to fit
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @param pixelsPerMeter - Scale factor
 * @param padding - Padding in pixels (default: 50)
 * @returns Zoom level
 */
export function calculateZoomToFitBounds(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  viewportWidth: number,
  viewportHeight: number,
  pixelsPerMeter: number,
  padding: number = 50
): number {
  const boundsWidth = (bounds.maxX - bounds.minX) * pixelsPerMeter;
  const boundsHeight = (bounds.maxY - bounds.minY) * pixelsPerMeter;

  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;

  const zoomX = availableWidth / boundsWidth;
  const zoomY = availableHeight / boundsHeight;

  return Math.min(zoomX, zoomY);
}

/**
 * Check if a world point is currently visible in the viewport.
 *
 * @param point - World point to check
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns True if the point is visible
 */
export function isPointInViewport(
  point: WorldPoint,
  viewport: ViewportState,
  pixelsPerMeter: number
): boolean {
  const screenPoint = worldToScreen(point, viewport, pixelsPerMeter);

  return (
    screenPoint.x >= 0 &&
    screenPoint.x <= viewport.width &&
    screenPoint.y >= 0 &&
    screenPoint.y <= viewport.height
  );
}

/**
 * Check if a world rectangle is visible in the viewport.
 *
 * @param rect - World rectangle to check
 * @param viewport - Current viewport state
 * @param pixelsPerMeter - Scale factor
 * @returns True if any part of the rectangle is visible
 */
export function isRectInViewport(
  rect: { x: number; y: number; width: number; height: number },
  viewport: ViewportState,
  pixelsPerMeter: number
): boolean {
  const screenRect = worldRectToScreen(rect, viewport, pixelsPerMeter);

  return !(
    screenRect.x + screenRect.width < 0 ||
    screenRect.x > viewport.width ||
    screenRect.y + screenRect.height < 0 ||
    screenRect.y > viewport.height
  );
}
