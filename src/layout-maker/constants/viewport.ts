/**
 * Viewport Constants
 *
 * Constants for canvas viewport, zoom, and grid settings.
 */

/**
 * Zoom Settings
 */
export const DEFAULT_ZOOM = 1; // 100%
export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 5; // 500%
export const ZOOM_STEP = 0.1; // 10% increments for buttons
export const ZOOM_WHEEL_SENSITIVITY = 0.001; // For smooth scroll zoom

/**
 * Zoom Presets (for quick access)
 */
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3] as const;

/**
 * Scale Settings
 *
 * SINGLE SOURCE OF TRUTH for the entire layout system.
 * 1 meter in real world = 100 pixels on canvas at zoom 1.
 * All element rendering MUST use this constant.
 * wallScale.pxPerMeter from the legacy canvas store must NOT be used for element sizing.
 */
export const DEFAULT_PIXELS_PER_METER = 100;

/**
 * Grid Settings
 */
export const DEFAULT_GRID_SIZE = 0.5; // meters (50cm)
export const MAJOR_GRID_INTERVAL = 10; // Every 10 lines = 5m at default 0.5m grid
export const MIN_GRID_SIZE = 0.1; // 10cm
export const MAX_GRID_SIZE = 2.0; // 2m

/**
 * Snap Settings
 */
export const DEFAULT_SNAP_THRESHOLD = 10; // pixels
export const SNAP_THRESHOLDS = [5, 10, 15, 20] as const;

/**
 * Viewport Padding
 */
export const VIEWPORT_PADDING = 50; // pixels - padding when fitting to bounds
export const RULER_SIZE = 30; // pixels - width/height of rulers

/**
 * Pan Settings
 */
export const PAN_SPEED = 1; // Multiplier for keyboard panning
export const PAN_KEYBOARD_STEP = 50; // pixels per arrow key press
export const PAN_KEYBOARD_STEP_LARGE = 100; // pixels with shift held

/**
 * Animation Settings
 */
export const ZOOM_ANIMATION_DURATION = 200; // ms
export const PAN_ANIMATION_DURATION = 150; // ms

/**
 * Coordinate Conversion Helpers
 */
export function metersToPixels(meters: number, pixelsPerMeter: number = DEFAULT_PIXELS_PER_METER): number {
  return meters * pixelsPerMeter;
}

export function pixelsToMeters(pixels: number, pixelsPerMeter: number = DEFAULT_PIXELS_PER_METER): number {
  return pixels / pixelsPerMeter;
}

/**
 * Clamp zoom to valid range
 */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Round zoom to nearest step
 */
export function roundZoomToStep(zoom: number): number {
  return Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
}

/**
 * Format zoom as percentage string
 */
export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * Format meters for display
 */
export function formatMeters(meters: number, decimals: number = 2): string {
  return `${meters.toFixed(decimals)}m`;
}

/**
 * Format feet for display (conversion from meters)
 */
export function formatFeet(meters: number, decimals: number = 1): string {
  const feet = meters * 3.28084;
  return `${feet.toFixed(decimals)}ft`;
}

/**
 * Format dimension based on unit preference
 */
export function formatDimension(
  meters: number,
  unit: 'meters' | 'feet' = 'meters',
  decimals: number = 2
): string {
  return unit === 'feet' ? formatFeet(meters, decimals) : formatMeters(meters, decimals);
}
