# Agent 1: Core Canvas Engine

## Role Definition

You are responsible for building the foundational canvas system for a 2D layout editor. Your work creates the "world" where all elements will live. You do NOT handle specific elements like tables or chairs — only the viewport, coordinate system, and navigation.

---

## Your Responsibilities

### 1. Coordinate System

- Implement world coordinates (infinite 2D space) vs screen coordinates (visible viewport)
- Create reliable conversion functions:
  - `worldToScreen(point: WorldPoint): ScreenPoint`
  - `screenToWorld(point: ScreenPoint): WorldPoint`
- Handle device pixel ratio (DPR) for crisp rendering on retina displays

### 2. Viewport Management

- Track viewport state: `{ x, y, zoom, width, height }`
- Implement bounds calculation for what's currently visible
- Support viewport culling helpers (determine if a rect is visible)

### 3. Zoom System

- Zoom range: 0.1x to 5x (configurable)
- **Critical**: Zoom must pivot around cursor position, not center
- Smooth zoom with configurable easing
- Zoom controls: mouse wheel, pinch gesture, buttons (+/-)
- Keyboard shortcuts: Cmd/Ctrl + Plus/Minus, Cmd/Ctrl + 0 (reset)

### 4. Pan System

- Pan via mouse drag (middle button or Space + left click)
- Pan via touch (two-finger drag)
- Pan via keyboard (arrow keys with configurable speed)
- Inertia/momentum after releasing drag (optional, can be toggled)
- Boundary limits (optional, can be disabled for infinite canvas)

### 5. Grid System

- Configurable grid size (default: 10px minor, 100px major)
- Grid renders at appropriate density based on zoom level
- Snap-to-grid helper function: `snapToGrid(point: WorldPoint, gridSize: number): WorldPoint`
- Grid visibility toggle

---

## File Structure

You own these files exclusively:

```
src/
  layout-maker/
    canvas/
      CanvasViewport.tsx      # Main canvas component with viewport logic
      useViewport.ts          # Hook for viewport state and controls
      useZoom.ts              # Hook for zoom behavior
      usePan.ts               # Hook for pan behavior
      coordinateUtils.ts      # Conversion functions
      gridUtils.ts            # Grid calculation and snapping
      constants.ts            # Default values, limits
      types.ts                # TypeScript types for canvas system
```

---

## Types You Must Define

```typescript
// In types.ts

export interface WorldPoint {
  x: number;
  y: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;           // World X of viewport center
  y: number;           // World Y of viewport center
  zoom: number;        // Current zoom level (1 = 100%)
  width: number;       // Viewport width in screen pixels
  height: number;      // Viewport height in screen pixels
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GridConfig {
  minorSize: number;   // Small grid divisions
  majorSize: number;   // Large grid divisions
  visible: boolean;
  snapEnabled: boolean;
}

export interface ZoomConfig {
  min: number;
  max: number;
  step: number;        // Zoom increment per wheel tick
  smoothing: boolean;
}
```

---

## Integration Points

You must EXPORT these for other agents to use:

```typescript
// Public API from useViewport.ts

export interface ViewportAPI {
  // State
  viewport: ViewportState;
  bounds: ViewportBounds;
  
  // Coordinate conversion
  worldToScreen: (point: WorldPoint) => ScreenPoint;
  screenToWorld: (point: ScreenPoint) => WorldPoint;
  
  // Navigation
  zoomTo: (level: number, pivot?: ScreenPoint) => void;
  zoomIn: (pivot?: ScreenPoint) => void;
  zoomOut: (pivot?: ScreenPoint) => void;
  panTo: (worldPoint: WorldPoint) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  resetView: () => void;
  fitToContent: (bounds: ViewportBounds, padding?: number) => void;
  
  // Grid
  snapToGrid: (point: WorldPoint) => WorldPoint;
  setGridConfig: (config: Partial<GridConfig>) => void;
}
```

---

## Implementation Guidelines

### Performance Requirements

- Use `requestAnimationFrame` for smooth animations
- Debounce resize handlers
- Memoize expensive calculations (bounds, conversions)
- Use CSS transforms for viewport positioning when possible

### Event Handling

```typescript
// Zoom pivot calculation (critical)
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  
  const mouseScreen: ScreenPoint = { x: e.clientX, y: e.clientY };
  const mouseWorldBefore = screenToWorld(mouseScreen);
  
  // Apply zoom
  const newZoom = clamp(zoom * (e.deltaY > 0 ? 0.9 : 1.1), MIN_ZOOM, MAX_ZOOM);
  setZoom(newZoom);
  
  // Adjust viewport so mouse stays over same world point
  const mouseWorldAfter = screenToWorld(mouseScreen);
  const dx = mouseWorldAfter.x - mouseWorldBefore.x;
  const dy = mouseWorldAfter.y - mouseWorldBefore.y;
  
  setViewport(prev => ({
    ...prev,
    x: prev.x - dx,
    y: prev.y - dy,
    zoom: newZoom
  }));
};
```

### Coordinate Conversion (reference implementation)

```typescript
export function worldToScreen(
  world: WorldPoint,
  viewport: ViewportState
): ScreenPoint {
  return {
    x: (world.x - viewport.x) * viewport.zoom + viewport.width / 2,
    y: (world.y - viewport.y) * viewport.zoom + viewport.height / 2
  };
}

export function screenToWorld(
  screen: ScreenPoint,
  viewport: ViewportState
): WorldPoint {
  return {
    x: (screen.x - viewport.width / 2) / viewport.zoom + viewport.x,
    y: (screen.y - viewport.height / 2) / viewport.zoom + viewport.y
  };
}
```

---

## Testing Checklist

Before considering your work complete, verify:

- [ ] Zoom pivots around cursor position, not center
- [ ] Pan works with mouse drag, touch, and keyboard
- [ ] Coordinate conversions are accurate at all zoom levels
- [ ] Grid renders correctly and scales with zoom
- [ ] Snap-to-grid returns correct values
- [ ] No jitter or jumping during rapid zoom/pan
- [ ] Performance stays smooth with continuous interaction
- [ ] Viewport state persists correctly (no drift over time)

---

## Do NOT Touch

- Element rendering (tables, chairs, etc.)
- Element selection or manipulation
- State persistence to backend
- Undo/redo system
- Any files outside your designated folder

---

## Communication Protocol

When you complete a milestone, document it in a comment at the top of the relevant file:

```typescript
/**
 * AGENT_1 STATUS: Complete
 * Last updated: [date]
 * 
 * Exports ready for integration:
 * - useViewport hook
 * - worldToScreen / screenToWorld
 * - snapToGrid
 * 
 * Known issues: None
 */
```

If you need something from another agent, create a clearly marked TODO:

```typescript
// TODO [NEED FROM AGENT_2]: Element bounds for fitToContent calculation
```