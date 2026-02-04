/**
 * Scale Utilities
 *
 * Pure utility functions for the Layout Maker proportion system.
 * No React or DOM dependencies - fully testable standalone functions.
 */

import type {
  Point,
  ElementDimensions,
  LayoutElement,
  ElementRenderData,
  AnchorPoint,
} from '../../types/layout-scale';
import { DEFAULT_ANCHOR } from '../../types/layout-scale';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PADDING = 0.9;
const DEFAULT_GRID_SIZE = 0.1;        // 10cm grid
const DEFAULT_SNAP_PRECISION = 0.01;  // 1cm precision
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.1;

// Clean scale values for user-friendly display (1:N format)
const CLEAN_SCALES = [10, 20, 25, 40, 50, 100, 200, 250, 500, 1000];

export const SCALE_CONSTANTS = {
  DEFAULT_PADDING,
  DEFAULT_GRID_SIZE,
  DEFAULT_SNAP_PRECISION,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  CLEAN_SCALES,
} as const;

// ============================================================================
// Pure Conversion Functions
// ============================================================================

/**
 * Convert meters to pixels
 * @param meters - Distance in meters
 * @param pixelsPerMeter - Scale factor
 * @returns Distance in pixels
 */
export function metersToPixels(meters: number, pixelsPerMeter: number): number {
  if (!Number.isFinite(meters) || !Number.isFinite(pixelsPerMeter)) {
    return 0;
  }
  return meters * pixelsPerMeter;
}

/**
 * Convert pixels to meters
 * @param pixels - Distance in pixels
 * @param pixelsPerMeter - Scale factor
 * @returns Distance in meters
 */
export function pixelsToMeters(pixels: number, pixelsPerMeter: number): number {
  if (!Number.isFinite(pixels) || !Number.isFinite(pixelsPerMeter) || pixelsPerMeter === 0) {
    return 0;
  }
  return pixels / pixelsPerMeter;
}

/**
 * Convert real-world position to canvas position
 * @param realPos - Position in meters
 * @param pixelsPerMeter - Scale factor
 * @param offset - Canvas offset in pixels
 * @returns Position in canvas pixels
 */
export function realToCanvas(
  realPos: Point,
  pixelsPerMeter: number,
  offset: Point
): Point {
  if (!Number.isFinite(pixelsPerMeter)) {
    return { x: offset.x, y: offset.y };
  }
  return {
    x: realPos.x * pixelsPerMeter + offset.x,
    y: realPos.y * pixelsPerMeter + offset.y,
  };
}

/**
 * Convert canvas position to real-world position
 * @param canvasPos - Position in canvas pixels
 * @param pixelsPerMeter - Scale factor
 * @param offset - Canvas offset in pixels
 * @returns Position in meters
 */
export function canvasToReal(
  canvasPos: Point,
  pixelsPerMeter: number,
  offset: Point
): Point {
  if (!Number.isFinite(pixelsPerMeter) || pixelsPerMeter === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (canvasPos.x - offset.x) / pixelsPerMeter,
    y: (canvasPos.y - offset.y) / pixelsPerMeter,
  };
}

// ============================================================================
// Grid Snapping
// ============================================================================

/**
 * Snap a position to the nearest grid point
 * @param realPos - Position in meters
 * @param gridSize - Grid cell size in meters
 * @returns Snapped position in meters
 */
export function snapToGrid(realPos: Point, gridSize: number): Point {
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    return { ...realPos };
  }
  return {
    x: Math.round(realPos.x / gridSize) * gridSize,
    y: Math.round(realPos.y / gridSize) * gridSize,
  };
}

/**
 * Snap a single value to the nearest grid point
 * @param value - Value in meters
 * @param gridSize - Grid cell size in meters
 * @returns Snapped value in meters
 */
export function snapValueToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

// ============================================================================
// Clean Scale Snapping
// ============================================================================

/**
 * Snap a raw scale to the nearest clean scale value
 * Clean scales are user-friendly values like 1:50, 1:100, 1:200
 * @param rawScale - Raw scale value
 * @returns Nearest clean scale value
 */
