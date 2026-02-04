/**
 * Space Bounds Tests
 *
 * Tests for calculating space bounds from wall vertices.
 */

import {
  calculateSpaceBoundsFromPixelWalls,
  calculateSpaceBounds,
  getWallNormalizationOffset,
  getWallNormalizationOffsetMeters,
  normalizePoint,
  pixelPointToMeters,
  meterPointToPixels,
  addPaddingToBounds,
  isPointInBounds,
  clampPointToBounds,
  type WallForBounds,
  type MeterWall,
} from '../space-bounds';

import type { SpaceBounds, Point } from '../../../types/layout-scale';

// ============================================================================
// Test Helpers
// ============================================================================

function createPixelWall(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): WallForBounds {
  return { startX, startY, endX, endY };
}

function createMeterWall(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): MeterWall {
  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  };
}

// ============================================================================
// calculateSpaceBoundsFromPixelWalls Tests
// ============================================================================

describe('calculateSpaceBoundsFromPixelWalls', () => {
  describe('rectangular room (4 walls)', () => {
    it('calculates bounds for a 10m x 8m room', () => {
      // 10m x 8m room at 100 px/m = 1000px x 800px
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 1000, 0),      // Top wall
        createPixelWall(1000, 0, 1000, 800), // Right wall
        createPixelWall(1000, 800, 0, 800),  // Bottom wall
        createPixelWall(0, 800, 0, 0),       // Left wall
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(8);
      expect(bounds!.minX).toBe(0);
      expect(bounds!.minY).toBe(0);
      expect(bounds!.maxX).toBe(10);
      expect(bounds!.maxY).toBe(8);
    });

    it('normalizes offset room to origin', () => {
      // Same room but offset by 500px
      const walls: WallForBounds[] = [
        createPixelWall(500, 500, 1500, 500),
        createPixelWall(1500, 500, 1500, 1300),
        createPixelWall(1500, 1300, 500, 1300),
        createPixelWall(500, 1300, 500, 500),
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(8);
      expect(bounds!.minX).toBe(0);
      expect(bounds!.minY).toBe(0);
    });
  });

  describe('L-shaped room', () => {
    it('calculates bounds for L-shaped walls', () => {
      // L-shape: main section 10m x 6m, extension 4m x 4m
      // Total bounding box: 10m x 10m (at 100 px/m)
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 1000, 0),       // Top
        createPixelWall(1000, 0, 1000, 600),  // Right upper
        createPixelWall(1000, 600, 400, 600), // Step horizontal
        createPixelWall(400, 600, 400, 1000), // Step vertical
        createPixelWall(400, 1000, 0, 1000),  // Bottom
        createPixelWall(0, 1000, 0, 0),       // Left
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(10);
    });
  });

  describe('single wall', () => {
    it('calculates bounds for horizontal wall', () => {
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 500, 0), // 5m horizontal wall
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      // Single horizontal wall has width but no height
      expect(bounds).toBeNull();
    });

    it('calculates bounds for diagonal wall', () => {
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 300, 400), // 3m x 4m diagonal
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(3);
      expect(bounds!.height).toBe(4);
    });
  });

  describe('empty walls', () => {
    it('returns null for empty array', () => {
      const bounds = calculateSpaceBoundsFromPixelWalls([], 100);
      expect(bounds).toBeNull();
    });
  });

  describe('negative coordinates', () => {
    it('handles walls with negative coordinates', () => {
      // Room centered at origin: -500 to 500 px = -5m to 5m
      const walls: WallForBounds[] = [
        createPixelWall(-500, -400, 500, -400),
        createPixelWall(500, -400, 500, 400),
        createPixelWall(500, 400, -500, 400),
        createPixelWall(-500, 400, -500, -400),
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 100);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(8);
      expect(bounds!.minX).toBe(0); // Normalized
      expect(bounds!.minY).toBe(0); // Normalized
    });
  });

  describe('different scale factors', () => {
    it('works with 50 px/m', () => {
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 500, 0),
        createPixelWall(500, 0, 500, 400),
        createPixelWall(500, 400, 0, 400),
        createPixelWall(0, 400, 0, 0),
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 50);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(8);
    });

    it('works with 200 px/m', () => {
      const walls: WallForBounds[] = [
        createPixelWall(0, 0, 2000, 0),
        createPixelWall(2000, 0, 2000, 1600),
        createPixelWall(2000, 1600, 0, 1600),
        createPixelWall(0, 1600, 0, 0),
      ];

      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 200);

      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBe(10);
      expect(bounds!.height).toBe(8);
    });
  });

  describe('edge cases', () => {
    it('returns null for zero pixels per meter', () => {
      const walls: WallForBounds[] = [createPixelWall(0, 0, 100, 100)];
      const bounds = calculateSpaceBoundsFromPixelWalls(walls, 0);
      expect(bounds).toBeNull();
    });

    it('returns null for negative pixels per meter', () => {
      const walls: WallForBounds[] = [createPixelWall(0, 0, 100, 100)];
      const bounds = calculateSpaceBoundsFromPixelWalls(walls, -100);
      expect(bounds).toBeNull();
    });
  });
});

// ============================================================================
// calculateSpaceBounds (meter walls) Tests
// ============================================================================

