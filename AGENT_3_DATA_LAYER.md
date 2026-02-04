# Agent 3: Data Layer & Persistence

## Role Definition

You are responsible for the data architecture, state management, and persistence layer of the 2D layout editor. You define how data is structured, manage application state, implement undo/redo, and prepare the foundation for backend integration. You do NOT handle rendering or user interactions directly.

---

## Your Responsibilities

### 1. State Management

- Central store for all layout data using Zustand
- Normalized data structure for efficient updates
- Computed/derived state (selected elements, element counts, etc.)
- State subscriptions for reactive updates

### 2. Data Schema

- Define TypeScript types/interfaces for all data structures
- Ensure schema compatibility with future Supabase tables
- Include metadata fields for guest-seat linking
- Version the schema for future migrations

### 3. Undo/Redo System

- Command pattern implementation
- Unlimited undo stack (with configurable limit)
- Batch operations (multiple changes as single undo step)
- Clear, descriptive action names for UI

### 4. Persistence

- Auto-save to localStorage (offline support)
- Serialize/deserialize layout state
- Handle migration between schema versions
- Prepare hooks for Supabase sync (not implemented yet, but structured for it)

### 5. Data Validation

- Validate element positions and dimensions
- Sanitize input data
- Handle corrupted/invalid saved state gracefully

---

## File Structure

You own these files exclusively:

```
src/
  layout-maker/
    state/
      layoutStore.ts          # Main Zustand store
      historyStore.ts         # Undo/redo management
      selectors.ts            # Computed state selectors
      actions.ts              # Action creators with undo support
      persistence.ts          # localStorage and serialization
      validation.ts           # Data validation utilities
      migration.ts            # Schema version migrations
      types/
        index.ts              # Re-exports all types
        elements.ts           # Element type definitions
        layout.ts             # Layout/project level types
        history.ts            # Undo/redo types
        sync.ts               # Future backend sync types
```

---

## Types You Must Define

```typescript
// In types/elements.ts

export type ElementType = 
  | 'table-round'
  | 'table-rectangular'
  | 'table-custom'
  | 'chair'
  | 'decoration'
  | 'text-label'
  | 'zone'
  | 'wall'
  | 'door'
  | 'electrical-outlet'
  | 'electrical-cable';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  metadata: ElementMetadata;
}

export interface ElementMetadata {
  name?: string;
  notes?: string;
  color?: string;
  customData?: Record<string, unknown>;
}

export interface TableElement extends BaseElement {
  type: 'table-round' | 'table-rectangular' | 'table-custom';
  capacity: number;
  tableNumber?: string;
  seats: Seat[];
}

export interface Seat {
  id: string;
  localX: number;          // Position relative to table center
  localY: number;
  angle: number;           // For UI rendering
  guestId?: string;        // Link to guest in backend
  guestName?: string;      // Denormalized for offline display
}

export interface ElectricalElement extends BaseElement {
  type: 'electrical-outlet' | 'electrical-cable';
  powerRating?: number;    // Watts
  connectedTo?: string[];  // IDs of connected elements
}
```

```typescript
// In types/layout.ts

export interface Layout {
  id: string;
  name: string;
  description?: string;
  venueId?: string;        // Future: link to venue in backend
  eventId?: string;        // Future: link to event in backend
  
  dimensions: {
    width: number;         // Venue width in world units
    height: number;        // Venue height in world units
    unit: 'meters' | 'feet';
  };
  
  elements: Record<string, BaseElement>;  // Normalized by ID
  elementOrder: string[];                  // For z-index ordering
  
  settings: LayoutSettings;
  
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;   // For migrations
}

export interface LayoutSettings {
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  backgroundColor: string;
  defaultTableCapacity: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
```

```typescript
// In types/history.ts

export type ActionType = 
  | 'ADD_ELEMENT'
  | 'ADD_ELEMENTS'
  | 'UPDATE_ELEMENT'
  | 'UPDATE_ELEMENTS'
  | 'DELETE_ELEMENT'
  | 'DELETE_ELEMENTS'
  | 'MOVE_ELEMENT'
  | 'MOVE_ELEMENTS'
  | 'RESIZE_ELEMENT'
  | 'ROTATE_ELEMENT'
  | 'REORDER_ELEMENTS'
  | 'UPDATE_SETTINGS'
  | 'BATCH';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  actionType: ActionType;
  actionLabel: string;     // Human-readable: "Move Table 5"
  
  // For undo
  previousState: Partial<Layout>;
  
  // For redo
  nextState: Partial<Layout>;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
}
```

```typescript
// In types/sync.ts (for future backend integration)

export interface SyncStatus {
  lastSyncedAt: string | null;
  pendingChanges: number;
  syncState: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface ChangeRecord {
  id: string;
  layoutId: string;
  elementId?: string;
  changeType: 'create' | 'update' | 'delete';
  payload: unknown;
  timestamp: string;
  synced: boolean;
}
```

