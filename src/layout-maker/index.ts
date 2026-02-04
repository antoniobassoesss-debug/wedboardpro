/**
 * Layout Maker - Main Export
 *
 * Complete export of all types, stores, utilities, and constants.
 */

// Types
export * from './types/elements';
export * from './types/layout';
export * from './types/viewport';
export * from './types/history';
export * from './types/guests';
export * from './types/export';

// Stores
export {
  useLayoutStore,
  useViewportStore,
  useSelectionStore,
  useHistoryStore,
  useUIStore,
} from './stores';

export { createStateSnapshot } from './stores/historyStore';

// Constants - Selective export to avoid duplicates
export {
  ELEMENT_DEFAULTS,
  CHAIR_CONFIG_DEFAULTS,
  TABLE_CAPACITIES,
  MIN_ELEMENT_SPACING,
  DEFAULT_AISLE_WIDTH,
  TABLE_NUMBER_START,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_PRESETS,
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
  SELECTION_COLOR,
  COLLISION_COLOR,
  SNAP_GUIDE_COLOR,
  GRID_COLOR,
  GRID_MAJOR_COLOR,
  ELEMENT_COLORS,
  DIETARY_COLORS,
  STATUS_COLORS,
  SYNC_STATUS_COLORS,
  TOAST_COLORS,
  HANDLE_COLORS,
  SHORTCUTS,
  SHORTCUT_MAP,
  DRAG_MODIFIERS,
  RESIZE_MODIFIERS,
  ROTATE_MODIFIERS,
  NUDGE_AMOUNT,
  NUDGE_AMOUNT_LARGE,
} from './constants';

// Utilities - Selective export to avoid duplicates with types/viewport
export {
  distance,
  midpoint,
  rotatePoint,
  toRadians,
  toDegrees,
  normalizeAngle,
  getRectCorners,
  getRotatedBoundingBox,
  pointInRect,
  rectsIntersect,
  pointInCircle,
  pointOnBoundary,
  getElementArea,
  getElementPerimeter,
  clamp,
  lerp,
  mapRange,
  generateId,
  isValidId,
  generateTableNumber,
  generateUniqueLabel,
  generateShortId,
  generateTimestampId,
  parseTableNumber,
  formatTableNumber,
  isValidElement,
  isValidLayout,
  sanitizeElement,
  sanitizeLayout,
  sanitizeZoom,
  sanitizePixelsPerMeter,
  sanitizeGridSize,
  isValidColor,
  isValidUrl,
  sanitizeString,
  isValidElementType,
  isValidPosition,
  isValidDimension,
  screenToWorld,
  worldToScreen,
  metersToPixels,
  pixelsToMeters,
  calculateViewBox,
  worldRectToScreen,
  screenRectToWorld,
  getElementScreenRect,
  worldDeltaToScreen,
  screenDeltaToWorld,
  calculateZoomToFitBounds,
  isPointInViewport,
  isRectInViewport,
} from './utils';
