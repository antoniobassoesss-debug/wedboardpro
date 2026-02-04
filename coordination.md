# Layout Maker Multi-Agent Coordination Guide

## Overview

This document coordinates the work of three specialized agents building the WedBoardPro Layout Maker. Each agent has exclusive ownership of specific files and clear integration points with others.

---

## Agent Summary

| Agent | Responsibility | Core Deliverable |
|-------|---------------|------------------|
| **Agent 1** | Canvas Engine | Viewport, zoom, pan, coordinates, grid |
| **Agent 2** | Element System | Selection, drag-drop, resize, rotate, layers |
| **Agent 3** | Data Layer | State management, undo/redo, persistence |

---

## File Ownership Map

```
src/layout-maker/
├── canvas/                    # AGENT 1 ONLY
│   ├── CanvasViewport.tsx
│   ├── useViewport.ts
│   ├── useZoom.ts
│   ├── usePan.ts
│   ├── coordinateUtils.ts
│   ├── gridUtils.ts
│   ├── constants.ts
│   └── types.ts
│
├── elements/                  # AGENT 2 ONLY
│   ├── ElementRenderer.tsx
│   ├── ElementItem.tsx
│   ├── SelectionOverlay.tsx
│   ├── useSelection.ts
│   ├── useDragDrop.ts
│   ├── useTransform.ts
│   ├── useSmartGuides.ts
│   ├── collisionUtils.ts
│   ├── transformUtils.ts
│   ├── elementTypes.ts
│   └── renderConfig.ts
│
├── state/                     # AGENT 3 ONLY
│   ├── layoutStore.ts
│   ├── historyStore.ts
│   ├── selectors.ts
│   ├── actions.ts
│   ├── persistence.ts
│   ├── validation.ts
│   ├── migration.ts
│   └── types/
│       ├── index.ts
│       ├── elements.ts
│       ├── layout.ts
│       ├── history.ts
│       └── sync.ts
│
├── components/                # SHARED (coordinate before editing)
│   └── LayoutMaker.tsx        # Main container component
│
└── index.ts                   # SHARED (exports only)
```

---

## Dependency Graph

```
                    ┌─────────────────┐
                    │    AGENT 3      │
                    │   Data Layer    │
                    │                 │
                    │  Types/Schema   │
                    │  State Store    │
                    │  Undo/Redo      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │    AGENT 1      │           │    AGENT 2      │
    │  Canvas Engine  │◄─────────►│ Element System  │
    │                 │           │                 │
    │  Coordinates    │           │  Selection      │
    │  Viewport       │           │  Drag/Drop      │
    │  Grid/Snap      │           │  Transform      │
    └─────────────────┘           └─────────────────┘
```

**Flow:**
1. Agent 3 defines types FIRST (other agents import these)
2. Agent 1 builds canvas (Agent 2 depends on coordinate functions)
3. Agent 2 builds interactions (uses Agent 1 for coordinates, Agent 3 for state)

---

## Integration Contracts

### Agent 3 → Agent 1 & Agent 2

Agent 3 exports types that others must use:

```typescript
// Both agents import from:
import { BaseElement, TableElement, ElementType } from '../state/types';
import { useLayoutStore } from '../state/layoutStore';
import { useHistoryStore } from '../state/historyStore';
```

### Agent 1 → Agent 2

Agent 1 exports viewport functions that Agent 2 consumes:

```typescript
// Agent 2 imports from:
import { useViewport } from '../canvas/useViewport';
import { worldToScreen, screenToWorld } from '../canvas/coordinateUtils';
import { snapToGrid } from '../canvas/gridUtils';
import type { WorldPoint, ScreenPoint, ViewportState } from '../canvas/types';
```

### Agent 2 → Agent 1

Agent 2 provides element bounds for viewport fitting:

```typescript
// Agent 1 can import from:
import { getSelectedBounds, getAllElementBounds } from '../elements/collisionUtils';
```

---

## Shared Types Agreement

All agents must use these exact type names (defined by Agent 3):

```typescript
// Coordinate types (defined by Agent 1, re-exported by Agent 3)
WorldPoint    // { x: number, y: number } in world space
ScreenPoint   // { x: number, y: number } in screen pixels

// Element types (defined by Agent 3)
BaseElement   // Base interface for all elements
TableElement  // Tables with seats
ElementType   // Union of all element type strings

// State types (defined by Agent 3)
Layout        // Complete layout document
LayoutSettings // User preferences
```

