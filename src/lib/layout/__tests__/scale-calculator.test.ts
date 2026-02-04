/**
 * Scale Calculator Tests
 *
 * Tests for the central scale calculation system.
 */

import {
  calculateScale,
  calculateZoomAtPoint,
  calculateScaleForRatio,
  type CalculateScaleInput,
} from '../scale-calculator';

import type { SpaceBounds, CanvasSize, Point } from '../../../types/layout-scale';
import { SCALE_CONSTANTS } from '../scale-utils';

// ============================================================================
// Test Helpers
// ============================================================================

function createSpaceBounds(width: number, height: number): SpaceBounds {
  return {
    width,
    height,
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
  };
}

function createCanvasSize(width: number, height: number): CanvasSize {
  return { width, height };
}

// ============================================================================
// calculateScale Tests
// ============================================================================

describe('calculateScale', () => {
  describe('basic calculations', () => {
    it('calculates scale for exact fit (matching aspect ratios)', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10), // 10m x 10m square
        canvasSize: createCanvasSize(1000, 1000), // 1000px x 1000px square
        zoom: 1.0,
        padding: 1.0, // No padding for easy calculation
      };

      const result = calculateScale(input);

      // 1000px / 10m = 100 px/m
      expect(result.pixelsPerMeter).toBe(100);
      expect(result.metersPerPixel).toBe(0.01);
      expect(result.zoom).toBe(1.0);
    });

    it('preserves aspect ratio when canvas is wider than space', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10), // 10m x 10m
        canvasSize: createCanvasSize(2000, 1000), // 2:1 aspect ratio
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Should use height constraint: 1000px / 10m = 100 px/m
      expect(result.pixelsPerMeter).toBe(100);

      // Space should be centered horizontally
      // Space width in pixels: 10m * 100 = 1000px
      // Canvas width: 2000px
      // Offset should center it: (2000 - 1000) / 2 = 500px
      expect(result.offset.x).toBe(500);
      expect(result.offset.y).toBe(0);
    });

    it('preserves aspect ratio when canvas is taller than space', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10), // 10m x 10m
        canvasSize: createCanvasSize(1000, 2000), // 1:2 aspect ratio
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Should use width constraint: 1000px / 10m = 100 px/m
      expect(result.pixelsPerMeter).toBe(100);

      // Space should be centered vertically
      expect(result.offset.x).toBe(0);
      expect(result.offset.y).toBe(500);
    });

    it('handles rectangular space in square canvas', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(20, 10), // 20m x 10m (2:1)
        canvasSize: createCanvasSize(1000, 1000), // Square
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Width is constraining: 1000px / 20m = 50 px/m
      expect(result.pixelsPerMeter).toBe(50);

      // Space width: 20m * 50 = 1000px (fills width)
      // Space height: 10m * 50 = 500px
      // Vertical centering: (1000 - 500) / 2 = 250px
      expect(result.offset.x).toBe(0);
      expect(result.offset.y).toBe(250);
    });
  });

  describe('padding', () => {
    it('applies padding correctly', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 0.5, // 50% padding
      };

      const result = calculateScale(input);

      // Available space: 1000 * 0.5 = 500px
      // Scale: 500px / 10m = 50 px/m
      expect(result.pixelsPerMeter).toBe(50);
    });

    it('uses default padding when not specified', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        // padding not specified
      };

      const result = calculateScale(input);

      // Available space: 1000 * 0.9 = 900px
      // Scale: 900px / 10m = 90 px/m
      expect(result.pixelsPerMeter).toBe(90);
    });
  });

  describe('zoom', () => {
    it('applies zoom multiplier', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 2.0, // 2x zoom
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Base scale: 100 px/m
      // With 2x zoom: 200 px/m
      expect(result.pixelsPerMeter).toBe(200);
      expect(result.zoom).toBe(2.0);
    });

    it('clamps zoom to minimum', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 0.1, // Below MIN_ZOOM
        padding: 1.0,
      };

      const result = calculateScale(input);

      expect(result.zoom).toBe(SCALE_CONSTANTS.MIN_ZOOM);
    });

    it('clamps zoom to maximum', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 10.0, // Above MAX_ZOOM
        padding: 1.0,
      };

      const result = calculateScale(input);

      expect(result.zoom).toBe(SCALE_CONSTANTS.MAX_ZOOM);
    });
  });

  describe('offset centering', () => {
    it('centers space in canvas', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(5, 5), // 5m x 5m
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Scale: 1000px / 5m = 200 px/m
      // Space in pixels: 5m * 200 = 1000px (fills canvas)
      // Offset should be (0, 0) when it exactly fits
      expect(result.offset.x).toBe(0);
      expect(result.offset.y).toBe(0);
    });

    it('calculates correct offset for smaller space', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(4, 4), // 4m x 4m
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Scale: 1000px / 4m = 250 px/m
      // Space in pixels: 4m * 250 = 1000px (fills canvas)
      // Should be centered (0, 0)
      expect(result.offset.x).toBe(0);
      expect(result.offset.y).toBe(0);
    });
  });

  describe('pre-bound functions', () => {
    it('provides working metersToPixels function', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      expect(result.metersToPixels(1)).toBe(100);
      expect(result.metersToPixels(5)).toBe(500);
      expect(result.metersToPixels(0.5)).toBe(50);
    });

    it('provides working pixelsToMeters function', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      expect(result.pixelsToMeters(100)).toBe(1);
      expect(result.pixelsToMeters(500)).toBe(5);
      expect(result.pixelsToMeters(50)).toBe(0.5);
    });

    it('provides working realToCanvas function', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(2000, 1000), // Wide canvas
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Scale: 100 px/m, offset.x: 500, offset.y: 0
      const canvasPos = result.realToCanvas({ x: 5, y: 5 });

      expect(canvasPos.x).toBe(1000); // 5m * 100 + 500 offset
      expect(canvasPos.y).toBe(500);  // 5m * 100 + 0 offset
    });

    it('provides working canvasToReal function', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(2000, 1000),
        zoom: 1.0,
        padding: 1.0,
      };

      const result = calculateScale(input);

      // Scale: 100 px/m, offset.x: 500, offset.y: 0
      const realPos = result.canvasToReal({ x: 1000, y: 500 });

      expect(realPos.x).toBe(5); // (1000 - 500) / 100
      expect(realPos.y).toBe(5); // (500 - 0) / 100
    });

    it('round-trips correctly with pre-bound functions', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(15, 12),
        canvasSize: createCanvasSize(1200, 900),
        zoom: 1.5,
        padding: 0.85,
      };

      const result = calculateScale(input);

      const originalReal: Point = { x: 7.5, y: 6.0 };
      const canvas = result.realToCanvas(originalReal);
      const backToReal = result.canvasToReal(canvas);

      expect(backToReal.x).toBeCloseTo(originalReal.x, 10);
      expect(backToReal.y).toBeCloseTo(originalReal.y, 10);
    });
  });

  describe('error handling', () => {
    it('throws for zero width space', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(0, 10),
        canvasSize: createCanvasSize(1000, 1000),
      };

      expect(() => calculateScale(input)).toThrow('Space bounds must have positive width and height');
    });

    it('throws for zero height space', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 0),
        canvasSize: createCanvasSize(1000, 1000),
      };

      expect(() => calculateScale(input)).toThrow('Space bounds must have positive width and height');
    });

    it('throws for zero canvas dimensions', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(0, 1000),
      };

      expect(() => calculateScale(input)).toThrow('Canvas size must have positive width and height');
    });

    it('throws for negative dimensions', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(-10, 10),
        canvasSize: createCanvasSize(1000, 1000),
      };

      expect(() => calculateScale(input)).toThrow('Space bounds must have positive width and height');
    });
  });

  describe('clean scale snapping', () => {
    it('snaps to clean scale when requested', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 0.9, // Results in 90 px/m
        snapToCleanScale: true,
      };

      const result = calculateScale(input);

      // 90 should snap down to 50 (nearest clean scale below)
      expect(result.pixelsPerMeter).toBe(50);
    });

    it('does not snap when not requested', () => {
      const input: CalculateScaleInput = {
        spaceBounds: createSpaceBounds(10, 10),
        canvasSize: createCanvasSize(1000, 1000),
        zoom: 1.0,
        padding: 0.9,
        snapToCleanScale: false,
      };

      const result = calculateScale(input);

      expect(result.pixelsPerMeter).toBe(90);
    });
  });
});

