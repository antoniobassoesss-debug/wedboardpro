# Agent 2: Element System & Interaction

## Role Definition

You are responsible for building the element manipulation layer of the 2D layout editor. You handle how users interact with objects on the canvas — selecting, dragging, resizing, rotating, and organizing elements. You do NOT handle the canvas viewport (zoom/pan) or data persistence.

---

## Your Responsibilities

### 1. Element Rendering

- Render elements at correct world positions using viewport conversion (from Agent 1)
- Support multiple element types with different visual representations
- Handle element-specific rendering (tables: round/rectangular, chairs, decorations, text labels)
- Render selection indicators (handles, outlines)
- Render guides and alignment helpers during drag

### 2. Selection System

- Single click selection
- Multi-select with Shift + click
- Box/marquee selection (click and drag on empty space)
- Select all (Cmd/Ctrl + A)
- Deselect (click on empty space or Escape)
- Selection state management (selected element IDs)

### 3. Drag and Drop

- Drag single element
- Drag multiple selected elements together
- Drag from toolbar/palette to canvas (new element creation)
- Visual feedback during drag (ghost, snap lines)
- Constrain drag to axis with Shift key

### 4. Transform Operations

- **Move**: Drag to reposition
- **Resize**: Corner and edge handles
  - Maintain aspect ratio with Shift
  - Resize from center with Alt/Option
- **Rotate**: Rotation handle or corner drag with modifier
  - Snap to 15° increments with Shift
- Transform multiple elements together (scale group, rotate group)

### 5. Element Organization

- Z-index management (layers)
- Bring to front / Send to back
- Bring forward / Send backward
- Group elements (optional, phase 2)
- Lock/unlock elements

### 6. Collision & Snapping

- Element-to-element snapping (edge alignment, center alignment)
- Smart guides (show alignment lines during drag)
- Collision detection (optional overlap warning)
- Minimum distance snapping

---

## File Structure

You own these files exclusively:

```
src/
  layout-maker/
    elements/
      ElementRenderer.tsx       # Main component that renders all elements
      ElementItem.tsx          # Individual element rendering
      SelectionOverlay.tsx     # Selection boxes, handles, guides
      useSelection.ts          # Selection state and logic
      useDragDrop.ts          # Drag and drop behavior
      useTransform.ts         # Resize and rotate logic
      useSmartGuides.ts       # Alignment guides during manipulation
      collisionUtils.ts       # Hit testing, overlap detection
      transformUtils.ts       # Math for transforms
      elementTypes.ts         # Element type definitions
      renderConfig.ts         # Visual configuration per element type
```

---

## Types You Must Define

```typescript
// In elementTypes.ts

export type ElementType = 
  | 'table-round'
  | 'table-rectangular'
  | 'table-custom'
  | 'chair'
  | 'decoration'
  | 'text-label'
  | 'zone'          // Areas like dance floor, bar, etc.
  | 'wall'
  | 'door'
  | 'electrical';   // Future: power outlets, cables

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;              // World X (center point)
  y: number;              // World Y (center point)
  width: number;          // World units
  height: number;         // World units
  rotation: number;       // Degrees
  zIndex: number;
  locked: boolean;
  visible: boolean;
  metadata: Record<string, unknown>;  // For future seat-guest linking
}

export interface TableElement extends BaseElement {
  type: 'table-round' | 'table-rectangular' | 'table-custom';
  capacity: number;       // Number of seats
  tableNumber?: string;
  seats: SeatPosition[];  // Positions around the table
}

export interface SeatPosition {
  id: string;
  angle: number;          // Position around table (for round)
  offset: number;         // Distance from edge
  guestId?: string;       // Future: linked guest
}

export interface SelectionState {
  selectedIds: Set<string>;
  selectionBox: {         // For marquee selection
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
  isSelecting: boolean;
}

export interface TransformState {
  isTransforming: boolean;
  transformType: 'move' | 'resize' | 'rotate' | null;
  activeHandle: string | null;  // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'rotate'
  initialElements: Map<string, BaseElement>;  // State before transform
  pivot: WorldPoint;
}

export interface SmartGuide {
  type: 'vertical' | 'horizontal';
  position: number;       // World coordinate
  sourceId: string;
  targetId: string;
}
```

---

## Integration Points

### You CONSUME from Agent 1 (Canvas Engine):

```typescript
import { useViewport } from '../canvas/useViewport';
import { worldToScreen, screenToWorld } from '../canvas/coordinateUtils';
import { snapToGrid } from '../canvas/gridUtils';

// Usage in your components:
const { viewport, worldToScreen, screenToWorld, snapToGrid } = useViewport();
```

### You CONSUME from Agent 3 (Data Layer):

```typescript
import { useLayoutStore } from '../state/layoutStore';

// Get elements
const elements = useLayoutStore(state => state.elements);

// Mutations (these handle undo/redo automatically)
const { updateElement, updateElements, deleteElements } = useLayoutStore();
```

### You EXPORT for other agents:

```typescript
// From useSelection.ts
export interface SelectionAPI {
  selectedIds: Set<string>;
  selectedElements: BaseElement[];
  select: (id: string, additive?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  selectAll: () => void;
  deselect: (id?: string) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
}

// From ElementRenderer.tsx - callbacks for element events
export interface ElementCallbacks {
  onElementClick: (id: string, e: React.MouseEvent) => void;
  onElementDoubleClick: (id: string, e: React.MouseEvent) => void;
  onElementDragStart: (id: string, e: React.MouseEvent) => void;
  onElementDragEnd: (id: string, position: WorldPoint) => void;
}
```

---

