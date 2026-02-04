/**
 * Scale Utilities Tests
 *
 * Comprehensive tests for the Layout Maker proportion system utilities.
 */

import {
  metersToPixels,
  pixelsToMeters,
  realToCanvas,
  canvasToReal,
  snapToGrid,
  snapValueToGrid,
  snapToCleanScale,
  getNextLargerScale,
  getNextSmallerScale,
  getRealDimensions,
  getElementRenderData,
  calculateFitScale,
  calculateCenterOffset,
  clampZoom,
  roundToPrecision,
  SCALE_CONSTANTS,
} from '../scale-utils';

import type {
  Point,
  FixedDimensions,
  ConfigurableDimensions,
  LayoutElement,
} from '../../../types/layout-scale';

// ============================================================================
// metersToPixels Tests
// ============================================================================

describe('metersToPixels', () => {
  it('converts meters to pixels at 100 px/m scale', () => {
    expect(metersToPixels(1, 100)).toBe(100);
    expect(metersToPixels(2.5, 100)).toBe(250);
    expect(metersToPixels(0.5, 100)).toBe(50);
  });

  it('converts meters to pixels at different scales', () => {
    expect(metersToPixels(1, 50)).toBe(50);
    expect(metersToPixels(1, 200)).toBe(200);
    expect(metersToPixels(2, 75)).toBe(150);
  });

  it('handles zero values', () => {
    expect(metersToPixels(0, 100)).toBe(0);
    expect(metersToPixels(1, 0)).toBe(0);
    expect(metersToPixels(0, 0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(metersToPixels(-1, 100)).toBe(-100);
    expect(metersToPixels(1, -100)).toBe(-100);
  });

  it('handles very small values', () => {
    expect(metersToPixels(0.001, 100)).toBe(0.1);
    expect(metersToPixels(0.01, 100)).toBe(1);
  });

  it('handles very large values', () => {
    expect(metersToPixels(1000, 100)).toBe(100000);
    expect(metersToPixels(1, 10000)).toBe(10000);
  });

  it('handles non-finite values', () => {
    expect(metersToPixels(Infinity, 100)).toBe(0);
    expect(metersToPixels(1, Infinity)).toBe(0);
    expect(metersToPixels(NaN, 100)).toBe(0);
    expect(metersToPixels(1, NaN)).toBe(0);
  });
});

// ============================================================================
// pixelsToMeters Tests
// ============================================================================

describe('pixelsToMeters', () => {
  it('converts pixels to meters at 100 px/m scale', () => {
    expect(pixelsToMeters(100, 100)).toBe(1);
    expect(pixelsToMeters(250, 100)).toBe(2.5);
    expect(pixelsToMeters(50, 100)).toBe(0.5);
  });

  it('converts pixels to meters at different scales', () => {
    expect(pixelsToMeters(50, 50)).toBe(1);
    expect(pixelsToMeters(200, 200)).toBe(1);
    expect(pixelsToMeters(150, 75)).toBe(2);
  });

  it('handles zero values', () => {
    expect(pixelsToMeters(0, 100)).toBe(0);
    expect(pixelsToMeters(100, 0)).toBe(0);
    expect(pixelsToMeters(0, 0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(pixelsToMeters(-100, 100)).toBe(-1);
  });

  it('handles non-finite values', () => {
    expect(pixelsToMeters(Infinity, 100)).toBe(0);
    expect(pixelsToMeters(100, Infinity)).toBe(0);
    expect(pixelsToMeters(NaN, 100)).toBe(0);
  });
});

// ============================================================================
// realToCanvas Tests
// ============================================================================

describe('realToCanvas', () => {
  it('converts real position to canvas with no offset', () => {
    const result = realToCanvas({ x: 1, y: 2 }, 100, { x: 0, y: 0 });
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('converts real position to canvas with offset', () => {
    const result = realToCanvas({ x: 1, y: 2 }, 100, { x: 50, y: 100 });
    expect(result).toEqual({ x: 150, y: 300 });
  });

  it('handles zero position', () => {
    const result = realToCanvas({ x: 0, y: 0 }, 100, { x: 50, y: 50 });
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('handles negative offset', () => {
    const result = realToCanvas({ x: 1, y: 1 }, 100, { x: -50, y: -50 });
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('handles different scales', () => {
    const result = realToCanvas({ x: 2, y: 3 }, 50, { x: 10, y: 20 });
    expect(result).toEqual({ x: 110, y: 170 });
  });

  it('handles non-finite pixelsPerMeter', () => {
    const result = realToCanvas({ x: 1, y: 2 }, NaN, { x: 50, y: 100 });
    expect(result).toEqual({ x: 50, y: 100 });
  });
});

// ============================================================================
// canvasToReal Tests
// ============================================================================

describe('canvasToReal', () => {
  it('converts canvas position to real with no offset', () => {
    const result = canvasToReal({ x: 100, y: 200 }, 100, { x: 0, y: 0 });
    expect(result).toEqual({ x: 1, y: 2 });
  });

  it('converts canvas position to real with offset', () => {
    const result = canvasToReal({ x: 150, y: 300 }, 100, { x: 50, y: 100 });
    expect(result).toEqual({ x: 1, y: 2 });
  });

  it('handles canvas position at offset (should be origin)', () => {
    const result = canvasToReal({ x: 50, y: 50 }, 100, { x: 50, y: 50 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('handles different scales', () => {
    const result = canvasToReal({ x: 110, y: 170 }, 50, { x: 10, y: 20 });
    expect(result).toEqual({ x: 2, y: 3 });
  });

  it('handles zero pixelsPerMeter', () => {
    const result = canvasToReal({ x: 100, y: 200 }, 0, { x: 0, y: 0 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('handles non-finite pixelsPerMeter', () => {
    const result = canvasToReal({ x: 100, y: 200 }, NaN, { x: 0, y: 0 });
    expect(result).toEqual({ x: 0, y: 0 });
  });
});

// ============================================================================
// Round-trip Conversion Tests
// ============================================================================

describe('round-trip conversion', () => {
  it('real -> canvas -> real returns original', () => {
    const original: Point = { x: 2.5, y: 3.7 };
    const pixelsPerMeter = 100;
    const offset: Point = { x: 50, y: 75 };

    const canvas = realToCanvas(original, pixelsPerMeter, offset);
    const result = canvasToReal(canvas, pixelsPerMeter, offset);

    expect(result.x).toBeCloseTo(original.x, 10);
    expect(result.y).toBeCloseTo(original.y, 10);
  });

  it('canvas -> real -> canvas returns original', () => {
    const original: Point = { x: 350, y: 475 };
    const pixelsPerMeter = 100;
    const offset: Point = { x: 50, y: 75 };

    const real = canvasToReal(original, pixelsPerMeter, offset);
    const result = realToCanvas(real, pixelsPerMeter, offset);

    expect(result.x).toBeCloseTo(original.x, 10);
    expect(result.y).toBeCloseTo(original.y, 10);
  });

  it('meters -> pixels -> meters returns original', () => {
    const original = 3.14159;
    const pixelsPerMeter = 100;

    const pixels = metersToPixels(original, pixelsPerMeter);
    const result = pixelsToMeters(pixels, pixelsPerMeter);

    expect(result).toBeCloseTo(original, 10);
  });
});

// ============================================================================
// snapToGrid Tests
// ============================================================================

describe('snapToGrid', () => {
  it('snaps to 10cm grid', () => {
    const gridSize = 0.1; // 10cm

    expect(snapToGrid({ x: 0.12, y: 0.18 }, gridSize)).toEqual({ x: 0.1, y: 0.2 });
    expect(snapToGrid({ x: 0.05, y: 0.05 }, gridSize)).toEqual({ x: 0.1, y: 0.1 });
    expect(snapToGrid({ x: 0.04, y: 0.04 }, gridSize)).toEqual({ x: 0, y: 0 });
  });

  it('snaps to 1cm grid', () => {
    const gridSize = 0.01; // 1cm

    expect(snapToGrid({ x: 0.123, y: 0.456 }, gridSize)).toEqual({ x: 0.12, y: 0.46 });
    expect(snapToGrid({ x: 0.125, y: 0.125 }, gridSize)).toEqual({ x: 0.13, y: 0.13 });
  });

  it('snaps to 1m grid', () => {
    const gridSize = 1.0; // 1m

    expect(snapToGrid({ x: 1.4, y: 2.6 }, gridSize)).toEqual({ x: 1, y: 3 });
    expect(snapToGrid({ x: 0.5, y: 1.5 }, gridSize)).toEqual({ x: 1, y: 2 });
  });

  it('handles exact grid points', () => {
    const gridSize = 0.1;
    expect(snapToGrid({ x: 0.5, y: 1.0 }, gridSize)).toEqual({ x: 0.5, y: 1.0 });
  });

  it('handles negative coordinates', () => {
    const gridSize = 0.1;
    expect(snapToGrid({ x: -0.12, y: -0.18 }, gridSize)).toEqual({ x: -0.1, y: -0.2 });
  });

  it('handles zero grid size', () => {
    const result = snapToGrid({ x: 1.5, y: 2.5 }, 0);
    expect(result).toEqual({ x: 1.5, y: 2.5 });
  });

  it('handles negative grid size', () => {
    const result = snapToGrid({ x: 1.5, y: 2.5 }, -0.1);
    expect(result).toEqual({ x: 1.5, y: 2.5 });
  });
});

describe('snapValueToGrid', () => {
  it('snaps single values', () => {
    expect(snapValueToGrid(0.12, 0.1)).toBeCloseTo(0.1, 10);
    expect(snapValueToGrid(0.16, 0.1)).toBeCloseTo(0.2, 10);  // 0.16/0.1 = 1.6, rounds to 2
    expect(snapValueToGrid(1.4, 1)).toBeCloseTo(1, 10);
    expect(snapValueToGrid(1.6, 1)).toBeCloseTo(2, 10);
  });
});

// ============================================================================
// snapToCleanScale Tests
// ============================================================================

describe('snapToCleanScale', () => {
  it('snaps to nearest clean scale below', () => {
    expect(snapToCleanScale(55)).toBe(50);
    expect(snapToCleanScale(99)).toBe(50);
    expect(snapToCleanScale(100)).toBe(100);
    expect(snapToCleanScale(150)).toBe(100);
  });

  it('returns exact clean scale when matched', () => {
    expect(snapToCleanScale(50)).toBe(50);
    expect(snapToCleanScale(100)).toBe(100);
    expect(snapToCleanScale(200)).toBe(200);
  });

  it('returns minimum scale for very small values', () => {
    expect(snapToCleanScale(5)).toBe(10);
    expect(snapToCleanScale(1)).toBe(10);
  });

  it('handles zero and negative values', () => {
    expect(snapToCleanScale(0)).toBe(10);
    expect(snapToCleanScale(-50)).toBe(10);
  });

  it('handles non-finite values', () => {
    expect(snapToCleanScale(NaN)).toBe(10);
    expect(snapToCleanScale(Infinity)).toBe(10);
  });
});

describe('getNextLargerScale', () => {
  it('gets next larger scale', () => {
    expect(getNextLargerScale(50)).toBe(100);
    expect(getNextLargerScale(100)).toBe(200);
    expect(getNextLargerScale(10)).toBe(20);
  });

  it('returns max when at max', () => {
    expect(getNextLargerScale(1000)).toBe(1000);
    expect(getNextLargerScale(1500)).toBe(1000);
  });
});

describe('getNextSmallerScale', () => {
  it('gets next smaller scale', () => {
    expect(getNextSmallerScale(100)).toBe(50);
    expect(getNextSmallerScale(200)).toBe(100);
    expect(getNextSmallerScale(50)).toBe(40);
  });

  it('returns min when at min', () => {
    expect(getNextSmallerScale(10)).toBe(10);
    expect(getNextSmallerScale(5)).toBe(10);
  });
});

// ============================================================================
// getRealDimensions Tests
// ============================================================================

describe('getRealDimensions', () => {
  it('returns diameter for circular fixed elements', () => {
    const dimensions: FixedDimensions = {
      type: 'fixed',
      diameter: 1.5,
    };
    expect(getRealDimensions(dimensions)).toEqual({ width: 1.5, height: 1.5 });
  });

  it('returns width/height for rectangular fixed elements', () => {
    const dimensions: FixedDimensions = {
      type: 'fixed',
      width: 2.0,
      height: 1.0,
    };
    expect(getRealDimensions(dimensions)).toEqual({ width: 2.0, height: 1.0 });
  });

  it('handles missing dimensions in fixed type', () => {
    const dimensions: FixedDimensions = {
      type: 'fixed',
    };
    expect(getRealDimensions(dimensions)).toEqual({ width: 0, height: 0 });
  });

  it('calculates configurable dimensions', () => {
    const dimensions: ConfigurableDimensions = {
      type: 'configurable',
      unitSize: 0.6,
      unitsWide: 4,
      unitsDeep: 2,
      minUnits: 2,
      maxUnits: 10,
    };
    expect(getRealDimensions(dimensions)).toEqual({ width: 2.4, height: 1.2 });
  });

  it('handles single unit configurable', () => {
    const dimensions: ConfigurableDimensions = {
      type: 'configurable',
      unitSize: 1.0,
      unitsWide: 1,
      unitsDeep: 1,
      minUnits: 1,
      maxUnits: 5,
    };
    expect(getRealDimensions(dimensions)).toEqual({ width: 1.0, height: 1.0 });
  });
});

// ============================================================================
// getElementRenderData Tests
// ============================================================================

describe('getElementRenderData', () => {
  it('calculates render data for round table with center anchor', () => {
    const element: LayoutElement = {
      id: 'table-1',
      type: 'round-table',
      position: { x: 5, y: 5 },
      rotation: 0,
      dimensions: {
        type: 'fixed',
        diameter: 1.5,
      },
      // anchor defaults to center (0.5, 0.5)
    };

    const result = getElementRenderData(element, 100, { x: 0, y: 0 });

    // Diameter 1.5m at 100px/m = 150px
    expect(result.width).toBe(150);
    expect(result.height).toBe(150);

    // Position is center (5,5), so top-left is (5-0.75, 5-0.75) = (4.25, 4.25) in meters
    // In pixels: (425, 425)
    expect(result.x).toBe(425);
    expect(result.y).toBe(425);

    // Center should be at position * ppm = (500, 500)
    expect(result.centerX).toBe(500);
    expect(result.centerY).toBe(500);

    expect(result.rotation).toBe(0);
  });

  it('calculates render data for rectangular table', () => {
    const element: LayoutElement = {
      id: 'table-2',
      type: 'rect-table',
      position: { x: 3, y: 4 },
      rotation: 45,
      dimensions: {
        type: 'configurable',
        unitSize: 0.6,
        unitsWide: 4,
        unitsDeep: 2,
        minUnits: 2,
        maxUnits: 10,
      },
    };

    const result = getElementRenderData(element, 100, { x: 50, y: 50 });

    // 4 units x 0.6m = 2.4m wide, 2 units x 0.6m = 1.2m deep
    expect(result.width).toBe(240);
    expect(result.height).toBe(120);

    // Position (3, 4) + offset (50, 50) - half dimensions
    // Canvas position: (300 + 50, 400 + 50) = (350, 450) for center
    // Top-left: (350 - 120, 450 - 60) = (230, 390)
    expect(result.x).toBe(230);
    expect(result.y).toBe(390);

    expect(result.centerX).toBe(350);
    expect(result.centerY).toBe(450);

    expect(result.rotation).toBe(45);
  });

  it('handles custom anchor point', () => {
    const element: LayoutElement = {
      id: 'table-3',
      type: 'rect-table',
      position: { x: 2, y: 2 },
      rotation: 0,
      dimensions: {
        type: 'fixed',
        width: 2,
        height: 1,
      },
      anchor: { x: 0, y: 0 }, // Top-left anchor
    };

    const result = getElementRenderData(element, 100, { x: 0, y: 0 });

    // With top-left anchor, position IS the top-left
    expect(result.x).toBe(200);
    expect(result.y).toBe(200);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.centerX).toBe(300);
    expect(result.centerY).toBe(250);
  });

  it('handles bottom-right anchor point', () => {
    const element: LayoutElement = {
      id: 'table-4',
      type: 'rect-table',
      position: { x: 3, y: 3 },
      rotation: 0,
      dimensions: {
        type: 'fixed',
        width: 2,
        height: 1,
      },
      anchor: { x: 1, y: 1 }, // Bottom-right anchor
    };

    const result = getElementRenderData(element, 100, { x: 0, y: 0 });

    // With bottom-right anchor, position is the bottom-right corner
    // Top-left = position - full dimensions
    expect(result.x).toBe(100);  // 300 - 200
    expect(result.y).toBe(200);  // 300 - 100
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});

// ============================================================================
// calculateFitScale Tests
// ============================================================================

describe('calculateFitScale', () => {
  it('calculates scale to fit space in canvas', () => {
    // 10m x 10m space in 1000x1000 canvas with 90% padding
    const scale = calculateFitScale(10, 10, 1000, 1000, 0.9);
    expect(scale).toBe(90); // 900px available / 10m = 90 px/m
  });

  it('uses width constraint when space is wider', () => {
    // 20m x 10m space in 1000x1000 canvas
    const scale = calculateFitScale(20, 10, 1000, 1000, 0.9);
    expect(scale).toBe(45); // 900px / 20m = 45 px/m
  });

  it('uses height constraint when space is taller', () => {
    // 10m x 20m space in 1000x1000 canvas
    const scale = calculateFitScale(10, 20, 1000, 1000, 0.9);
    expect(scale).toBe(45); // 900px / 20m = 45 px/m
  });

  it('handles zero dimensions', () => {
    expect(calculateFitScale(0, 10, 1000, 1000)).toBe(100);
    expect(calculateFitScale(10, 0, 1000, 1000)).toBe(100);
    expect(calculateFitScale(10, 10, 0, 1000)).toBe(100);
    expect(calculateFitScale(10, 10, 1000, 0)).toBe(100);
  });
});

// ============================================================================
// calculateCenterOffset Tests
// ============================================================================

describe('calculateCenterOffset', () => {
  it('calculates offset to center space', () => {
    // 10m x 10m space at 50 px/m in 1000x1000 canvas
    // Space is 500x500 pixels, should be centered at (250, 250)
    const offset = calculateCenterOffset(10, 10, 1000, 1000, 50);
    expect(offset).toEqual({ x: 250, y: 250 });
  });

  it('handles non-square canvas', () => {
    // 10m x 10m space at 50 px/m in 1000x500 canvas
    // Space is 500x500 pixels
    const offset = calculateCenterOffset(10, 10, 1000, 500, 50);
    expect(offset).toEqual({ x: 250, y: 0 });
  });

  it('handles non-square space', () => {
    // 20m x 10m space at 50 px/m in 1000x1000 canvas
    // Space is 1000x500 pixels
    const offset = calculateCenterOffset(20, 10, 1000, 1000, 50);
    expect(offset).toEqual({ x: 0, y: 250 });
  });
});

// ============================================================================
// clampZoom Tests
// ============================================================================

describe('clampZoom', () => {
  it('returns value when within range', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
  });

  it('clamps to minimum', () => {
    expect(clampZoom(0.1)).toBe(SCALE_CONSTANTS.MIN_ZOOM);
    expect(clampZoom(0)).toBe(SCALE_CONSTANTS.MIN_ZOOM);
    expect(clampZoom(-1)).toBe(SCALE_CONSTANTS.MIN_ZOOM);
  });

  it('clamps to maximum', () => {
    expect(clampZoom(10)).toBe(SCALE_CONSTANTS.MAX_ZOOM);
    expect(clampZoom(100)).toBe(SCALE_CONSTANTS.MAX_ZOOM);
  });
});

// ============================================================================
// roundToPrecision Tests
// ============================================================================

describe('roundToPrecision', () => {
  it('rounds to 1cm precision', () => {
    expect(roundToPrecision(1.234, 0.01)).toBe(1.23);
    expect(roundToPrecision(1.235, 0.01)).toBe(1.24);
    expect(roundToPrecision(1.239, 0.01)).toBe(1.24);
  });

  it('rounds to 10cm precision', () => {
    expect(roundToPrecision(1.24, 0.1)).toBeCloseTo(1.2, 10);
    expect(roundToPrecision(1.25, 0.1)).toBeCloseTo(1.3, 10);
  });

  it('rounds to 1m precision', () => {
    expect(roundToPrecision(1.4, 1)).toBe(1);
    expect(roundToPrecision(1.5, 1)).toBe(2);
  });

  it('handles zero precision', () => {
    expect(roundToPrecision(1.234, 0)).toBe(1.234);
  });

  it('handles negative precision', () => {
    expect(roundToPrecision(1.234, -0.01)).toBe(1.234);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('SCALE_CONSTANTS', () => {
  it('has expected values', () => {
    expect(SCALE_CONSTANTS.DEFAULT_PADDING).toBe(0.9);
    expect(SCALE_CONSTANTS.DEFAULT_GRID_SIZE).toBe(0.1);
    expect(SCALE_CONSTANTS.DEFAULT_SNAP_PRECISION).toBe(0.01);
    expect(SCALE_CONSTANTS.MIN_ZOOM).toBe(0.5);
    expect(SCALE_CONSTANTS.MAX_ZOOM).toBe(5.0);
    expect(SCALE_CONSTANTS.ZOOM_STEP).toBe(0.1);
  });

  it('has clean scales in ascending order', () => {
    const scales = SCALE_CONSTANTS.CLEAN_SCALES;
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  it('includes common architectural scales', () => {
    const scales = SCALE_CONSTANTS.CLEAN_SCALES;
    expect(scales).toContain(50);
    expect(scales).toContain(100);
    expect(scales).toContain(200);
  });
});
