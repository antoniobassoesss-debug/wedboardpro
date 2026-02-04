/**
 * Layout Maker Types - Main Export
 *
 * Re-exports all types from the types module.
 */

// Element types
export type {
  ElementType,
  TableType,
  ZoneType,
  DietaryType as ElementDietaryType,
  BorderStyle,
  BaseElement,
  ChairConfig,
  TableElement,
  ChairElement,
  ZoneElement,
  BenchElement,
  LoungeElement,
  ServiceElement,
  DecorationElement,
  CanvasElement,
} from './elements';

export {
  isTableElement,
  isChairElement,
  isZoneElement,
  isServiceElement,
  isDecorationElement,
} from './elements';

// Layout types
export type {
  LayoutStatus,
  MeasurementUnit,
  Wall,
  CalibrationPoints,
  FloorPlanBackground,
  LayoutSettings,
  ElementGroup,
  SpaceDimensions,
  VenueSpace,
  Layout,
  LayoutSummary,
} from './layout';

export {
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_PIXELS_PER_METER,
  CURRENT_SCHEMA_VERSION,
} from './layout';

// Guest types
export type {
  NonNullDietaryType,
  AllergyType,
  RsvpStatus,
  GuestAssignment,
  Guest,
  GuestSummary,
  TableGuestSummary,
} from './guests';

// Re-export DietaryType from elements (aliased as ElementDietaryType above, also export original name)
export type { DietaryType } from './elements';

export {
  DIETARY_ICONS,
  ALLERGY_ICONS,
  getGuestFullName,
  getGuestInitials,
  createGuestSummary,
} from './guests';

// Viewport types
export type {
  WorldPoint,
  ScreenPoint,
  ViewportState,
  ViewportBounds,
} from './viewport';

export {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  DEFAULT_VIEWPORT,
  screenToWorld,
  worldToScreen,
  getViewportBounds,
  clampZoom,
  calculateZoomToFit,
} from './viewport';

// History types
export type {
  ActionType,
  PartialLayoutState,
  HistoryEntry,
  HistoryState,
} from './history';

export {
  MAX_HISTORY_ENTRIES,
  DEFAULT_HISTORY_STATE,
  ACTION_LABELS,
  createActionLabel,
  canUndo,
  canRedo,
  getCurrentEntry,
  getNextEntry,
} from './history';

// Export types
export type {
  ExportFormat,
  PageSize,
  PageOrientation,
  ExportContentOptions,
  ExportFormatOptions,
  ExportBrandingOptions,
  ExportPreset,
  BuiltInPresetName,
  ExportProgress,
} from './export';

export {
  PAGE_SIZES,
  DEFAULT_CONTENT_OPTIONS,
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_BRANDING_OPTIONS,
  BUILT_IN_PRESETS,
  DEFAULT_EXPORT_PROGRESS,
} from './export';
