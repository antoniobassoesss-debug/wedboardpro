/**
 * Scale Calculator
 *
 * Central calculation system for the Layout Maker proportion system.
 * Calculates optimal scale and offset to fit a real-world space into a canvas.
 */

import type {
  SpaceBounds,
  CanvasSize,
  ScaleState,
  Point,
} from '../../types/layout-scale';

import {
  metersToPixels as metersToPixelsPure,
  pixelsToMeters as pixelsToMetersPure,
  realToCanvas as realToCanvasPure,
  canvasToReal as canvasToRealPure,
  snapToCleanScale,
  calculateFitScale,
  calculateCenterOffset,
  clampZoom,
  SCALE_CONSTANTS,
} from './scale-utils';

/**
 * Input for scale calculation
 */
export interface CalculateScaleInput {
  spaceBounds: SpaceBounds;
  canvasSize: CanvasSize;
  zoom?: number;              // Default: 1.0
  padding?: number;           // Default: 0.9 (90% of canvas)
  snapToCleanScale?: boolean; // Default: false
}

/**
 * Calculate complete scale state for rendering
 *
 * Algorithm:
 * 1. Apply padding to available canvas dimensions
 * 2. Calculate scaleX = availableWidth / spaceBounds.width
 * 3. Calculate scaleY = availableHeight / spaceBounds.height
 * 4. Use minimum of scaleX and scaleY (to maintain aspect ratio)
 * 5. Optionally snap to clean scale value
 * 6. Apply zoom multiplier
 * 7. Calculate offset to center the rendered space
 * 8. Build and return complete ScaleState with pre-bound conversion functions
 */
export function calculateScale(input: CalculateScaleInput): ScaleState {
  const {
    spaceBounds,
    canvasSize,
    zoom = 1.0,
    padding = SCALE_CONSTANTS.DEFAULT_PADDING,
    snapToCleanScale: shouldSnapToCleanScale = false,
  } = input;

  // Validate inputs
  if (spaceBounds.width <= 0 || spaceBounds.height <= 0) {
    throw new Error('Space bounds must have positive width and height');
  }
  if (canvasSize.width <= 0 || canvasSize.height <= 0) {
    throw new Error('Canvas size must have positive width and height');
  }

  // Step 1-4: Calculate base scale to fit space in canvas with padding
  let basePixelsPerMeter = calculateFitScale(
    spaceBounds.width,
    spaceBounds.height,
    canvasSize.width,
    canvasSize.height,
    padding
  );

  // Step 5: Optionally snap to clean scale
  if (shouldSnapToCleanScale) {
    basePixelsPerMeter = snapToCleanScale(basePixelsPerMeter);
  }

  // Step 6: Apply zoom
  const clampedZoom = clampZoom(zoom);
  const pixelsPerMeter = basePixelsPerMeter * clampedZoom;
  const metersPerPixel = 1 / pixelsPerMeter;

  // Step 7: Calculate offset to center the rendered space
  const offset = calculateCenterOffset(
    spaceBounds.width,
    spaceBounds.height,
    canvasSize.width,
    canvasSize.height,
    pixelsPerMeter
  );

  // Step 8: Build ScaleState with pre-bound conversion functions
  const scaleState: ScaleState = {
    pixelsPerMeter,
    metersPerPixel,
    offset,
    zoom: clampedZoom,
    spaceBounds,
    canvasSize,

    // Pre-bound conversion functions for convenient use
    metersToPixels: (meters: number) => metersToPixelsPure(meters, pixelsPerMeter),
    pixelsToMeters: (pixels: number) => pixelsToMetersPure(pixels, pixelsPerMeter),
    realToCanvas: (realPos: Point) => realToCanvasPure(realPos, pixelsPerMeter, offset),
    canvasToReal: (canvasPos: Point) => canvasToRealPure(canvasPos, pixelsPerMeter, offset),
  };

  return scaleState;
}

/**
 * Calculate scale with zoom applied at a specific point (for zoom-to-cursor)
 *
 * @param currentScale - Current scale state
 * @param newZoom - New zoom level
 * @param cursorCanvas - Cursor position in canvas pixels
 * @returns New scale state with adjusted offset to keep cursor point fixed
 */
export function calculateZoomAtPoint(
  currentScale: ScaleState,
  newZoom: number,
  cursorCanvas: Point
): ScaleState {
  // Get the real-world position under the cursor
  const cursorReal = currentScale.canvasToReal(cursorCanvas);

  // Calculate new scale
  const newScale = calculateScale({
    spaceBounds: currentScale.spaceBounds,
    canvasSize: currentScale.canvasSize,
    zoom: newZoom,
  });

  // Calculate where the cursor would be with new scale
  const newCursorCanvas = newScale.realToCanvas(cursorReal);

  // Adjust offset so cursor stays in place
  const adjustedOffset: Point = {
    x: newScale.offset.x + (cursorCanvas.x - newCursorCanvas.x),
    y: newScale.offset.y + (cursorCanvas.y - newCursorCanvas.y),
  };

  // Return modified scale state
  return {
    ...newScale,
    offset: adjustedOffset,
    realToCanvas: (realPos: Point) =>
      realToCanvasPure(realPos, newScale.pixelsPerMeter, adjustedOffset),
    canvasToReal: (canvasPos: Point) =>
      canvasToRealPure(canvasPos, newScale.pixelsPerMeter, adjustedOffset),
  };
}

/**
 * Calculate scale for a given target scale ratio (e.g., 1:100)
 *
 * @param spaceBounds - Real-world space bounds
 * @param canvasSize - Canvas dimensions
 * @param targetScaleRatio - Target scale ratio (e.g., 100 for 1:100)
 * @returns Scale state or null if target scale won't fit
 */
export function calculateScaleForRatio(
  spaceBounds: SpaceBounds,
  canvasSize: CanvasSize,
  targetScaleRatio: number
): ScaleState | null {
  // At 1:N scale, 1 meter = (1000/N) mm on paper
  // For canvas, we use pixels, so we need to know the desired pixels per meter
  // A common assumption: 1 pixel ≈ 0.26mm at 96 DPI
  // But for simplicity, we'll just use the ratio directly as a guide

  const pixelsPerMeter = targetScaleRatio;

  // Check if this scale will fit the space in the canvas
  const spacePixelWidth = spaceBounds.width * pixelsPerMeter;
  const spacePixelHeight = spaceBounds.height * pixelsPerMeter;

  if (spacePixelWidth > canvasSize.width || spacePixelHeight > canvasSize.height) {
    return null; // Space won't fit at this scale
  }

  const offset = calculateCenterOffset(
    spaceBounds.width,
    spaceBounds.height,
    canvasSize.width,
    canvasSize.height,
    pixelsPerMeter
  );

  return {
    pixelsPerMeter,
    metersPerPixel: 1 / pixelsPerMeter,
    offset,
    zoom: 1.0,
    spaceBounds,
    canvasSize,
    metersToPixels: (meters: number) => metersToPixelsPure(meters, pixelsPerMeter),
    pixelsToMeters: (pixels: number) => pixelsToMetersPure(pixels, pixelsPerMeter),
    realToCanvas: (realPos: Point) => realToCanvasPure(realPos, pixelsPerMeter, offset),
    canvasToReal: (canvasPos: Point) => canvasToRealPure(canvasPos, pixelsPerMeter, offset),
  };
}
