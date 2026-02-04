/**
 * Layout Components Index
 *
 * Export all layout-related components.
 */

// Main canvas
export { LayoutCanvas } from './LayoutCanvas';
export type { LayoutCanvasProps } from './LayoutCanvas';

// Interactive canvas (full featured)
export { InteractiveLayoutCanvas } from './InteractiveLayoutCanvas';
export type { InteractiveLayoutCanvasProps } from './InteractiveLayoutCanvas';

// Layer components
export { GridLayer } from './GridLayer';
export { WallsLayer } from './WallsLayer';
export type { WallsLayerProps, WallData } from './WallsLayer';
export { ElementsLayer } from './ElementsLayer';
export type { ElementsLayerProps } from './ElementsLayer';

// Control components
export { ZoomControls } from './ZoomControls';
export type { ZoomControlsProps } from './ZoomControls';
export { GridSettingsPanel } from './GridSettingsPanel';
export type { GridSettingsPanelProps } from './GridSettingsPanel';
export { PositionTooltip } from './PositionTooltip';
export type { PositionTooltipProps } from './PositionTooltip';

// Debug components
export { ScaleDebugInfo, ScaleDebugInfoCompact } from './ScaleDebugInfo';

// Element components
export * from './elements';
