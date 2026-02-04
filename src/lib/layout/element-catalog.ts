/**
 * Element Catalog
 *
 * Standard element definitions with real-world dimensions.
 * Used for creating elements with correct proportional sizes.
 */

import type { FixedDimensions, ConfigurableDimensions } from '../../types/layout-scale';

/**
 * Element catalog entry
 */
export interface ElementCatalogEntry {
  type: string;
  name: string;
  dimensions: FixedDimensions | ConfigurableDimensions;
  defaultCapacity?: number;
}

/**
 * Standard element definitions with real-world dimensions
 */
export const ELEMENT_CATALOG = {
  // Round tables
  ROUND_TABLE_150: {
    type: 'table_round',
    name: 'Round Table 150cm',
    dimensions: { type: 'fixed', diameter: 1.5 } as FixedDimensions,
    defaultCapacity: 8,
  },
  ROUND_TABLE_180: {
    type: 'table_round',
    name: 'Round Table 180cm',
    dimensions: { type: 'fixed', diameter: 1.8 } as FixedDimensions,
    defaultCapacity: 10,
  },
  ROUND_TABLE_200: {
    type: 'table_round',
    name: 'Round Table 200cm',
    dimensions: { type: 'fixed', diameter: 2.0 } as FixedDimensions,
    defaultCapacity: 12,
  },

  // Rectangular tables
  RECT_TABLE_180x90: {
    type: 'table_rectangular',
    name: 'Rectangular Table 180×90',
    dimensions: { type: 'fixed', width: 1.8, height: 0.9 } as FixedDimensions,
    defaultCapacity: 6,
  },
  RECT_TABLE_240x90: {
    type: 'table_rectangular',
    name: 'Rectangular Table 240×90',
    dimensions: { type: 'fixed', width: 2.4, height: 0.9 } as FixedDimensions,
    defaultCapacity: 8,
  },
  IMPERIAL_TABLE: {
    type: 'table_imperial',
    name: 'Imperial Table 240×120',
    dimensions: { type: 'fixed', width: 2.4, height: 1.2 } as FixedDimensions,
    defaultCapacity: 10,
  },

  // Chairs
  STANDARD_CHAIR: {
    type: 'chair',
    name: 'Standard Chair',
    dimensions: { type: 'fixed', width: 0.45, height: 0.45 } as FixedDimensions,
  },
  CHIAVARI_CHAIR: {
    type: 'chair',
    name: 'Chiavari Chair',
    dimensions: { type: 'fixed', width: 0.40, height: 0.40 } as FixedDimensions,
  },

  // Dance floor
  DANCE_FLOOR: {
    type: 'dance_floor',
    name: 'Dance Floor',
    dimensions: {
      type: 'configurable',
      unitSize: 0.6,
      unitsWide: 5,
      unitsDeep: 5,
      minUnits: 2,
      maxUnits: 20,
    } as ConfigurableDimensions,
  },

  // Stage
  STAGE_SMALL: {
    type: 'stage',
    name: 'Small Stage',
    dimensions: { type: 'fixed', width: 4.0, height: 3.0 } as FixedDimensions,
  },
  STAGE_MEDIUM: {
    type: 'stage',
    name: 'Medium Stage',
    dimensions: { type: 'fixed', width: 6.0, height: 4.0 } as FixedDimensions,
  },

  // DJ/Bar elements
  DJ_BOOTH: {
    type: 'dj_booth',
    name: 'DJ Booth',
    dimensions: { type: 'fixed', width: 2.0, height: 1.0 } as FixedDimensions,
  },
  BAR_COUNTER: {
    type: 'bar',
    name: 'Bar Counter',
    dimensions: {
      type: 'configurable',
      unitSize: 1.0,
      unitsWide: 3,
      unitsDeep: 1,
      minUnits: 1,
      maxUnits: 10,
    } as ConfigurableDimensions,
  },
} as const;

export type ElementCatalogKey = keyof typeof ELEMENT_CATALOG;

/**
 * Get catalog entry by key
 */
export function getCatalogEntry(key: ElementCatalogKey): ElementCatalogEntry {
  return ELEMENT_CATALOG[key];
}

/**
 * Get all entries of a specific type
 */
export function getCatalogEntriesByType(type: string): ElementCatalogEntry[] {
  return Object.values(ELEMENT_CATALOG).filter((entry) => entry.type === type);
}

/**
 * Get all table entries
 */
export function getTableEntries(): ElementCatalogEntry[] {
  return Object.values(ELEMENT_CATALOG).filter((entry) =>
    entry.type.startsWith('table_')
  );
}

/**
 * Get all round table entries
 */
export function getRoundTableEntries(): ElementCatalogEntry[] {
  return getCatalogEntriesByType('table_round');
}

/**
 * Get all rectangular table entries
 */
export function getRectangularTableEntries(): ElementCatalogEntry[] {
  return [
    ...getCatalogEntriesByType('table_rectangular'),
    ...getCatalogEntriesByType('table_imperial'),
  ];
}
