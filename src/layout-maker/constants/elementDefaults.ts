/**
 * Element Defaults
 *
 * Default sizes and configurations for all element types.
 * All dimensions are in METERS.
 */

import type { ElementType, ChairConfig } from '../types/elements';

/**
 * Element Default Configuration
 */
export interface ElementDefault {
  width: number; // meters
  height: number; // meters
  capacity?: number; // for tables/seating
  label?: string; // display name
}

/**
 * Element Defaults by Type and Variant
 *
 * Keys follow pattern: {type} or {type}-{capacity}
 */
export const ELEMENT_DEFAULTS: Record<string, ElementDefault> = {
  // Base table types (default to 8-person capacity)
  'table-round': { width: 1.5, height: 1.5, capacity: 8, label: 'Round Table' },
  'table-rectangular': { width: 2.4, height: 0.75, capacity: 8, label: 'Rectangular Table' },
  'table-oval': { width: 2.2, height: 1.2, capacity: 8, label: 'Oval Table' },
  'table-square': { width: 1.5, height: 1.5, capacity: 8, label: 'Square Table' },

  // Round Tables with specific capacity
  'table-round-4': { width: 1.0, height: 1.0, capacity: 4, label: 'Round Table (4)' },
  'table-round-6': { width: 1.2, height: 1.2, capacity: 6, label: 'Round Table (6)' },
  'table-round-8': { width: 1.5, height: 1.5, capacity: 8, label: 'Round Table (8)' },
  'table-round-10': { width: 1.8, height: 1.8, capacity: 10, label: 'Round Table (10)' },
  'table-round-12': { width: 2.1, height: 2.1, capacity: 12, label: 'Round Table (12)' },

  // Rectangular Tables with specific capacity
  'table-rectangular-4': { width: 1.2, height: 0.75, capacity: 4, label: 'Rectangular Table (4)' },
  'table-rectangular-6': { width: 1.8, height: 0.75, capacity: 6, label: 'Rectangular Table (6)' },
  'table-rectangular-8': { width: 2.4, height: 0.75, capacity: 8, label: 'Rectangular Table (8)' },
  'table-rectangular-10': { width: 3.0, height: 0.75, capacity: 10, label: 'Rectangular Table (10)' },
  'table-rectangular-12': { width: 3.6, height: 0.75, capacity: 12, label: 'Rectangular Table (12)' },

  // Oval Tables with specific capacity
  'table-oval-6': { width: 1.8, height: 1.0, capacity: 6, label: 'Oval Table (6)' },
  'table-oval-8': { width: 2.2, height: 1.2, capacity: 8, label: 'Oval Table (8)' },
  'table-oval-10': { width: 2.6, height: 1.4, capacity: 10, label: 'Oval Table (10)' },

  // Square Tables with specific capacity
  'table-square-4': { width: 1.0, height: 1.0, capacity: 4, label: 'Square Table (4)' },
  'table-square-8': { width: 1.5, height: 1.5, capacity: 8, label: 'Square Table (8)' },

  // Seating — internal chair (table auto-fill only)
  'chair': { width: 0.45, height: 0.45, label: 'Chair' },

  // Seating — individual sidebar elements
  'seat-standard':  { width: 0.45, height: 0.45, label: 'Standard Chair' },
  'seat-armchair':  { width: 0.80, height: 0.80, label: 'Armchair' },
  'seat-chaise':    { width: 0.70, height: 1.90, label: 'Chaise Longue' },
  'seat-sofa':      { width: 1.50, height: 0.90, label: 'Sofa' },
  'seat-sofa-2':    { width: 1.50, height: 0.90, label: '2-Seat Sofa' },
  'seat-sofa-3':    { width: 2.10, height: 0.90, label: '3-Seat Sofa' },
  'seat-bench':     { width: 1.50, height: 0.40, label: 'Bench' },
  'seat-barstool':  { width: 0.40, height: 0.40, label: 'Bar Stool' },
  'seat-throne':    { width: 0.65, height: 0.70, label: 'Throne Chair' },

  // Ceremony seating block
  'ceremony-block': { width: 8.00, height: 6.00, label: 'Ceremony Seating' },

  // Ceremony
  'altar': { width: 2.0, height: 1.0, label: 'Altar' },
  'pathway': { width: 1.5, height: 10.0, label: 'Pathway' },

  // Zones
  'dance-floor': { width: 4.0, height: 4.0, label: 'Dance Floor' },
  'stage': { width: 3.0, height: 2.0, label: 'Stage' },
  'cocktail-area': { width: 3.0, height: 3.0, label: 'Cocktail Area' },
  'ceremony-area': { width: 5.0, height: 4.0, label: 'Ceremony Area' },

  // Service
  'bar': { width: 2.0, height: 0.6, label: 'Bar' },
  'cocktail': { width: 0.6, height: 0.6, label: 'Cocktail Table' },
  'buffet': { width: 2.4, height: 0.75, label: 'Buffet Table' },
  'cake-table': { width: 0.9, height: 0.9, label: 'Cake Table' },
  'gift-table': { width: 1.5, height: 0.75, label: 'Gift Table' },
  'dj-booth': { width: 1.5, height: 0.8, label: 'DJ Booth' },

  // Decoration
  'flower-arrangement': { width: 0.5, height: 0.5, label: 'Flower Arrangement' },
  'photo-booth': { width: 2.5, height: 2.0, label: 'Photo Booth' },
  'arch': { width: 2.5, height: 0.5, label: 'Arch/Backdrop' },
  'custom': { width: 1.0, height: 1.0, label: 'Custom Element' },

  // Audio Visual
  'av-mixing-desk':    { width: 1.2, height: 0.8, label: 'Mixing Desk' },
  'av-speaker':        { width: 0.4, height: 0.6, label: 'Speaker / PA' },
  'av-subwoofer':      { width: 0.6, height: 0.6, label: 'Subwoofer' },
  'av-truss':          { width: 3.0, height: 0.3, label: 'Truss' },
  'av-moving-head':    { width: 0.4, height: 0.4, label: 'Moving Head' },
  'av-led-wall':       { width: 3.0, height: 0.25, label: 'LED Wall' },
  'av-screen':         { width: 2.5, height: 0.20, label: 'Projection Screen' },
  'av-projector':      { width: 0.5, height: 0.4, label: 'Projector' },
  'av-light-console':  { width: 0.9, height: 0.6, label: 'Lighting Console' },
  'av-preset-full-stage': { width: 1.0, height: 1.0, label: 'Full Stage AV Setup' },

  // Lighting — anchor-based decorative strings
  // width/height here are placeholder defaults; actual bounding box derived from anchor positions at placement time
  'string-lights': { width: 5.0, height: 0.1, label: 'String Lights' },
  'bunting':       { width: 5.0, height: 0.1, label: 'Bunting / Flags' },
};