---

## Store Implementation

### Main Layout Store

```typescript
// In layoutStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface LayoutState {
  // Data
  layout: Layout | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadLayout: (id: string) => Promise<void>;
  createLayout: (name: string, dimensions: Layout['dimensions']) => void;
  
  // Element CRUD (all actions go through history)
  addElement: (element: Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>) => string;
  addElements: (elements: Array<Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>>) => string[];
  updateElement: (id: string, updates: Partial<BaseElement>) => void;
  updateElements: (updates: Array<{ id: string; changes: Partial<BaseElement> }>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  
  // Helpers
  getElementById: (id: string) => BaseElement | undefined;
  getElementsByType: (type: ElementType) => BaseElement[];
  
  // Reordering
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  
  // Settings
  updateSettings: (settings: Partial<LayoutSettings>) => void;
}

export const useLayoutStore = create<LayoutState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      layout: null,
      isLoading: false,
      error: null,
      
      addElement: (elementData) => {
        const id = generateId();
        const now = new Date().toISOString();
        
        const element: BaseElement = {
          ...elementData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        
        // Record for undo
        recordAction('ADD_ELEMENT', `Add ${element.type}`, get().layout);
        
        set((state) => {
          if (!state.layout) return;
          state.layout.elements[id] = element;
          state.layout.elementOrder.push(id);
          state.layout.updatedAt = now;
        });
        
        // Trigger auto-save
        debouncedSave(get().layout);
        
        return id;
      },
      
      updateElement: (id, updates) => {
        const element = get().layout?.elements[id];
        if (!element) return;
        
        recordAction('UPDATE_ELEMENT', `Update ${element.type}`, get().layout);
        
        set((state) => {
          if (!state.layout) return;
          Object.assign(state.layout.elements[id], updates, {
            updatedAt: new Date().toISOString()
          });
          state.layout.updatedAt = new Date().toISOString();
        });
        
        debouncedSave(get().layout);
      },
      
      // ... implement all other actions
    }))
  )
);
```

### History Store

```typescript
// In historyStore.ts

import { create } from 'zustand';

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
  
  record: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clear: () => void;
  
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxSize: 100,
  
  record: (entry) => {
    set((state) => ({
      past: [
        ...state.past.slice(-(state.maxSize - 1)),
        {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        }
      ],
      future: [], // Clear redo stack on new action
    }));
  },
  
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    
    const entry = past[past.length - 1];
    
    set({
      past: past.slice(0, -1),
      future: [entry, ...future],
    });
    
    return entry;
  },
  
  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    
    const entry = future[0];
    
    set({
      past: [...past, entry],
      future: future.slice(1),
    });
    
    return entry;
  },
  
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
```

---

## Persistence Implementation

```typescript
// In persistence.ts

const STORAGE_KEY = 'wedboardpro_layout';
const AUTOSAVE_DELAY = 1000; // ms

export function saveToLocalStorage(layout: Layout): void {
  try {
    const serialized = JSON.stringify({
      version: CURRENT_SCHEMA_VERSION,
      data: layout,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(`${STORAGE_KEY}_${layout.id}`, serialized);
  } catch (error) {
    console.error('Failed to save layout:', error);
  }
}

export function loadFromLocalStorage(layoutId: string): Layout | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${layoutId}`);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Run migrations if needed
    if (parsed.version < CURRENT_SCHEMA_VERSION) {
      return migrateLayout(parsed.data, parsed.version);
    }
    
    return validateLayout(parsed.data) ? parsed.data : null;
  } catch (error) {
    console.error('Failed to load layout:', error);
    return null;
  }
}

export const debouncedSave = debounce(saveToLocalStorage, AUTOSAVE_DELAY);

// List all saved layouts
export function listSavedLayouts(): Array<{ id: string; name: string; savedAt: string }> {
  const layouts: Array<{ id: string; name: string; savedAt: string }> = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          layouts.push({
            id: parsed.data.id,
            name: parsed.data.name,
            savedAt: parsed.savedAt,
          });
        }
      } catch {
        // Skip corrupted entries
      }
    }
  }
  
  return layouts.sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}
```

---

## Validation Implementation

```typescript
// In validation.ts

export function validateLayout(layout: unknown): layout is Layout {
  if (!layout || typeof layout !== 'object') return false;
  
  const l = layout as Layout;
  
  // Required fields
  if (typeof l.id !== 'string') return false;
  if (typeof l.name !== 'string') return false;
  if (!l.dimensions || typeof l.dimensions.width !== 'number') return false;
  if (!l.elements || typeof l.elements !== 'object') return false;
  
  // Validate each element
  for (const element of Object.values(l.elements)) {
    if (!validateElement(element)) return false;
  }
  
  return true;
}

