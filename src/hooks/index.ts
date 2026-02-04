/**
 * Hooks Index
 *
 * Export all layout-related hooks.
 */

// Scale conversion hooks
export {
  useScaleConversion,
  useElementPosition,
  useGridCalculations,
  useZoomState,
} from './useScaleConversion';

// Space bounds hook
export {
  useSpaceBoundsFromWalls,
  useSpaceBoundsFromWallsSelector,
  createDefaultSpaceBounds,
} from './useSpaceBoundsFromWalls';
export type {
  UseSpaceBoundsFromWallsOptions,
  UseSpaceBoundsFromWallsResult,
} from './useSpaceBoundsFromWalls';

// Element drag hook
export { useElementDrag } from './useElementDrag';
export type { DragState, UseElementDragOptions } from './useElementDrag';

// Wheel zoom hook
export { useWheelZoom } from './useWheelZoom';
export type { UseWheelZoomOptions } from './useWheelZoom';

// Keyboard shortcuts hook
export { useLayoutKeyboard } from './useLayoutKeyboard';
export type { UseLayoutKeyboardOptions } from './useLayoutKeyboard';
