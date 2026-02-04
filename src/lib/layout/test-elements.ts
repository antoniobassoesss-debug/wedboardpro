/**
 * Test Elements
 *
 * Sample elements for testing and verifying the proportion system.
 */

import type { LayoutElement, SpaceBounds } from '../../types/layout-scale';

/**
 * Test elements for a 20m x 15m venue
 *
 * Visual verification:
 * - 1.8m table in 20m space = 9% of width
 * - Table at (5,5) should appear 25% from left, 33% from top
 */
export const TEST_ELEMENTS: LayoutElement[] = [
  // Round table - 1.8m diameter at position (5, 5)
  {
    id: 'test-round-table-1',
    type: 'table_round',
    position: { x: 5, y: 5 },
    rotation: 0,
    dimensions: { type: 'fixed', diameter: 1.8 },
    label: 'Table 1',
  },

  // Round table - 1.5m diameter
  {
    id: 'test-round-table-2',
    type: 'table_round',
    position: { x: 8, y: 5 },
    rotation: 0,
    dimensions: { type: 'fixed', diameter: 1.5 },
    label: 'Table 2',
  },

  // Rectangular table with rotation
  {
    id: 'test-rect-table',
    type: 'table_rectangular',
    position: { x: 12, y: 5 },
    rotation: 45,
    dimensions: { type: 'fixed', width: 2.4, height: 0.9 },
    label: 'Rect Table',
  },

  // Imperial table
  {
    id: 'test-imperial-table',
    type: 'table_imperial',
    position: { x: 16, y: 5 },
    rotation: 0,
    dimensions: { type: 'fixed', width: 2.4, height: 1.2 },
    label: 'Imperial',
  },

  // Dance floor with configurable dimensions
  {
    id: 'test-dance-floor',
    type: 'dance_floor',
    position: { x: 10, y: 10 },
    rotation: 0,
    dimensions: {
      type: 'configurable',
      unitSize: 0.6,
      unitsWide: 5,
      unitsDeep: 4,
      minUnits: 2,
      maxUnits: 20,
    },
    label: 'Dance Floor',
  },

  // Stage
  {
    id: 'test-stage',
    type: 'stage',
    position: { x: 10, y: 2 },
    rotation: 0,
    dimensions: { type: 'fixed', width: 6.0, height: 4.0 },
    label: 'Stage',
  },

  // Chairs around table 1
  {
    id: 'test-chair-1',
    type: 'chair',
    position: { x: 3.5, y: 5 },
    rotation: 90,
    dimensions: { type: 'fixed', width: 0.45, height: 0.45 },
  },
  {
    id: 'test-chair-2',
    type: 'chair',
    position: { x: 6.5, y: 5 },
    rotation: -90,
    dimensions: { type: 'fixed', width: 0.45, height: 0.45 },
  },
];

/**
 * Test space bounds - 20m x 15m venue
 */
export const TEST_SPACE_BOUNDS: SpaceBounds = {
  minX: 0,
  minY: 0,
  maxX: 20,
  maxY: 15,
  width: 20,
  height: 15,
};

/**
 * Create test elements for proportion verification
 *
 * Creates a grid of elements for visual verification:
 * - Elements at known positions
 * - Known sizes for proportion checking
 */
export function createProportionTestElements(
  spaceWidth: number = 20,
  spaceHeight: number = 15
): LayoutElement[] {
  const elements: LayoutElement[] = [];

  // Corner markers (1m diameter circles)
  const cornerPositions = [
    { x: 1, y: 1 },
    { x: spaceWidth - 1, y: 1 },
    { x: 1, y: spaceHeight - 1 },
    { x: spaceWidth - 1, y: spaceHeight - 1 },
  ];

  cornerPositions.forEach((pos, i) => {
    elements.push({
      id: `corner-marker-${i}`,
      type: 'table_round',
      position: pos,
      rotation: 0,
      dimensions: { type: 'fixed', diameter: 1.0 },
      label: `C${i + 1}`,
    });
  });

  // Center reference table (2m diameter)
  elements.push({
    id: 'center-marker',
    type: 'table_round',
    position: { x: spaceWidth / 2, y: spaceHeight / 2 },
    rotation: 0,
    dimensions: { type: 'fixed', diameter: 2.0 },
    label: 'Center',
  });

  // Scale reference: 1m x 1m square at (5, 5)
  elements.push({
    id: 'scale-reference',
    type: 'table_rectangular',
    position: { x: 5, y: 5 },
    rotation: 0,
    dimensions: { type: 'fixed', width: 1.0, height: 1.0 },
    label: '1m x 1m',
  });

  return elements;
}

/**
 * Create a standard wedding layout with multiple table types
 */
export function createWeddingTestLayout(): LayoutElement[] {
  const elements: LayoutElement[] = [];

  // Head table (imperial)
  elements.push({
    id: 'head-table',
    type: 'table_imperial',
    position: { x: 10, y: 2 },
    rotation: 0,
    dimensions: { type: 'fixed', width: 2.4, height: 1.2 },
    label: 'Head Table',
  });

  // Guest round tables - 3x3 grid
  const startX = 4;
  const startY = 6;
  const spacing = 4;
  let tableNum = 1;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      elements.push({
        id: `guest-table-${tableNum}`,
        type: 'table_round',
        position: {
          x: startX + col * spacing,
          y: startY + row * spacing,
        },
        rotation: 0,
        dimensions: { type: 'fixed', diameter: 1.8 },
        label: `T${tableNum}`,
      });
      tableNum++;
    }
  }

  // Dance floor
  elements.push({
    id: 'dance-floor',
    type: 'dance_floor',
    position: { x: 16, y: 10 },
    rotation: 0,
    dimensions: {
      type: 'configurable',
      unitSize: 0.6,
      unitsWide: 6,
      unitsDeep: 5,
      minUnits: 2,
      maxUnits: 20,
    },
    label: 'Dance Floor',
  });

  return elements;
}