export function validateElement(element: unknown): element is BaseElement {
  if (!element || typeof element !== 'object') return false;
  
  const e = element as BaseElement;
  
  if (typeof e.id !== 'string') return false;
  if (typeof e.type !== 'string') return false;
  if (typeof e.x !== 'number' || isNaN(e.x)) return false;
  if (typeof e.y !== 'number' || isNaN(e.y)) return false;
  if (typeof e.width !== 'number' || e.width <= 0) return false;
  if (typeof e.height !== 'number' || e.height <= 0) return false;
  
  return true;
}

export function sanitizeElement(element: Partial<BaseElement>): Partial<BaseElement> {
  return {
    ...element,
    x: clamp(element.x ?? 0, -10000, 10000),
    y: clamp(element.y ?? 0, -10000, 10000),
    width: clamp(element.width ?? 100, 10, 5000),
    height: clamp(element.height ?? 100, 10, 5000),
    rotation: ((element.rotation ?? 0) % 360 + 360) % 360,
    zIndex: Math.floor(element.zIndex ?? 0),
  };
}
```

---

## Selectors

```typescript
// In selectors.ts

import { useLayoutStore } from './layoutStore';

// Element selectors
export const useElements = () => 
  useLayoutStore((state) => state.layout?.elements ?? {});

export const useElementList = () =>
  useLayoutStore((state) => {
    if (!state.layout) return [];
    return state.layout.elementOrder.map(id => state.layout!.elements[id]);
  });

export const useElement = (id: string) =>
  useLayoutStore((state) => state.layout?.elements[id]);

export const useElementsByType = (type: ElementType) =>
  useLayoutStore((state) => {
    if (!state.layout) return [];
    return Object.values(state.layout.elements).filter(e => e.type === type);
  });

// Statistics
export const useElementCount = () =>
  useLayoutStore((state) => Object.keys(state.layout?.elements ?? {}).length);

export const useTotalCapacity = () =>
  useLayoutStore((state) => {
    if (!state.layout) return 0;
    return Object.values(state.layout.elements)
      .filter((e): e is TableElement => e.type.startsWith('table'))
      .reduce((sum, table) => sum + table.capacity, 0);
  });

// Settings
export const useLayoutSettings = () =>
  useLayoutStore((state) => state.layout?.settings);
```

---

## Backend Preparation (Supabase Schema Preview)

Document the intended database schema for future implementation:

```typescript
// In types/sync.ts

/**
 * FUTURE SUPABASE SCHEMA
 * 
 * Tables:
 * 
 * layouts
 * - id: uuid (PK)
 * - user_id: uuid (FK to auth.users)
 * - project_id: uuid (FK to projects)
 * - name: text
 * - description: text
 * - dimensions: jsonb
 * - settings: jsonb
 * - created_at: timestamptz
 * - updated_at: timestamptz
 * 
 * layout_elements
 * - id: uuid (PK)
 * - layout_id: uuid (FK to layouts)
 * - type: text
 * - position: jsonb { x, y }
 * - size: jsonb { width, height }
 * - rotation: float
 * - z_index: int
 * - locked: boolean
 * - visible: boolean
 * - metadata: jsonb
 * - created_at: timestamptz
 * - updated_at: timestamptz
 * 
 * table_seats
 * - id: uuid (PK)
 * - element_id: uuid (FK to layout_elements)
 * - guest_id: uuid (FK to guests, nullable)
 * - local_position: jsonb { x, y, angle }
 * - created_at: timestamptz
 * 
 * RLS Policies:
 * - Users can only access their own layouts
 * - Team members can access shared project layouts
 */
```

---

## Testing Checklist

Before considering your work complete, verify:

- [ ] Store initializes correctly with empty state
- [ ] All CRUD operations work and update timestamps
- [ ] Undo reverses the last action
- [ ] Redo re-applies after undo
- [ ] Undo/redo stack has correct limits
- [ ] Auto-save triggers after changes
- [ ] Load from localStorage works
- [ ] Corrupted data is handled gracefully
- [ ] Selectors return correct derived state
- [ ] Validation catches invalid data
- [ ] Schema version is checked on load

---

## Do NOT Touch

- Canvas rendering or viewport logic
- Element interaction handlers (click, drag)
- UI components
- Any files outside your designated folder

---

## Communication Protocol

Document status in main store file:

```typescript
/**
 * AGENT_3 STATUS: Complete
 * Last updated: [date]
 * 
 * Exports ready:
 * - useLayoutStore (all actions)
 * - useHistoryStore (undo/redo)
 * - All selectors
 * - Type definitions
 * 
 * Known issues:
 * - None
 * 
 * Future work (backend):
 * - Supabase sync implementation
 * - Real-time collaboration
 */
```

Dependencies on other agents:

```typescript
// TODO [PROVIDES TO AGENT_2]: Element types exported from types/elements.ts
// TODO [PROVIDES TO AGENT_2]: updateElement, updateElements actions
```