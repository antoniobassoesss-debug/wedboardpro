/**
 * Layout Scale Types
 *
 * Core type definitions for the Layout Maker proportion system.
 * All measurements are in meters (real-world) or pixels (canvas).
 */

/**
 * Point - basic 2D coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * SpaceBounds - real-world dimensions from walls
 * All values in meters
 */
export interface SpaceBounds {
  width: number;   // meters
  height: number;  // meters
  minX: number;    // meters (usually 0 after normalization)
  minY: number;    // meters (usually 0 after normalization)
  maxX: number;    // meters (equals width after normalization)
  maxY: number;    // meters (equals height after normalization)
}

/**
 * CanvasSize - pixel dimensions of the rendering canvas
 */
export interface CanvasSize {
  width: number;   // pixels
  height: number;  // pixels
}

/**
 * ScaleState - complete state for all conversions
 */
export interface ScaleState {
  pixelsPerMeter: number;
  metersPerPixel: number;
  offset: Point;
  zoom: number;
  spaceBounds: SpaceBounds;
  canvasSize: CanvasSize;

  // Pre-bound conversion functions
  metersToPixels: (meters: number) => number;
  pixelsToMeters: (pixels: number) => number;
  realToCanvas: (realPos: Point) => Point;
  canvasToReal: (canvasPos: Point) => Point;
}

/**
 * GridConfig - snapping and visual grid settings
 */
export interface GridConfig {
  size: number;      // Grid size in meters (e.g., 0.1 for 10cm)
  enabled: boolean;  // Snap enabled
  visible: boolean;  // Show grid lines
}

/**
 * AnchorPoint - element positioning reference
 * Values from 0 to 1, relative to element dimensions
 */
export interface AnchorPoint {
  x: number;  // 0 to 1, relative to width
  y: number;  // 0 to 1, relative to height
}

/**
 * FixedDimensions - for elements with fixed real-world sizes
 * Examples: round tables (diameter), specific furniture
 */
export interface FixedDimensions {
  type: 'fixed';
  diameter?: number;  // meters (for circular elements)
  width?: number;     // meters (for rectangular elements)
  height?: number;    // meters (for rectangular elements)
}

/**
 * ConfigurableDimensions - for elements that can be resized in units
 * Examples: rectangular tables with configurable seats
 */
export interface ConfigurableDimensions {
  type: 'configurable';
  unitSize: number;   // meters per unit
  unitsWide: number;
  unitsDeep: number;
  minUnits: number;
  maxUnits: number;
}

/**
 * ElementDimensions - union type for all dimension types
 */
export type ElementDimensions = FixedDimensions | ConfigurableDimensions;

/**
 * LayoutElement - element with real-world positioning
 * All position values in meters
 */
export interface LayoutElement {
  id: string;
  type: string;
  position: Point;           // Real-world position in meters
  rotation: number;          // Degrees
  dimensions: ElementDimensions;
  anchor?: AnchorPoint;      // Defaults to center (0.5, 0.5)
  label?: string;
}

/**
 * ElementRenderData - output for canvas positioning
 * All values in pixels
 */
export interface ElementRenderData {
  x: number;          // Canvas X (top-left corner) in pixels
  y: number;          // Canvas Y (top-left corner) in pixels
  width: number;      // Canvas width in pixels
  height: number;     // Canvas height in pixels
  centerX: number;    // Canvas center X in pixels
  centerY: number;    // Canvas center Y in pixels
  rotation: number;   // Rotation in degrees (unchanged)
}

/**
 * Default anchor point (center)
 */
export const DEFAULT_ANCHOR: AnchorPoint = { x: 0.5, y: 0.5 };
