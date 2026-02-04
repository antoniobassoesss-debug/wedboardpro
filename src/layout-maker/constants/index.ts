/**
 * Layout Maker Constants - Main Export
 *
 * Re-exports all constants from the constants module.
 */

// Element Defaults
export {
  ELEMENT_DEFAULTS,
  CHAIR_CONFIG_DEFAULTS,
  TABLE_CAPACITIES,
  getElementDefault,
  getRecommendedTableSize,
  MIN_ELEMENT_SPACING,
  DEFAULT_AISLE_WIDTH,
  TABLE_NUMBER_START,
} from './elementDefaults';

export type { ElementDefault, TableCapacity } from './elementDefaults';

// Viewport
export {
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  ZOOM_WHEEL_SENSITIVITY,
  ZOOM_PRESETS,
  DEFAULT_PIXELS_PER_METER,
  DEFAULT_GRID_SIZE,
  MAJOR_GRID_INTERVAL,
  MIN_GRID_SIZE,
  MAX_GRID_SIZE,
  DEFAULT_SNAP_THRESHOLD,
  SNAP_THRESHOLDS,
  VIEWPORT_PADDING,
  RULER_SIZE,
  PAN_SPEED,
  PAN_KEYBOARD_STEP,
  PAN_KEYBOARD_STEP_LARGE,
  ZOOM_ANIMATION_DURATION,
  PAN_ANIMATION_DURATION,
  metersToPixels,
  pixelsToMeters,
  clampZoom,
  roundZoomToStep,
  formatZoomPercent,
  formatMeters,
  formatFeet,
  formatDimension,
} from './viewport';

// Colors
export {
  SELECTION_COLOR,
  SELECTION_COLOR_LIGHT,
  HOVER_COLOR,
  COLLISION_COLOR,
  COLLISION_COLOR_LIGHT,
  SNAP_GUIDE_COLOR,
  SNAP_GUIDE_COLOR_LIGHT,
  GRID_COLOR,
  GRID_MAJOR_COLOR,
  GRID_BACKGROUND,
  RULER_BACKGROUND,
  RULER_TEXT,
  RULER_TICK,
  RULER_CURSOR_HIGHLIGHT,
  WALL_COLOR,
  WALL_FILL,
  DOOR_COLOR,
  ELEMENT_COLORS,
  DIETARY_COLORS,
  STATUS_COLORS,
  SYNC_STATUS_COLORS,
  TOAST_COLORS,
  HANDLE_COLORS,
  getZoneColor,
  getServiceColor,
  getDecorationColor,
  hexToRgba,
} from './colors';

// Shortcuts
export {
  SHORTCUTS,
  SHORTCUT_MAP,
  getShortcutsByCategory,
  formatShortcut,
  matchesShortcut,
  findMatchingShortcut,
  DRAG_MODIFIERS,
  RESIZE_MODIFIERS,
  ROTATE_MODIFIERS,
  NUDGE_AMOUNT,
  NUDGE_AMOUNT_LARGE,
} from './shortcuts';

export type { ShortcutDef, ShortcutCategory } from './shortcuts';
