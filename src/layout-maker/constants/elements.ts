/**
 * Standard Element Dimensions (Real-World Accurate)
 *
 * All dimensions in METERS.
 * These are reference constants for the element catalog/sidebar.
 * Element creation uses ELEMENT_DEFAULTS from elementDefaults.ts.
 */

export const STANDARD_ELEMENT_SIZES = {
  tables: {
    round: {
      small: { diameter: 1.0, seats: 4, name: 'Round 4-seat (1m)' },
      medium: { diameter: 1.2, seats: 6, name: 'Round 6-seat (1.2m)' },
      standard: { diameter: 1.5, seats: 8, name: 'Round 8-seat (1.5m)' },
      large: { diameter: 1.8, seats: 10, name: 'Round 10-seat (1.8m)' },
      xlarge: { diameter: 2.1, seats: 12, name: 'Round 12-seat (2.1m)' },
    },
    rectangular: {
      small: { width: 1.2, height: 0.75, seats: 4, name: 'Rect 4-seat (1.2m × 0.75m)' },
      medium: { width: 1.8, height: 0.75, seats: 6, name: 'Rect 6-seat (1.8m × 0.75m)' },
      standard: { width: 2.4, height: 0.75, seats: 8, name: 'Rect 8-seat (2.4m × 0.75m)' },
      large: { width: 3.0, height: 0.75, seats: 10, name: 'Rect 10-seat (3m × 0.75m)' },
      banquet: { width: 3.6, height: 0.75, seats: 12, name: 'Banquet (3.6m × 0.75m)' },
    },
  },

  chairs: {
    standard: { diameter: 0.45, name: 'Standard chair (45cm)' },
  },

  stage: {
    small: { width: 3.0, height: 2.0, name: 'Small stage (3m × 2m)' },
    medium: { width: 6.0, height: 4.0, name: 'Medium stage (6m × 4m)' },
    large: { width: 8.0, height: 6.0, name: 'Large stage (8m × 6m)' },
  },

  danceFloor: {
    small: { width: 4.0, height: 4.0, name: 'Small dance floor (4m × 4m)' },
    medium: { width: 6.0, height: 6.0, name: 'Medium dance floor (6m × 6m)' },
    large: { width: 8.0, height: 8.0, name: 'Large dance floor (8m × 8m)' },
  },

  bar: {
    standard: { width: 2.0, height: 0.6, name: 'Standard bar (2m × 60cm)' },
    long: { width: 4.0, height: 0.6, name: 'Long bar (4m × 60cm)' },
  },

  buffet: {
    standard: { width: 2.4, height: 0.75, name: 'Buffet table (2.4m × 75cm)' },
    long: { width: 3.6, height: 0.75, name: 'Long buffet (3.6m × 75cm)' },
  },
} as const;

/**
 * Space dimension limits (meters)
 */
export const SPACE_LIMITS = {
  MIN_WIDTH: 5,
  MAX_WIDTH: 200,
  MIN_HEIGHT: 5,
  MAX_HEIGHT: 200,
  DEFAULT_WIDTH: 20,
  DEFAULT_HEIGHT: 20,
  STEP: 0.5,
} as const;
