/**
 * Test Elements Tests
 *
 * Verify test element data and proportion calculations.
 */

import {
  TEST_ELEMENTS,
  TEST_SPACE_BOUNDS,
  createProportionTestElements,
  createWeddingTestLayout,
} from '../test-elements';
import { getRealDimensions, getElementRenderData } from '../scale-utils';
import type { Point } from '../../../types/layout-scale';

describe('TEST_ELEMENTS', () => {
  it('contains expected elements', () => {
    expect(TEST_ELEMENTS.length).toBeGreaterThan(0);

    const types = TEST_ELEMENTS.map((e) => e.type);
    expect(types).toContain('table_round');
    expect(types).toContain('table_rectangular');
    expect(types).toContain('dance_floor');
    expect(types).toContain('stage');
  });

  it('all elements have valid dimensions', () => {
    TEST_ELEMENTS.forEach((element) => {
      const dims = getRealDimensions(element.dimensions);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });
  });

  it('all elements have valid positions', () => {
    TEST_ELEMENTS.forEach((element) => {
      expect(element.position.x).toBeGreaterThanOrEqual(0);
      expect(element.position.y).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('TEST_SPACE_BOUNDS', () => {
  it('represents 20m x 15m venue', () => {
    expect(TEST_SPACE_BOUNDS.width).toBe(20);
    expect(TEST_SPACE_BOUNDS.height).toBe(15);
    expect(TEST_SPACE_BOUNDS.minX).toBe(0);
    expect(TEST_SPACE_BOUNDS.minY).toBe(0);
    expect(TEST_SPACE_BOUNDS.maxX).toBe(20);
    expect(TEST_SPACE_BOUNDS.maxY).toBe(15);
  });
});

describe('proportion verification', () => {
  const SPACE_WIDTH = 20; // meters
  const CANVAS_WIDTH = 800; // pixels
  const PIXELS_PER_METER = CANVAS_WIDTH / SPACE_WIDTH; // 40 px/m
  const OFFSET: Point = { x: 0, y: 0 };

  describe('1.8m table in 20m space', () => {
    it('should be exactly 9% of space width', () => {
      const table = TEST_ELEMENTS.find((e) => e.id === 'test-round-table-1');
      expect(table).toBeDefined();

      const dims = getRealDimensions(table!.dimensions);
      expect(dims.width).toBe(1.8);

      // Calculate proportion
      const proportion = dims.width / SPACE_WIDTH;
      expect(proportion).toBeCloseTo(0.09, 4); // 9%
    });

    it('renders at correct pixel size', () => {
      const table = TEST_ELEMENTS.find((e) => e.id === 'test-round-table-1');
      expect(table).toBeDefined();

      const renderData = getElementRenderData(table!, PIXELS_PER_METER, OFFSET);

      // 1.8m * 40 px/m = 72px
      expect(renderData.width).toBe(72);
      expect(renderData.height).toBe(72);
    });
  });

  describe('element positioning', () => {
    it('table at (5,5) positions correctly', () => {
      const table = TEST_ELEMENTS.find((e) => e.id === 'test-round-table-1');
      expect(table).toBeDefined();
      expect(table!.position).toEqual({ x: 5, y: 5 });

      const renderData = getElementRenderData(table!, PIXELS_PER_METER, OFFSET);

      // Position is at center, so top-left = center - half size
      // 5m * 40 px/m = 200px center
      // 1.8m diameter = 72px, half = 36px
      // Top-left = 200 - 36 = 164px
      expect(renderData.centerX).toBe(200);
      expect(renderData.centerY).toBe(200);
      expect(renderData.x).toBe(164);
      expect(renderData.y).toBe(164);
    });
  });

  describe('rotated elements', () => {
    it('rectangular table rotation is preserved', () => {
      const table = TEST_ELEMENTS.find((e) => e.id === 'test-rect-table');
      expect(table).toBeDefined();
      expect(table!.rotation).toBe(45);

      const renderData = getElementRenderData(table!, PIXELS_PER_METER, OFFSET);
      expect(renderData.rotation).toBe(45);
    });
  });

  describe('configurable dimensions', () => {
    it('dance floor calculates correct size', () => {
      const danceFloor = TEST_ELEMENTS.find((e) => e.id === 'test-dance-floor');
      expect(danceFloor).toBeDefined();

      const dims = getRealDimensions(danceFloor!.dimensions);
      // 0.6m * 5 units = 3m wide
      // 0.6m * 4 units = 2.4m deep
      expect(dims.width).toBe(3);
      expect(dims.height).toBe(2.4);
    });
  });
});

describe('createProportionTestElements', () => {
  it('creates corner markers', () => {
    const elements = createProportionTestElements(20, 15);

    const corners = elements.filter((e) => e.id.startsWith('corner-marker'));
    expect(corners.length).toBe(4);
  });

  it('creates center marker', () => {
    const elements = createProportionTestElements(20, 15);

    const center = elements.find((e) => e.id === 'center-marker');
    expect(center).toBeDefined();
    expect(center!.position).toEqual({ x: 10, y: 7.5 });
  });

  it('creates scale reference', () => {
    const elements = createProportionTestElements(20, 15);

    const reference = elements.find((e) => e.id === 'scale-reference');
    expect(reference).toBeDefined();

    const dims = getRealDimensions(reference!.dimensions);
    expect(dims.width).toBe(1);
    expect(dims.height).toBe(1);
  });
});

describe('createWeddingTestLayout', () => {
  it('creates head table', () => {
    const elements = createWeddingTestLayout();

    const headTable = elements.find((e) => e.id === 'head-table');
    expect(headTable).toBeDefined();
    expect(headTable!.type).toBe('table_imperial');
  });

  it('creates 9 guest tables in 3x3 grid', () => {
    const elements = createWeddingTestLayout();

    const guestTables = elements.filter((e) => e.id.startsWith('guest-table'));
    expect(guestTables.length).toBe(9);

    guestTables.forEach((table) => {
      expect(table.type).toBe('table_round');
    });
  });

  it('creates dance floor', () => {
    const elements = createWeddingTestLayout();

    const danceFloor = elements.find((e) => e.id === 'dance-floor');
    expect(danceFloor).toBeDefined();
    expect(danceFloor!.type).toBe('dance_floor');
  });
});
