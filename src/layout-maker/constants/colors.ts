/**
 * Color Constants
 *
 * All colors used in the Layout Maker interface.
 */

/**
 * Selection & Interaction Colors
 */
export const SELECTION_COLOR = '#0066FF';
export const SELECTION_COLOR_LIGHT = '#0066FF33'; // 20% opacity
export const HOVER_COLOR = '#0066FF22'; // 13% opacity
export const COLLISION_COLOR = '#FF3333';
export const COLLISION_COLOR_LIGHT = '#FF333333';
export const SNAP_GUIDE_COLOR = '#00CC66';
export const SNAP_GUIDE_COLOR_LIGHT = '#00CC6633';

/**
 * Grid Colors
 */
export const GRID_COLOR = '#E5E5E5';
export const GRID_MAJOR_COLOR = '#CCCCCC';
export const GRID_BACKGROUND = '#FAFAFA';

/**
 * Ruler Colors
 */
export const RULER_BACKGROUND = '#F5F5F5';
export const RULER_TEXT = '#666666';
export const RULER_TICK = '#CCCCCC';
export const RULER_CURSOR_HIGHLIGHT = '#0066FF';

/**
 * Wall Colors
 */
export const WALL_COLOR = '#333333';
export const WALL_FILL = '#E8E8E8';
export const DOOR_COLOR = '#666666';

/**
 * Element Colors by Category
 */
export const ELEMENT_COLORS = {
  // Tables
  table: {
    fill: '#FFFFFF',
    stroke: '#333333',
    text: '#333333',
  },

  // Chairs
  chair: {
    empty: '#FFFFFF',
    emptyStroke: '#999999',
    assigned: '#4A90D9',
    assignedStroke: '#2E6BB0',
    selected: '#0066FF',
  },

  // Zones
  zones: {
    'dance-floor': { fill: '#FFE4B5', stroke: '#DEB887', opacity: 0.5 },
    'stage': { fill: '#DDA0DD', stroke: '#BA55D3', opacity: 0.5 },
    'cocktail-area': { fill: '#98FB98', stroke: '#32CD32', opacity: 0.5 },
    'ceremony-area': { fill: '#E6E6FA', stroke: '#9370DB', opacity: 0.5 },
  },

  // Service
  service: {
    bar: { fill: '#8B4513', stroke: '#654321' },
    buffet: { fill: '#F5DEB3', stroke: '#D2B48C' },
    'cake-table': { fill: '#FFB6C1', stroke: '#FF69B4' },
    'gift-table': { fill: '#87CEEB', stroke: '#4682B4' },
    'dj-booth': { fill: '#2F2F2F', stroke: '#1A1A1A' },
  },

  // Decoration
  decoration: {
    'flower-arrangement': { fill: '#FFB7C5', stroke: '#FF69B4' },
    'photo-booth': { fill: '#F0E68C', stroke: '#DAA520' },
    'arch': { fill: '#D4AF37', stroke: '#B8860B' },
    'custom': { fill: '#CCCCCC', stroke: '#999999' },
  },
} as const;

/**
 * Dietary Indicator Colors
 */
export const DIETARY_COLORS: Record<string, string> = {
  regular: '#8B4513', // Brown
  vegetarian: '#228B22', // Forest green
  vegan: '#32CD32', // Lime green
  halal: '#4169E1', // Royal blue
  kosher: '#9370DB', // Medium purple
  other: '#808080', // Gray
};

/**
 * Status Colors
 */
export const STATUS_COLORS = {
  draft: { background: '#E5E5E5', text: '#666666' },
  in_progress: { background: '#FFF3CD', text: '#856404' },
  ready: { background: '#D4EDDA', text: '#155724' },
  approved: { background: '#CCE5FF', text: '#004085' },
} as const;

/**
 * Sync Status Colors
 */
export const SYNC_STATUS_COLORS = {
  idle: '#6B7280',
  pending: '#F59E0B',
  syncing: '#3B82F6',
  saved: '#10B981',
  error: '#EF4444',
} as const;

/**
 * Toast Colors
 */
export const TOAST_COLORS = {
  success: { background: '#10B981', text: '#FFFFFF' },
  error: { background: '#EF4444', text: '#FFFFFF' },
  warning: { background: '#F59E0B', text: '#1F2937' },
  info: { background: '#3B82F6', text: '#FFFFFF' },
} as const;

/**
 * Handle Colors
 */
export const HANDLE_COLORS = {
  resize: { fill: '#FFFFFF', stroke: '#0066FF' },
  rotate: { fill: '#0066FF', stroke: '#0044AA' },
} as const;

/**
 * Helper: Get zone color
 */
export function getZoneColor(zoneType: string): { fill: string; stroke: string; opacity: number } {
  const colors = ELEMENT_COLORS.zones[zoneType as keyof typeof ELEMENT_COLORS.zones];
  return colors || { fill: '#CCCCCC', stroke: '#999999', opacity: 0.5 };
}

/**
 * Helper: Get service element color
 */
export function getServiceColor(serviceType: string): { fill: string; stroke: string } {
  const colors = ELEMENT_COLORS.service[serviceType as keyof typeof ELEMENT_COLORS.service];
  return colors || { fill: '#CCCCCC', stroke: '#999999' };
}

/**
 * Helper: Get decoration element color
 */
export function getDecorationColor(decorationType: string): { fill: string; stroke: string } {
  const colors = ELEMENT_COLORS.decoration[decorationType as keyof typeof ELEMENT_COLORS.decoration];
  return colors || { fill: '#CCCCCC', stroke: '#999999' };
}

/**
 * Helper: Hex to RGBA
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