## Implementation Guidelines

### Hit Testing

```typescript
// Check if a screen point hits an element
export function hitTest(
  screenPoint: ScreenPoint,
  elements: BaseElement[],
  viewport: ViewportState
): string | null {
  const worldPoint = screenToWorld(screenPoint, viewport);
  
  // Test in reverse z-order (top elements first)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  
  for (const element of sorted) {
    if (element.locked || !element.visible) continue;
    if (pointInElement(worldPoint, element)) {
      return element.id;
    }
  }
  
  return null;
}

// Point in rotated rectangle
export function pointInElement(point: WorldPoint, element: BaseElement): boolean {
  // Transform point to element's local space
  const local = rotatePoint(
    { x: point.x - element.x, y: point.y - element.y },
    -element.rotation
  );
  
  const halfW = element.width / 2;
  const halfH = element.height / 2;
  
  return local.x >= -halfW && local.x <= halfW &&
         local.y >= -halfH && local.y <= halfH;
}
```

### Smart Guides Algorithm

```typescript
export function calculateSmartGuides(
  draggingIds: Set<string>,
  dragPosition: WorldPoint,
  allElements: BaseElement[],
  threshold: number = 5
): SmartGuide[] {
  const guides: SmartGuide[] = [];
  const dragging = allElements.filter(e => draggingIds.has(e.id));
  const others = allElements.filter(e => !draggingIds.has(e.id));
  
  for (const dragEl of dragging) {
    const dragBounds = getElementBounds(dragEl, dragPosition);
    
    for (const otherEl of others) {
      const otherBounds = getElementBounds(otherEl);
      
      // Check vertical alignment (x positions)
      if (Math.abs(dragBounds.centerX - otherBounds.centerX) < threshold) {
        guides.push({
          type: 'vertical',
          position: otherBounds.centerX,
          sourceId: dragEl.id,
          targetId: otherEl.id
        });
      }
      
      // Check horizontal alignment (y positions)
      if (Math.abs(dragBounds.centerY - otherBounds.centerY) < threshold) {
        guides.push({
          type: 'horizontal',
          position: otherBounds.centerY,
          sourceId: dragEl.id,
          targetId: otherEl.id
        });
      }
      
      // Also check edges...
    }
  }
  
  return guides;
}
```

### Resize with Aspect Ratio

```typescript
export function calculateResize(
  element: BaseElement,
  handle: string,
  delta: WorldPoint,
  keepAspectRatio: boolean,
  fromCenter: boolean
): Partial<BaseElement> {
  let newWidth = element.width;
  let newHeight = element.height;
  let newX = element.x;
  let newY = element.y;
  
  const aspect = element.width / element.height;
  
  // Apply delta based on handle position
  switch (handle) {
    case 'se': // Southeast corner
      newWidth += delta.x;
      newHeight += delta.y;
      break;
    case 'nw': // Northwest corner
      newWidth -= delta.x;
      newHeight -= delta.y;
      newX += delta.x / 2;
      newY += delta.y / 2;
      break;
    // ... other handles
  }
  
  if (keepAspectRatio) {
    // Constrain to original aspect ratio
    if (Math.abs(delta.x) > Math.abs(delta.y)) {
      newHeight = newWidth / aspect;
    } else {
      newWidth = newHeight * aspect;
    }
  }
  
  if (fromCenter) {
    // Double the delta, keep center position
    // ...
  }
  
  return { width: newWidth, height: newHeight, x: newX, y: newY };
}
```

---

## Keyboard Shortcuts

Implement these handlers:

| Shortcut | Action |
|----------|--------|
| Delete / Backspace | Delete selected elements |
| Cmd/Ctrl + A | Select all |
| Escape | Deselect all, cancel current operation |
| Cmd/Ctrl + D | Duplicate selected |
| Cmd/Ctrl + ] | Bring forward |
| Cmd/Ctrl + [ | Send backward |
| Cmd/Ctrl + Shift + ] | Bring to front |
| Cmd/Ctrl + Shift + [ | Send to back |
| Arrow keys | Nudge selected by 1px (10px with Shift) |
| Shift (during drag) | Constrain to axis |
| Shift (during resize) | Maintain aspect ratio |
| Alt/Option (during resize) | Resize from center |
| Shift (during rotate) | Snap to 15° increments |

---

## Testing Checklist

Before considering your work complete, verify:

- [ ] Click selection works at all zoom levels
- [ ] Shift+click adds to selection
- [ ] Box selection works correctly
- [ ] Drag moves elements smoothly
- [ ] Multi-element drag keeps relative positions
- [ ] Resize handles work from all corners/edges
- [ ] Aspect ratio lock works during resize
- [ ] Rotation works and snaps with Shift
- [ ] Z-index ordering works correctly
- [ ] Smart guides appear during drag
- [ ] Keyboard shortcuts all function
- [ ] Performance stays smooth with 100+ elements

---

## Do NOT Touch

- Canvas viewport, zoom, or pan logic
- State persistence or undo/redo implementation
- Backend API calls
- Any files outside your designated folder

---

## Communication Protocol

When you complete a milestone, document it:

```typescript
/**
 * AGENT_2 STATUS: In Progress
 * Last updated: [date]
 * 
 * Completed:
 * - Selection system (single, multi, box)
 * - Basic drag and drop
 * 
 * In progress:
 * - Resize handles
 * 
 * Blocked:
 * - None
 */
```

If you need something from another agent:

```typescript
// TODO [NEED FROM AGENT_1]: snapToGrid function not yet available
// TODO [NEED FROM AGENT_3]: updateElements mutation for batch updates
```