---

## Communication Protocol

### Status Comments

Each agent documents status at the top of their main file:

```typescript
/**
 * AGENT_[N] STATUS: [Not Started | In Progress | Complete | Blocked]
 * Last updated: YYYY-MM-DD
 * 
 * Completed:
 * - Feature 1
 * - Feature 2
 * 
 * In progress:
 * - Feature 3
 * 
 * Blocked:
 * - [NEED FROM AGENT_X]: Description
 */
```

### Dependency TODOs

When an agent needs something from another:

```typescript
// TODO [NEED FROM AGENT_1]: worldToScreen function
// TODO [NEED FROM AGENT_3]: updateElement action with undo support
```

When an agent provides something to another:

```typescript
// TODO [PROVIDES TO AGENT_2]: snapToGrid exported from gridUtils.ts
```

---

## Work Sequence

### Phase 1: Foundation (Week 1-2)

| Day | Agent 1 | Agent 2 | Agent 3 |
|-----|---------|---------|---------|
| 1-2 | Setup types.ts | Wait / Mock types | **Define all types** |
| 3-4 | Coordinate system | Mock coordinate utils | Store skeleton |
| 5-7 | Viewport state | Basic hit testing | CRUD actions |
| 8-10 | Zoom implementation | Selection logic | Undo/redo |
| 11-14 | Pan + Grid | Drag/drop basics | Persistence |

### Phase 2: Core Features (Week 3-4)

| Day | Agent 1 | Agent 2 | Agent 3 |
|-----|---------|---------|---------|
| 15-17 | Grid snap refinement | Multi-select | Batch operations |
| 18-21 | Fit to content | Resize handles | Auto-save |
| 22-25 | Polish zoom/pan | Rotation | Validation |
| 26-28 | Performance | Smart guides | Migration system |

### Phase 3: Integration (Week 5+)

- All agents: Bug fixes
- All agents: Integration testing
- All agents: Performance optimization
- Human: Manual merge and conflict resolution

---

## Merge Rules

1. **Daily Integration**: Human merges all branches at end of each day
2. **No Cross-Editing**: Agents never edit files outside their ownership
3. **Interface First**: When adding new exports, document in status comment before implementing
4. **Breaking Changes**: If changing an exported interface, add `// BREAKING:` comment

---

## Mock/Stub Pattern

When Agent 2 needs Agent 1's functions before they're ready:

```typescript
// In elements/mocks/viewportMock.ts

// TEMPORARY: Remove when Agent 1 completes useViewport
export const mockViewport = {
  worldToScreen: (point: WorldPoint): ScreenPoint => ({
    x: point.x, // 1:1 mapping for testing
    y: point.y,
  }),
  screenToWorld: (point: ScreenPoint): WorldPoint => ({
    x: point.x,
    y: point.y,
  }),
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
    width: 1000,
    height: 800,
  },
};
```

---

## Conflict Resolution

If two agents need to coordinate on a shared concern:

1. Stop work on conflicting feature
2. Document the conflict in both status comments
3. Human reviews and makes decision
4. One agent implements, other waits
5. Resume parallel work

---

## Quality Checklist (All Agents)

Before marking any feature complete:

- [ ] TypeScript compiles with no errors
- [ ] No `any` types (except when absolutely necessary)
- [ ] Console has no warnings
- [ ] Basic manual testing done
- [ ] Status comment updated
- [ ] Exports documented

---

## Emergency Contacts

If an agent is completely blocked:

1. Document the blocker clearly in status comment
2. Create a minimal mock to unblock
3. Mark the mock clearly as temporary
4. Continue work on non-blocked features

---

## Final Integration Checklist

Before human declares Layout Maker complete:

- [ ] All three agents report STATUS: Complete
- [ ] No TODO [NEED FROM] comments remain
- [ ] All mocks replaced with real implementations
- [ ] Main LayoutMaker.tsx integrates all three systems
- [ ] End-to-end test: create element, move, undo, save, reload
- [ ] Performance test: 100+ elements with smooth interaction