// ============================================================================
// calculateZoomAtPoint Tests
// ============================================================================

describe('calculateZoomAtPoint', () => {
  it('keeps cursor position fixed when zooming in', () => {
    const initialInput: CalculateScaleInput = {
      spaceBounds: createSpaceBounds(10, 10),
      canvasSize: createCanvasSize(1000, 1000),
      zoom: 1.0,
      padding: 1.0,
    };

    const initialScale = calculateScale(initialInput);
    const cursorCanvas: Point = { x: 500, y: 500 };
    const cursorReal = initialScale.canvasToReal(cursorCanvas);

    const newScale = calculateZoomAtPoint(initialScale, 2.0, cursorCanvas);

    // The real position under the cursor should map to the same canvas position
    const newCursorCanvas = newScale.canvasToReal({ x: 500, y: 500 });

    // Due to offset adjustment, the real position at 500,500 should be close to original
    expect(newCursorCanvas.x).toBeCloseTo(cursorReal.x, 5);
    expect(newCursorCanvas.y).toBeCloseTo(cursorReal.y, 5);
  });

  it('keeps cursor position fixed when zooming out', () => {
    const initialInput: CalculateScaleInput = {
      spaceBounds: createSpaceBounds(10, 10),
      canvasSize: createCanvasSize(1000, 1000),
      zoom: 2.0,
      padding: 1.0,
    };

    const initialScale = calculateScale(initialInput);
    const cursorCanvas: Point = { x: 300, y: 400 };
    const cursorReal = initialScale.canvasToReal(cursorCanvas);

    const newScale = calculateZoomAtPoint(initialScale, 1.0, cursorCanvas);
    const newCursorCanvas = newScale.canvasToReal({ x: 300, y: 400 });

    expect(newCursorCanvas.x).toBeCloseTo(cursorReal.x, 5);
    expect(newCursorCanvas.y).toBeCloseTo(cursorReal.y, 5);
  });
});