/**
 * Default Chair Configuration
 */
export const CHAIR_CONFIG_DEFAULTS: ChairConfig = {
  autoGenerate: true,
  chairSpacing: 0.1, // 10cm between chairs
  chairOffset: 0.4, // 40cm from table edge
};

/**
 * Available Table Capacities
 */
export const TABLE_CAPACITIES = [4, 6, 8, 10, 12] as const;
export type TableCapacity = typeof TABLE_CAPACITIES[number];

/**
 * Get default for element type with optional capacity
 */
export function getElementDefault(
  type: ElementType,
  capacity?: number
): ElementDefault {
  // Try with capacity first
  if (capacity) {
    const key = `${type}-${capacity}`;
    if (ELEMENT_DEFAULTS[key]) {
      return ELEMENT_DEFAULTS[key];
    }
  }

  // Fall back to base type
  if (ELEMENT_DEFAULTS[type]) {
    return ELEMENT_DEFAULTS[type];
  }

  // Ultimate fallback
  return { width: 1.0, height: 1.0, label: 'Element' };
}

/**
 * Get recommended table size for capacity
 */
export function getRecommendedTableSize(
  tableType: 'table-round' | 'table-rectangular' | 'table-oval' | 'table-square',
  capacity: number
): { width: number; height: number } {
  const key = `${tableType}-${capacity}`;
  const defaults = ELEMENT_DEFAULTS[key];

  if (defaults) {
    return { width: defaults.width, height: defaults.height };
  }

  // Calculate based on capacity if no preset exists
  if (tableType === 'table-round') {
    // Approximate: diameter = 0.6m + 0.15m per seat
    const diameter = 0.6 + capacity * 0.15;
    return { width: diameter, height: diameter };
  }

  if (tableType === 'table-rectangular') {
    // Standard depth 0.75m, length grows with capacity
    const length = 0.6 + capacity * 0.3;
    return { width: length, height: 0.75 };
  }

  // Default fallback
  return { width: 1.5, height: 1.5 };
}

/**
 * Minimum spacing between elements (meters)
 */
export const MIN_ELEMENT_SPACING = 0.6; // 60cm for wheelchair access

/**
 * Default aisle width (meters)
 */
export const DEFAULT_AISLE_WIDTH = 1.2; // 120cm

/**
 * Table number auto-assignment starting value
 */
export const TABLE_NUMBER_START = 1;