describe('calculateSpaceBounds', () => {
  it('calculates bounds from meter walls', () => {
    const walls: MeterWall[] = [
      createMeterWall(0, 0, 10, 0),
      createMeterWall(10, 0, 10, 8),
      createMeterWall(10, 8, 0, 8),
      createMeterWall(0, 8, 0, 0),
    ];

    const bounds = calculateSpaceBounds(walls);

    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBe(10);
    expect(bounds!.height).toBe(8);
  });

  it('normalizes meter walls to origin', () => {
    const walls: MeterWall[] = [
      createMeterWall(5, 5, 15, 5),
      createMeterWall(15, 5, 15, 13),
      createMeterWall(15, 13, 5, 13),
      createMeterWall(5, 13, 5, 5),
    ];

    const bounds = calculateSpaceBounds(walls);

    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBe(0);
    expect(bounds!.minY).toBe(0);
    expect(bounds!.width).toBe(10);
    expect(bounds!.height).toBe(8);
  });

  it('returns null for empty array', () => {
    expect(calculateSpaceBounds([])).toBeNull();
  });
});

// ============================================================================
// getWallNormalizationOffset Tests
// ============================================================================

describe('getWallNormalizationOffset', () => {
  it('returns (0, 0) for walls at origin', () => {
    const walls: WallForBounds[] = [
      createPixelWall(0, 0, 100, 0),
      createPixelWall(100, 0, 100, 100),
    ];

    const offset = getWallNormalizationOffset(walls);

    expect(offset).not.toBeNull();
    expect(offset!.x).toBe(0);
    expect(offset!.y).toBe(0);
  });

  it('returns correct offset for shifted walls', () => {
    const walls: WallForBounds[] = [
      createPixelWall(500, 300, 600, 300),
      createPixelWall(600, 300, 600, 400),
    ];

    const offset = getWallNormalizationOffset(walls);

    expect(offset).not.toBeNull();
    expect(offset!.x).toBe(500);
    expect(offset!.y).toBe(300);
  });

  it('handles negative coordinates', () => {
    const walls: WallForBounds[] = [
      createPixelWall(-200, -100, 100, -100),
    ];

    const offset = getWallNormalizationOffset(walls);

    expect(offset).not.toBeNull();
    expect(offset!.x).toBe(-200);
    expect(offset!.y).toBe(-100);
  });

  it('returns null for empty array', () => {
    expect(getWallNormalizationOffset([])).toBeNull();
  });
});

describe('getWallNormalizationOffsetMeters', () => {
  it('returns offset in meters', () => {
    const walls: WallForBounds[] = [
      createPixelWall(500, 300, 600, 400),
    ];

    const offset = getWallNormalizationOffsetMeters(walls, 100);

    expect(offset).not.toBeNull();
    expect(offset!.x).toBe(5);
    expect(offset!.y).toBe(3);
  });
});

// ============================================================================
// Point Conversion Tests
// ============================================================================

describe('normalizePoint', () => {
  it('subtracts offset from point', () => {
    const point: Point = { x: 500, y: 300 };
    const offset: Point = { x: 200, y: 100 };

    const result = normalizePoint(point, offset);

    expect(result.x).toBe(300);
    expect(result.y).toBe(200);
  });
});

describe('pixelPointToMeters', () => {
  it('converts pixel point to meters', () => {
    const point: Point = { x: 500, y: 300 };
    const result = pixelPointToMeters(point, 100);

    expect(result.x).toBe(5);
    expect(result.y).toBe(3);
  });
});

describe('meterPointToPixels', () => {
  it('converts meter point to pixels', () => {
    const point: Point = { x: 5, y: 3 };
    const result = meterPointToPixels(point, 100);

    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
  });
});

// ============================================================================
// Bounds Utilities Tests
// ============================================================================

describe('addPaddingToBounds', () => {
  it('adds padding to all sides', () => {
    const bounds: SpaceBounds = {
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 8,
      width: 10,
      height: 8,
    };

    const padded = addPaddingToBounds(bounds, 0.5);

    expect(padded.width).toBe(11);
    expect(padded.height).toBe(9);
    expect(padded.minX).toBe(0);
    expect(padded.minY).toBe(0);
    expect(padded.maxX).toBe(11);
    expect(padded.maxY).toBe(9);
  });
});

describe('isPointInBounds', () => {
  const bounds: SpaceBounds = {
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 8,
    width: 10,
    height: 8,
  };

  it('returns true for point inside bounds', () => {
    expect(isPointInBounds({ x: 5, y: 4 }, bounds)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(isPointInBounds({ x: 0, y: 0 }, bounds)).toBe(true);
    expect(isPointInBounds({ x: 10, y: 8 }, bounds)).toBe(true);
  });

  it('returns false for point outside bounds', () => {
    expect(isPointInBounds({ x: -1, y: 4 }, bounds)).toBe(false);
    expect(isPointInBounds({ x: 5, y: 10 }, bounds)).toBe(false);
  });
});

describe('clampPointToBounds', () => {
  const bounds: SpaceBounds = {
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 8,
    width: 10,
    height: 8,
  };

  it('returns same point if inside bounds', () => {
    const point = { x: 5, y: 4 };
    const result = clampPointToBounds(point, bounds);
    expect(result).toEqual(point);
  });

  it('clamps point to min values', () => {
    const result = clampPointToBounds({ x: -5, y: -3 }, bounds);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('clamps point to max values', () => {
    const result = clampPointToBounds({ x: 15, y: 12 }, bounds);
    expect(result.x).toBe(10);
    expect(result.y).toBe(8);
  });
});
