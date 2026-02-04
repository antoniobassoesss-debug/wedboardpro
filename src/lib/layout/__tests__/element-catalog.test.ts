/**
 * Element Catalog Tests
 *
 * Tests for element catalog definitions and utilities.
 */

import {
  ELEMENT_CATALOG,
  getCatalogEntry,
  getCatalogEntriesByType,
  getTableEntries,
  getRoundTableEntries,
  getRectangularTableEntries,
} from '../element-catalog';
import { getRealDimensions } from '../scale-utils';

describe('ELEMENT_CATALOG', () => {
  describe('round tables', () => {
    it('ROUND_TABLE_150 has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.ROUND_TABLE_150;
      expect(entry.type).toBe('table_round');
      expect(entry.dimensions.type).toBe('fixed');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.diameter).toBe(1.5);
      }
      expect(entry.defaultCapacity).toBe(8);
    });

    it('ROUND_TABLE_180 has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.ROUND_TABLE_180;
      expect(entry.dimensions.type).toBe('fixed');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.diameter).toBe(1.8);
      }
      expect(entry.defaultCapacity).toBe(10);
    });

    it('ROUND_TABLE_200 has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.ROUND_TABLE_200;
      expect(entry.dimensions.type).toBe('fixed');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.diameter).toBe(2.0);
      }
      expect(entry.defaultCapacity).toBe(12);
    });
  });

  describe('rectangular tables', () => {
    it('RECT_TABLE_180x90 has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.RECT_TABLE_180x90;
      expect(entry.type).toBe('table_rectangular');
      expect(entry.dimensions.type).toBe('fixed');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.width).toBe(1.8);
        expect(entry.dimensions.height).toBe(0.9);
      }
    });

    it('IMPERIAL_TABLE has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.IMPERIAL_TABLE;
      expect(entry.type).toBe('table_imperial');
      expect(entry.dimensions.type).toBe('fixed');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.width).toBe(2.4);
        expect(entry.dimensions.height).toBe(1.2);
      }
    });
  });

  describe('chairs', () => {
    it('STANDARD_CHAIR has correct dimensions', () => {
      const entry = ELEMENT_CATALOG.STANDARD_CHAIR;
      expect(entry.type).toBe('chair');
      if (entry.dimensions.type === 'fixed') {
        expect(entry.dimensions.width).toBe(0.45);
        expect(entry.dimensions.height).toBe(0.45);
      }
    });
  });

  describe('configurable elements', () => {
    it('DANCE_FLOOR has configurable dimensions', () => {
      const entry = ELEMENT_CATALOG.DANCE_FLOOR;
      expect(entry.type).toBe('dance_floor');
      expect(entry.dimensions.type).toBe('configurable');
      if (entry.dimensions.type === 'configurable') {
        expect(entry.dimensions.unitSize).toBe(0.6);
        expect(entry.dimensions.minUnits).toBe(2);
        expect(entry.dimensions.maxUnits).toBe(20);
      }
    });
  });
});

describe('getCatalogEntry', () => {
  it('returns correct entry for ROUND_TABLE_180', () => {
    const entry = getCatalogEntry('ROUND_TABLE_180');
    expect(entry.name).toBe('Round Table 180cm');
  });

  it('returns correct entry for STAGE_MEDIUM', () => {
    const entry = getCatalogEntry('STAGE_MEDIUM');
    expect(entry.name).toBe('Medium Stage');
    if (entry.dimensions.type === 'fixed') {
      expect(entry.dimensions.width).toBe(6.0);
      expect(entry.dimensions.height).toBe(4.0);
    }
  });
});

describe('getCatalogEntriesByType', () => {
  it('returns all table_round entries', () => {
    const entries = getCatalogEntriesByType('table_round');
    expect(entries.length).toBe(3);
    entries.forEach((entry) => {
      expect(entry.type).toBe('table_round');
    });
  });

  it('returns all chair entries', () => {
    const entries = getCatalogEntriesByType('chair');
    expect(entries.length).toBe(2);
  });
});

describe('getTableEntries', () => {
  it('returns all table entries', () => {
    const entries = getTableEntries();
    expect(entries.length).toBeGreaterThanOrEqual(6);
    entries.forEach((entry) => {
      expect(entry.type).toMatch(/^table_/);
    });
  });
});

describe('getRoundTableEntries', () => {
  it('returns only round tables', () => {
    const entries = getRoundTableEntries();
    expect(entries.length).toBe(3);
    entries.forEach((entry) => {
      expect(entry.type).toBe('table_round');
    });
  });
});

describe('getRectangularTableEntries', () => {
  it('returns rectangular and imperial tables', () => {
    const entries = getRectangularTableEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);
    entries.forEach((entry) => {
      expect(['table_rectangular', 'table_imperial']).toContain(entry.type);
    });
  });
});

describe('catalog dimensions with getRealDimensions', () => {
  it('round table diameter converts to width/height', () => {
    const dims = getRealDimensions(ELEMENT_CATALOG.ROUND_TABLE_180.dimensions);
    expect(dims.width).toBe(1.8);
    expect(dims.height).toBe(1.8);
  });

  it('rectangular table has correct dimensions', () => {
    const dims = getRealDimensions(ELEMENT_CATALOG.RECT_TABLE_240x90.dimensions);
    expect(dims.width).toBe(2.4);
    expect(dims.height).toBe(0.9);
  });

  it('configurable element calculates correct dimensions', () => {
    const dims = getRealDimensions(ELEMENT_CATALOG.DANCE_FLOOR.dimensions);
    // 0.6m * 5 units = 3m
    expect(dims.width).toBe(3);
    expect(dims.height).toBe(3);
  });
});