export function snapToCleanScale(rawScale: number): number {
  if (!Number.isFinite(rawScale) || rawScale <= 0) {
    return CLEAN_SCALES[0];
  }

  // Find the largest clean scale that doesn't exceed rawScale
  let result = CLEAN_SCALES[0];
  for (const scale of CLEAN_SCALES) {
    if (scale <= rawScale) {
      result = scale;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Get the next larger clean scale
 * @param currentScale - Current scale value
 * @returns Next larger clean scale, or max if already at max
 */
export function getNextLargerScale(currentScale: number): number {
  for (const scale of CLEAN_SCALES) {
    if (scale > currentScale) {
      return scale;
    }
  }
  return CLEAN_SCALES[CLEAN_SCALES.length - 1];
}

/**
 * Get the next smaller clean scale
 * @param currentScale - Current scale value
 * @returns Next smaller clean scale, or min if already at min
 */
export function getNextSmallerScale(currentScale: number): number {
  for (let i = CLEAN_SCALES.length - 1; i >= 0; i--) {
    if (CLEAN_SCALES[i] < currentScale) {
      return CLEAN_SCALES[i];
    }
  }
  return CLEAN_SCALES[0];
}

// ============================================================================
// Element Dimensions
// ============================================================================

/**
 * Get real-world dimensions from element dimensions definition
 * @param dimensions - Element dimensions (fixed or configurable)
 * @returns Width and height in meters
 */
export function getRealDimensions(
  dimensions: ElementDimensions
): { width: number; height: number } {
  if (dimensions.type === 'fixed') {
    // For circular elements, diameter applies to both width and height
    if (dimensions.diameter !== undefined) {
      return {
        width: dimensions.diameter,
        height: dimensions.diameter,
      };
    }
    // For rectangular elements
    return {
      width: dimensions.width ?? 0,
      height: dimensions.height ?? 0,
    };
  }

  // Configurable dimensions
  return {
    width: dimensions.unitSize * dimensions.unitsWide,
    height: dimensions.unitSize * dimensions.unitsDeep,
  };
}

// ============================================================================
// Element Render Data
// ============================================================================

/**
 * Calculate render data for an element
 * Converts real-world element data to canvas pixel positions
 * @param element - Layout element with real-world positioning
 * @param pixelsPerMeter - Scale factor
 * @param offset - Canvas offset in pixels
 * @returns Render data with canvas pixel positions
 */
export function getElementRenderData(
  element: LayoutElement,
  pixelsPerMeter: number,
  offset: Point
): ElementRenderData {
  // Get real dimensions in meters
  const { width: realWidth, height: realHeight } = getRealDimensions(element.dimensions);

  // Convert to pixel dimensions
  const pixelWidth = metersToPixels(realWidth, pixelsPerMeter);
  const pixelHeight = metersToPixels(realHeight, pixelsPerMeter);

  // Get anchor point (default to center)
  const anchor: AnchorPoint = element.anchor ?? DEFAULT_ANCHOR;

  // Convert element position (anchor point) to canvas coordinates
  const canvasAnchor = realToCanvas(element.position, pixelsPerMeter, offset);

  // Calculate top-left corner from anchor position
  // The element position is where the anchor point should be
  // So top-left = anchor position - (dimensions * anchor ratio)
  const x = canvasAnchor.x - pixelWidth * anchor.x;
  const y = canvasAnchor.y - pixelHeight * anchor.y;

  // Center is at top-left + half dimensions
  const centerX = x + pixelWidth / 2;
  const centerY = y + pixelHeight / 2;

  return {
    x,
    y,
    width: pixelWidth,
    height: pixelHeight,
    centerX,
    centerY,
    rotation: element.rotation,
  };
}

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Calculate the optimal pixels-per-meter to fit space in canvas with padding
 * @param spaceWidth - Space width in meters
 * @param spaceHeight - Space height in meters
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param padding - Padding factor (0.9 = 90% of canvas used)
 * @returns Optimal pixels per meter
 */
export function calculateFitScale(
  spaceWidth: number,
  spaceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = DEFAULT_PADDING
): number {
  if (spaceWidth <= 0 || spaceHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return 100; // Default fallback
  }

  const availableWidth = canvasWidth * padding;
  const availableHeight = canvasHeight * padding;

  const scaleByWidth = availableWidth / spaceWidth;
  const scaleByHeight = availableHeight / spaceHeight;

  // Use the smaller scale to ensure the space fits
  return Math.min(scaleByWidth, scaleByHeight);
}

/**
 * Calculate offset to center the space in the canvas
 * @param spaceWidth - Space width in meters
 * @param spaceHeight - Space height in meters
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param pixelsPerMeter - Current scale
 * @returns Offset point in pixels
 */
export function calculateCenterOffset(
  spaceWidth: number,
  spaceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  pixelsPerMeter: number
): Point {
  const spacePixelWidth = spaceWidth * pixelsPerMeter;
  const spacePixelHeight = spaceHeight * pixelsPerMeter;

  return {
    x: (canvasWidth - spacePixelWidth) / 2,
    y: (canvasHeight - spacePixelHeight) / 2,
  };
}

/**
 * Clamp zoom value to valid range
 * @param zoom - Desired zoom value
 * @returns Clamped zoom value
 */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Round a value to a specific precision
 * @param value - Value to round
 * @param precision - Precision (e.g., 0.01 for 2 decimal places)
 * @returns Rounded value
 */
export function roundToPrecision(value: number, precision: number): number {
  if (precision <= 0) return value;
  return Math.round(value / precision) * precision;
}
