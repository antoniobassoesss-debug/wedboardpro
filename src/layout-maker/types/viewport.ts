/**
 * Viewport Type Definitions
 *
 * Types for canvas viewport, coordinates, and transformations.
 */

/**
 * World Point
 *
 * A point in world/canvas coordinates (meters).
 */
export interface WorldPoint {
  x: number;
  y: number;
}

/**
 * Screen Point
 *
 * A point in screen/pixel coordinates.
 */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Viewport State
 *
 * Current viewport position and zoom level.
 */
export interface ViewportState {
  x: number; // Pan offset X (world coordinates)
  y: number; // Pan offset Y (world coordinates)
  zoom: number; // Zoom level (1 = 100%)
  width: number; // Viewport width in pixels
  height: number; // Viewport height in pixels
}

/**
 * Viewport Bounds
 *
 * Visible area bounds in world coordinates.
 */
export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Zoom Limits
 */
export const ZOOM_MIN = 0.1; // 10%
export const ZOOM_MAX = 5.0; // 500%
export const ZOOM_STEP = 0.1; // 10% increments for buttons

/**
 * Default Viewport
 */
export const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
  width: 0,
  height: 0,
};

/**
 * Convert screen point to world point
 */
export function screenToWorld(
  screen: ScreenPoint,
  viewport: ViewportState,
  pixelsPerMeter: number
): WorldPoint {
  return {
    x: (screen.x / viewport.zoom - viewport.x) / pixelsPerMeter,
    y: (screen.y / viewport.zoom - viewport.y) / pixelsPerMeter,
  };
}

/**
 * Convert world point to screen point
 */
export function worldToScreen(
  world: WorldPoint,
  viewport: ViewportState,
  pixelsPerMeter: number
): ScreenPoint {
  return {
    x: (world.x * pixelsPerMeter + viewport.x) * viewport.zoom,
    y: (world.y * pixelsPerMeter + viewport.y) * viewport.zoom,
  };
}

/**
 * Get viewport bounds in world coordinates
 */
export function getViewportBounds(
  viewport: ViewportState,
  pixelsPerMeter: number
): ViewportBounds {
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport, pixelsPerMeter);
  const bottomRight = screenToWorld(
    { x: viewport.width, y: viewport.height },
    viewport,
    pixelsPerMeter
  );

  return {
    minX: topLeft.x,
    maxX: bottomRight.x,
    minY: topLeft.y,
    maxY: bottomRight.y,
  };
}

/**
 * Clamp zoom to valid range
 */
export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

/**
 * Calculate zoom to fit bounds in viewport
 */
export function calculateZoomToFit(
  bounds: ViewportBounds,
  viewportWidth: number,
  viewportHeight: number,
  pixelsPerMeter: number,
  padding: number = 50 // Padding in pixels
): { zoom: number; x: number; y: number } {
  const boundsWidth = (bounds.maxX - bounds.minX) * pixelsPerMeter;
  const boundsHeight = (bounds.maxY - bounds.minY) * pixelsPerMeter;

  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;

  const zoomX = availableWidth / boundsWidth;
  const zoomY = availableHeight / boundsHeight;
  const zoom = clampZoom(Math.min(zoomX, zoomY));

  // Center the bounds
  const centerX = (bounds.minX + bounds.maxX) / 2 * pixelsPerMeter;
  const centerY = (bounds.minY + bounds.maxY) / 2 * pixelsPerMeter;

  const x = viewportWidth / 2 / zoom - centerX;
  const y = viewportHeight / 2 / zoom - centerY;

  return { zoom, x, y };
}