// ============================================================================
// calculateScaleForRatio Tests
// ============================================================================

describe('calculateScaleForRatio', () => {
  it('returns scale for valid ratio that fits', () => {
    const spaceBounds = createSpaceBounds(5, 5); // 5m x 5m
    const canvasSize = createCanvasSize(1000, 1000);

    // 100 px/m would make space 500x500 pixels, which fits
    const result = calculateScaleForRatio(spaceBounds, canvasSize, 100);

    expect(result).not.toBeNull();
    expect(result!.pixelsPerMeter).toBe(100);
    expect(result!.zoom).toBe(1.0);
  });

  it('returns null when ratio would not fit', () => {
    const spaceBounds = createSpaceBounds(20, 20); // 20m x 20m
    const canvasSize = createCanvasSize(1000, 1000);

    // 100 px/m would make space 2000x2000 pixels, which doesn't fit
    const result = calculateScaleForRatio(spaceBounds, canvasSize, 100);

    expect(result).toBeNull();
  });

  it('centers space correctly', () => {
    const spaceBounds = createSpaceBounds(5, 5);
    const canvasSize = createCanvasSize(1000, 1000);

    const result = calculateScaleForRatio(spaceBounds, canvasSize, 100);

    expect(result).not.toBeNull();
    // Space is 500x500 in 1000x1000 canvas
    expect(result!.offset.x).toBe(250);
    expect(result!.offset.y).toBe(250);
  });

  it('provides working conversion functions', () => {
    const spaceBounds = createSpaceBounds(5, 5);
    const canvasSize = createCanvasSize(1000, 1000);

    const result = calculateScaleForRatio(spaceBounds, canvasSize, 100);

    expect(result).not.toBeNull();
    expect(result!.metersToPixels(2.5)).toBe(250);
    expect(result!.pixelsToMeters(250)).toBe(2.5);
  });
});

// ============================================================================
// Scale State Properties Tests
// ============================================================================

describe('ScaleState properties', () => {
  it('includes all required properties', () => {
    const input: CalculateScaleInput = {
      spaceBounds: createSpaceBounds(10, 10),
      canvasSize: createCanvasSize(1000, 1000),
      zoom: 1.5,
      padding: 0.9,
    };

    const result = calculateScale(input);

    // Check all properties exist
    expect(result).toHaveProperty('pixelsPerMeter');
    expect(result).toHaveProperty('metersPerPixel');
    expect(result).toHaveProperty('offset');
    expect(result).toHaveProperty('zoom');
    expect(result).toHaveProperty('spaceBounds');
    expect(result).toHaveProperty('canvasSize');
    expect(result).toHaveProperty('metersToPixels');
    expect(result).toHaveProperty('pixelsToMeters');
    expect(result).toHaveProperty('realToCanvas');
    expect(result).toHaveProperty('canvasToReal');

    // Check types
    expect(typeof result.pixelsPerMeter).toBe('number');
    expect(typeof result.metersPerPixel).toBe('number');
    expect(typeof result.offset.x).toBe('number');
    expect(typeof result.offset.y).toBe('number');
    expect(typeof result.zoom).toBe('number');
    expect(typeof result.metersToPixels).toBe('function');
    expect(typeof result.pixelsToMeters).toBe('function');
    expect(typeof result.realToCanvas).toBe('function');
    expect(typeof result.canvasToReal).toBe('function');
  });

  it('preserves original spaceBounds', () => {
    const spaceBounds = createSpaceBounds(15, 12);
    const input: CalculateScaleInput = {
      spaceBounds,
      canvasSize: createCanvasSize(1000, 1000),
    };

    const result = calculateScale(input);

    expect(result.spaceBounds).toEqual(spaceBounds);
  });

  it('preserves original canvasSize', () => {
    const canvasSize = createCanvasSize(1200, 800);
    const input: CalculateScaleInput = {
      spaceBounds: createSpaceBounds(10, 10),
      canvasSize,
    };

    const result = calculateScale(input);

    expect(result.canvasSize).toEqual(canvasSize);
  });

  it('metersPerPixel is inverse of pixelsPerMeter', () => {
    const input: CalculateScaleInput = {
      spaceBounds: createSpaceBounds(10, 10),
      canvasSize: createCanvasSize(1000, 1000),
      zoom: 1.5,
      padding: 0.85,
    };

    const result = calculateScale(input);

    expect(result.metersPerPixel).toBeCloseTo(1 / result.pixelsPerMeter, 10);
  });
});
