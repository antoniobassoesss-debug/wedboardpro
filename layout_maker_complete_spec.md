# Layout Maker — Complete Product Specification

## Document Info
- **Product:** WedBoardPro Layout Maker
- **Version:** 1.0
- **Last Updated:** January 2026
- **Status:** Ready for Development

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture & Navigation](#2-architecture--navigation)
3. [Workflow View](#3-workflow-view)
4. [Canvas & Viewport](#4-canvas--viewport)
5. [Scale & Measurement System](#5-scale--measurement-system)
6. [Element System](#6-element-system)
7. [Element Library & Sidebar](#7-element-library--sidebar)
8. [Tables & Automatic Chair Generation](#8-tables--automatic-chair-generation)
9. [Drag & Drop Interactions](#9-drag--drop-interactions)
10. [Selection System](#10-selection-system)
11. [Collision Detection](#11-collision-detection)
12. [Snap & Alignment Guides](#12-snap--alignment-guides)
13. [Guest Assignment System](#13-guest-assignment-system)
14. [Floor Plan Import](#14-floor-plan-import)
15. [Export System](#15-export-system)
16. [Mobile & Tablet Experience](#16-mobile--tablet-experience)
17. [Keyboard Shortcuts](#17-keyboard-shortcuts)
18. [Undo/Redo & Autosave](#18-undoredo--autosave)
19. [Visual Feedback System](#19-visual-feedback-system)
20. [Data Models](#20-data-models)
21. [Technical Implementation Notes](#21-technical-implementation-notes)

---

## 1. Product Overview

### 1.1 Purpose

The Layout Maker is the core feature of WedBoardPro that allows wedding planners to create, edit, and manage venue floor plans with precise element placement, guest seating assignments, and multi-format exports.

### 1.2 Target Users

- **Primary:** Professional wedding planners (tech-savvy and traditional)
- **Secondary:** Venue coordinators, catering managers, setup crews
- **Usage Context:** Desktop (primary), Tablet on-site (secondary), Mobile (view/quick edits)

### 1.3 Core Principles

| Principle | Description |
|-----------|-------------|
| **Intuitive** | Should feel as easy as Canva — no learning curve |
| **Precise** | Real-world measurements, accurate proportions |
| **Flexible** | Support various workflows and preferences |
| **Professional** | Output quality suitable for client presentations |
| **Responsive** | Works seamlessly on desktop and tablet |

### 1.4 Key Features Summary

- Visual workflow management for multiple layouts per event
- Wall/space creation with real-world measurements
- Element library with tables, furniture, zones, and decorations
- Automatic chair generation for tables
- Guest assignment with dietary tracking
- Floor plan import with scale calibration
- Multi-format, multi-version export
- Full touch/tablet support

---

## 2. Architecture & Navigation

### 2.1 System Architecture

```
Project Pipeline (Event)
│
├── Guest List Module
│   └── Guest data (names, dietary, preferences)
│
├── Layout Maker File
│   │
│   ├── Workflow View (Miro-style diagram)
│   │   ├── Layout Card 1 (with preview)
│   │   ├── Layout Card 2 (with preview)
│   │   └── Layout Card N (with preview)
│   │
│   ├── Canvas View (single layout editor)
│   │   ├── Venue Space (walls from Wall Maker)
│   │   ├── Elements Layer
│   │   ├── Background Layer (imported floor plan)
│   │   └── UI Overlays (rulers, guides, selection)
│   │
│   └── Tab Navigation (bottom bar for quick switching)
│
└── Wall Maker Module (opens separately)
    └── Creates venue spaces → feeds into Layout Maker
```

### 2.2 Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Event Dashboard                                            │
│       │                                                     │
│       ▼                                                     │
│  Layout Maker File ──────────────────────────────────────┐  │
│       │                                                  │  │
│       ▼                                                  │  │
│  Workflow View (all layouts) ◄──── Tab: "All Layouts"   │  │
│       │                                                  │  │
│       │ click layout card                                │  │
│       ▼                                                  │  │
│  Canvas View (single layout) ◄──── Tabs: Layout 1, 2... │  │
│       │                                                  │  │
│       │ click "Edit Space"                               │  │
│       ▼                                                  │  │
│  Wall Maker (modal/overlay) ────► Returns to Canvas      │  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Wall Maker Integration

**Current State:** Wall Maker is a separate module that creates venue spaces.

**Required Integration:**

1. After creating/editing space in Wall Maker, clear CTA: **"Continue to Layout"**
2. Spaces can be saved to **Venue Library** for reuse across events
3. In Layout Maker, if no space exists: empty state with **"Create Space"** or **"Import from Library"**
4. Mode switcher in Canvas View: **"Edit Space"** / **"Edit Layout"**
5. Warning when editing space with existing elements: *"Changing the venue space may affect element positions. Continue?"*

---

## 3. Workflow View

### 3.1 Purpose

The Workflow View displays all layouts for an event in a visual diagram (Miro-style), allowing users to see the big picture and navigate between layouts.

### 3.2 Layout Card Design

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      [Layout Preview]       │   │  ← Live thumbnail of canvas
│  │       (mini render)         │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Reception Layout - Option A        │  ← Layout name (editable)
│                                     │
│  12 tables · 96 seats              │  ← Quick stats
│  ████████░░░ 78/96 assigned        │  ← Assignment progress bar
│                                     │
│  🟡 In Progress        [•••]       │  ← Status badge + actions menu
│                                     │
└─────────────────────────────────────┘
```

### 3.3 Layout Card Information

| Element | Description |
|---------|-------------|
| **Preview Thumbnail** | Auto-generated mini render of the layout canvas |
| **Layout Name** | User-editable, defaults to "Layout 1", "Layout 2", etc. |
| **Table Count** | Total number of table elements |
| **Seat Count** | Total seating capacity |
| **Assignment Progress** | Visual bar showing assigned vs total seats |
| **Status Badge** | Draft / In Progress / Ready / Approved |
| **Actions Menu** | Duplicate, Rename, Delete, Export |

### 3.4 Status Definitions

| Status | Color | Meaning |
|--------|-------|---------|
| **Draft** | Gray | Just created, no elements yet |
| **In Progress** | Yellow | Has elements, not complete |
| **Ready** | Green | Complete, pending approval |
| **Approved** | Blue | Client/stakeholder approved |

### 3.5 Workflow View Interactions

| Action | Behavior |
|--------|----------|
| **Click card** | Opens layout in Canvas View |
| **Double-click name** | Inline edit layout name |
| **Drag card** | Reorder layouts in workflow |
| **Right-click card** | Context menu (Duplicate, Delete, etc.) |
| **Click [•••]** | Actions dropdown menu |
| **Click "+"** | Create new layout (with template options) |

### 3.6 Create New Layout Options

When clicking "+" to create new layout:

```
┌─────────────────────────────────────┐
│  Create New Layout                  │
├─────────────────────────────────────┤
│                                     │
│  ○ Blank Layout                     │
│    Start from scratch               │
│                                     │
│  ○ Duplicate Existing               │
│    Copy from: [Layout dropdown ▼]   │
│                                     │
│  ○ From Template                    │
│    [Template gallery grid]          │
│                                     │
│  ○ From Venue Library               │
│    [Saved venue spaces]             │
│                                     │
│           [Cancel]  [Create]        │
└─────────────────────────────────────┘
```

---

## 4. Canvas & Viewport

### 4.1 Canvas Structure

The canvas uses SVG for rendering, maintaining compatibility with the existing Wall Maker implementation.

```
<svg viewBox="...">
  <!-- Layer 1: Background (imported floor plan) -->
  <g id="background-layer">
    <image ... opacity="0.5" />
  </g>
  
  <!-- Layer 2: Grid -->
  <g id="grid-layer">
    <pattern ... />
  </g>
  
  <!-- Layer 3: Venue Space (walls) -->
  <g id="walls-layer">
    <path ... /> <!-- Wall segments -->
  </g>
  
  <!-- Layer 4: Elements -->
  <g id="elements-layer">
    <g id="element-{id}"> <!-- Each element group -->
      ...
    </g>
  </g>
  
  <!-- Layer 5: UI Overlays -->
  <g id="ui-layer">
    <!-- Selection handles, guides, etc. -->
  </g>
</svg>
```

### 4.2 Viewport Controls

| Control | Desktop | Tablet/Touch |
|---------|---------|--------------|
| **Pan** | Middle-click drag / Space + left-click drag | Two-finger drag |
| **Zoom In** | Scroll up / Cmd + Plus | Pinch out |
| **Zoom Out** | Scroll down / Cmd + Minus | Pinch in |
| **Zoom to Fit** | Cmd + 0 | Double-tap with two fingers |
| **Zoom to Selection** | Cmd + 1 | N/A (use fit) |

### 4.3 Zoom Behavior

- **Zoom Range:** 10% to 500%
- **Default Zoom:** Fit to canvas on open
- **Zoom Pivot:** Always zoom toward cursor/touch point (not center)
- **Zoom Steps:** 10% increments for buttons, smooth for scroll/pinch

### 4.4 Viewport State

```typescript
interface ViewportState {
  x: number;           // Pan offset X (world coordinates)
  y: number;           // Pan offset Y (world coordinates)
  zoom: number;        // Zoom level (1 = 100%)
  width: number;       // Viewport width in pixels
  height: number;      // Viewport height in pixels
}
```

---

## 5. Scale & Measurement System

### 5.1 Core Principle

**All element dimensions are stored in METERS, not pixels.**

Conversion to pixels happens only at render time using the space's `pixelsPerMeter` ratio.

### 5.2 Scale Configuration

```typescript
interface SpaceScale {
  pixelsPerMeter: number;    // Default: 100 (1m = 100px)
  unit: 'meters' | 'feet';   // Display unit preference
  gridSize: number;          // Grid spacing in meters (default: 0.5)
}
```

### 5.3 Visual Scale Indicators

#### 5.3.1 Rulers

Permanent rulers on X and Y axes showing real-world measurements.

```
    0m    1m    2m    3m    4m    5m    6m    7m
    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼────►
    │
0m  ┼─────┬─────────────────────────────────────
    │     │
1m  ┼     │         Canvas Area
    │     │
2m  ┼     │
    │     │
    ▼     └─────────────────────────────────────
```

**Ruler Behavior:**
- Always visible (can be toggled off in settings)
- Tick marks adapt to zoom level (show smaller increments when zoomed in)
- Current cursor position highlighted on rulers
- Click on ruler to create guide line (future feature)

#### 5.3.2 Scale Bar

Fixed position indicator in bottom-left corner:

```
┌──────────────┐
│ ├──── 1m ────┤ │
└──────────────┘
```

- Always shows a round number (1m, 2m, 5m depending on zoom)
- Updates dynamically as user zooms

#### 5.3.3 Element Dimension Tooltips

When hovering or dragging an element:

```
        ┌─────────────┐
        │  1.5m × 1.5m │  ← For rectangular elements
        └─────────────┘
        
        ┌─────────────┐
        │    Ø 1.5m   │  ← For round elements
        └─────────────┘
```

#### 5.3.4 Wall Dimensions (Toggle)

Option to show/hide dimension labels on walls:

```
         5.2m
    ←─────────────→
    ┌─────────────┐
    │             │
3.1m│             │3.1m
    │             │
    └─────────────┘
         5.2m
```

### 5.4 Grid System

| Setting | Default | Description |
|---------|---------|-------------|
| **Grid Visible** | On | Show/hide grid lines |
| **Grid Size** | 0.5m | Spacing between grid lines |
| **Major Grid** | Every 5 lines | Darker lines at 2.5m intervals |
| **Snap to Grid** | On | Elements snap to grid intersections |

---

## 6. Element System

### 6.1 Element Types

| Category | Type ID | Display Name | Shape |
|----------|---------|--------------|-------|
| **Tables** | `table-round` | Round Table | Circle |
| | `table-rectangular` | Rectangular Table | Rectangle |
| | `table-oval` | Oval Table | Ellipse |
| | `table-square` | Square Table | Square |
| **Seating** | `chair` | Chair | Small circle |
| | `bench` | Bench | Rectangle |
| | `lounge` | Lounge Seating | Rounded rectangle |
| **Zones** | `dance-floor` | Dance Floor | Rectangle (dashed) |
| | `stage` | Stage | Rectangle (elevated) |
| | `cocktail-area` | Cocktail Area | Freeform |
| | `ceremony-area` | Ceremony Area | Rectangle |
| **Service** | `bar` | Bar | Rectangle |
| | `buffet` | Buffet Table | Rectangle |
| | `cake-table` | Cake Table | Circle/Rectangle |
| | `gift-table` | Gift Table | Rectangle |
| | `dj-booth` | DJ Booth | Rectangle |
| **Decoration** | `flower-arrangement` | Flower Arrangement | Circle |
| | `photo-booth` | Photo Booth | Rectangle |
| | `arch` | Arch/Backdrop | Arc |
| | `custom` | Custom Element | User-defined |

### 6.2 Element Default Sizes

Based on industry standards:

| Element | Default Size | Notes |
|---------|--------------|-------|
| Round Table (6 pax) | Ø 1.2m | Standard |
| Round Table (8 pax) | Ø 1.5m | Most common |
| Round Table (10 pax) | Ø 1.8m | Large |
| Round Table (12 pax) | Ø 2.1m | Banquet |
| Rectangular Table (6 pax) | 1.8m × 0.75m | Standard |
| Rectangular Table (8 pax) | 2.4m × 0.75m | Standard |
| Rectangular Table (10 pax) | 3.0m × 0.75m | Long |
| Chair | 0.45m × 0.45m | With clearance |
| Bar | 2.0m × 0.6m | Minimum |
| Buffet Table | 2.4m × 0.75m | Standard |
| Dance Floor | 4.0m × 4.0m | ~20-30 people |
| Stage | 3.0m × 2.0m | Small band |
| DJ Booth | 1.5m × 0.8m | Standard |
| Cake Table | Ø 0.9m | Round |
| Photo Booth | 2.5m × 2.0m | With backdrop |

### 6.3 Base Element Data Model

```typescript
interface BaseElement {
  // Identity
  id: string;                    // Unique identifier (UUID)
  type: ElementType;             // Element type from enum
  
  // Position (in METERS, relative to canvas origin)
  x: number;                     // Center X position
  y: number;                     // Center Y position
  
  // Dimensions (in METERS)
  width: number;                 // Width (or diameter for circles)
  height: number;                // Height (same as width for circles)
  rotation: number;              // Rotation in degrees (0-360)
  
  // Hierarchy
  zIndex: number;                // Layer order
  groupId: string | null;        // Group membership (for table+chairs)
  parentId: string | null;       // Parent element (chairs point to table)
  
  // State
  locked: boolean;               // Prevent editing
  visible: boolean;              // Show/hide
  
  // Metadata
  label: string;                 // Display name ("Table 5", "Main Bar")
  notes: string;                 // Internal notes
  color: string | null;          // Custom color (for zones)
  
  // Timestamps
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### 6.4 Table-Specific Data Model

```typescript
interface TableElement extends BaseElement {
  type: 'table-round' | 'table-rectangular' | 'table-oval' | 'table-square';
  
  // Table-specific
  capacity: number;              // Number of seats
  tableNumber: string;           // Display number ("5", "A1")
  
  // Chair configuration
  chairConfig: {
    autoGenerate: boolean;       // Auto-create chairs
    chairSpacing: number;        // Space between chairs (meters)
    chairOffset: number;         // Distance from table edge (meters)
  };
  
  // Generated chairs (stored separately but linked)
  chairIds: string[];            // IDs of associated chair elements
}
```

### 6.5 Chair-Specific Data Model

```typescript
interface ChairElement extends BaseElement {
  type: 'chair';
  
  // Chair-specific
  parentTableId: string | null;  // Linked table (null if standalone)
  seatIndex: number;             // Position around table (0-based)
  
  // Guest assignment
  assignedGuestId: string | null;
  assignedGuestName: string | null;  // Denormalized for display
  
  // Dietary info (denormalized from guest)
  dietaryType: 'regular' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | null;
  allergyFlags: string[];        // ['nuts', 'gluten', 'dairy', etc.]
}
```

### 6.6 Zone-Specific Data Model

```typescript
interface ZoneElement extends BaseElement {
  type: 'dance-floor' | 'stage' | 'cocktail-area' | 'ceremony-area';
  
  // Zone-specific
  fillColor: string;             // Background color with opacity
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderColor: string;
  
  // Capacity (optional)
  estimatedCapacity: number | null;  // For informational purposes
}
```

---

## 7. Element Library & Sidebar

### 7.1 Sidebar Structure

The sidebar is the primary method for adding elements (Method 1 as specified).

```
┌────────────────────────────────────┐
│  Elements                    [×]   │  ← Header with collapse button
├────────────────────────────────────┤
│  🔍 Search elements...             │  ← Search input
├────────────────────────────────────┤
│                                    │
│  ⏱ RECENTLY USED                  │  ← Section header
│  ┌──────┐ ┌──────┐ ┌──────┐      │
│  │  ⚪  │ │  ▭  │ │  ◻  │      │  ← Compact element chips
│  │ Rnd 8│ │ Bar  │ │Dance │      │
│  └──────┘ └──────┘ └──────┘      │
│                                    │
├────────────────────────────────────┤
│  📦 TABLES                    [▼]  │  ← Collapsible section
│  │                                 │
│  │  ┌─────────────────────────┐   │
│  │  │ ⚪ Round Table          │   │
│  │  │    6 seats · Ø1.2m     ↗│   │  ← Element row with info
│  │  └─────────────────────────┘   │
│  │  ┌─────────────────────────┐   │
│  │  │ ⚪ Round Table      ⭐  │   │  ← Star = popular
│  │  │    8 seats · Ø1.5m     ↗│   │
│  │  └─────────────────────────┘   │
│  │  ┌─────────────────────────┐   │
│  │  │ ⚪ Round Table          │   │
│  │  │    10 seats · Ø1.8m    ↗│   │
│  │  └─────────────────────────┘   │
│  │  ┌─────────────────────────┐   │
│  │  │ ▭ Rectangular Table     │   │
│  │  │    6 seats · 1.8×0.75m ↗│   │
│  │  └─────────────────────────┘   │
│  │  ...                            │
│  │                                 │
├────────────────────────────────────┤
│  🎪 ZONES                     [▶]  │  ← Collapsed section
├────────────────────────────────────┤
│  🍽 SERVICE                   [▶]  │
├────────────────────────────────────┤
│  ✨ DECORATION                [▶]  │
├────────────────────────────────────┤
│                                    │
│  [+ Create Custom Element]         │  ← Future feature
│                                    │
└────────────────────────────────────┘
```

### 7.2 Element Row Interactions

| Action | Behavior |
|--------|----------|
| **Click** | Opens configuration popover, then adds to canvas center |
| **Drag** | Instantly adds element, follows cursor to drop position |
| **Hover** | Shows expanded preview with full dimensions |

### 7.3 Configuration Popover (for Tables)

When clicking a table element in the sidebar:

```
┌─────────────────────────────────────┐
│  Round Table                        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         [Preview]            │   │  ← Visual preview
│  │           ⚪                 │   │
│  │        ●  ●  ●              │   │  ← Shows chairs
│  │      ●        ●             │   │
│  │        ●  ●  ●              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Seats                              │
│  ┌────┬────┬────┬────┬────┬────┐  │
│  │ 4  │ 6  │ 8  │ 10 │ 12 │ +  │  │  ← Quick select
│  └────┴────┴─▲──┴────┴────┴────┘  │
│              └── selected           │
│                                     │
│  Table Size                         │
│  ● Auto (Ø1.5m for 8 seats)        │  ← Recommended size
│  ○ Custom: [___] m                  │
│                                     │
│  Table Number                       │
│  [Auto-assign ▼] or [____]         │
│                                     │
│  ┌────────────┐ ┌────────────────┐ │
│  │   Cancel   │ │ Add to Layout  │ │
│  └────────────┘ └────────────────┘ │
└─────────────────────────────────────┘
```

### 7.4 Configuration Popover (for Zones)

```
┌─────────────────────────────────────┐
│  Dance Floor                        │
│                                     │
│  Size                               │
│  Width:  [4.0] m                    │
│  Height: [4.0] m                    │
│                                     │
│  Appearance                         │
│  Color: [■ ▼] (color picker)       │
│  Border: [Dashed ▼]                │
│                                     │
│  Label                              │
│  [Dance Floor____________]          │
│                                     │
│  ┌────────────┐ ┌────────────────┐ │
│  │   Cancel   │ │ Add to Layout  │ │
│  └────────────┘ └────────────────┘ │
└─────────────────────────────────────┘
```

### 7.5 Search Functionality

- Search by element name ("round", "bar", "dance")
- Search by category ("tables", "service")
- Fuzzy matching (typo tolerance)
- Results update as user types
- Empty state: "No elements found. Try a different search."

### 7.6 Recently Used Logic

- Track last 6 elements used
- Persist across sessions (localStorage)
- Update on each element add
- No duplicates (move to front if already in list)

---

## 8. Tables & Automatic Chair Generation

### 8.1 Chair Generation Algorithm

When a table is created with `autoGenerate: true`:

```typescript
function generateChairsForTable(table: TableElement): ChairPosition[] {
  const chairs: ChairPosition[] = [];
  const { capacity, type, width, height, chairConfig } = table;
  const { chairOffset } = chairConfig;  // Default: 0.4m (40cm from table edge)
  
  if (type === 'table-round') {
    // Distribute chairs evenly around circle
    const radius = (width / 2) + chairOffset;
    const angleStep = 360 / capacity;
    
    for (let i = 0; i < capacity; i++) {
      const angle = i * angleStep;
      chairs.push({
        seatIndex: i,
        localX: Math.cos(toRadians(angle)) * radius,
        localY: Math.sin(toRadians(angle)) * radius,
        rotation: angle + 180,  // Face toward table center
      });
    }
  }
  
  if (type === 'table-rectangular' || type === 'table-square') {
    // Distribute chairs on long sides (standard) or all sides
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    
    // Calculate chairs per side based on capacity
    const chairsPerLongSide = Math.ceil(capacity / 2);
    const spacing = longSide / (chairsPerLongSide + 1);
    
    // Top side
    for (let i = 0; i < chairsPerLongSide; i++) {
      chairs.push({
        seatIndex: chairs.length,
        localX: -longSide/2 + spacing * (i + 1),
        localY: -shortSide/2 - chairOffset,
        rotation: 180,
      });
    }
    
    // Bottom side
    for (let i = 0; i < capacity - chairsPerLongSide; i++) {
      chairs.push({
        seatIndex: chairs.length,
        localX: -longSide/2 + spacing * (i + 1),
        localY: shortSide/2 + chairOffset,
        rotation: 0,
      });
    }
  }
  
  return chairs;
}
```

### 8.2 Chair-Table Relationship

- Chairs store `parentTableId` pointing to their table
- Table stores array of `chairIds`
- When table moves, all linked chairs move with it
- When table rotates, chairs rotate around table center
- When table is deleted, user is prompted: "Delete chairs too?"

### 8.3 Chair Redistribution

When table size or capacity changes:

```typescript
function redistributeChairs(
  table: TableElement, 
  newCapacity: number
): void {
  const existingChairs = getChairsForTable(table.id);
  const currentCapacity = existingChairs.length;
  
  if (newCapacity > currentCapacity) {
    // Add new chairs
    const newPositions = generateChairsForTable({
      ...table,
      capacity: newCapacity
    });
    
    // Keep guest assignments on existing chairs
    // Add new chairs at empty positions
  }
  
  if (newCapacity < currentCapacity) {
    // Remove excess chairs (starting from unassigned ones)
    const toRemove = currentCapacity - newCapacity;
    const unassignedChairs = existingChairs
      .filter(c => !c.assignedGuestId)
      .slice(0, toRemove);
    
    if (unassignedChairs.length < toRemove) {
      // Warn user: "Some assigned seats will be removed"
    }
  }
  
  // Recalculate positions for all chairs
  const newPositions = generateChairsForTable({
    ...table,
    capacity: newCapacity
  });
  
  // Apply new positions while preserving assignments
}
```

### 8.4 Manual Chair Adjustment

Individual chairs can be adjusted within limits:

- **Move:** Chair can be moved within ±0.5m of its default position
- **Rotate:** Chair can be rotated independently (for accessibility, etc.)
- **Detach:** Chair can be "detached" from table (becomes standalone)
- **Reset:** "Reset chair positions" button restores defaults

### 8.5 Table Group Behavior

| Action on Table | Effect on Chairs |
|-----------------|------------------|
| Move | Chairs move with table (maintain relative position) |
| Rotate | Chairs rotate around table center |
| Resize | Chairs redistribute automatically |
| Change capacity | Chairs added/removed with redistribution |
| Delete | Prompt: delete chairs too? |
| Duplicate | Chairs duplicated with table |
| Lock | Chairs also locked |

---

## 9. Drag & Drop Interactions

### 9.1 Drag States

```
IDLE → HOVER → DRAG_START → DRAGGING → DRAG_END → IDLE
                                ↓
                           DROP_INVALID
```

### 9.2 Visual Feedback During Drag

| State | Visual Feedback |
|-------|-----------------|
| **Hover** | Subtle highlight (light border glow) |
| **Drag Start** | Element lifts (drop shadow appears) |
| **Dragging** | Element follows cursor, opacity 90%, shadow |
| **Over Valid Drop** | Target zone highlights green |
| **Over Invalid Drop** | Target zone highlights red |
| **Collision Detected** | Element outline turns red, pulsing |
| **Snap Active** | Guide lines appear (blue) |
| **Drop Success** | Brief scale animation (100% → 105% → 100%) |
| **Drop Invalid** | Shake animation, returns to origin |

### 9.3 Drag from Sidebar

When dragging element from sidebar to canvas:

1. Create "ghost" element at cursor position
2. Ghost shows element shape at correct scale
3. Ghost shows dimensions tooltip
4. On drop: create element at drop position
5. On drop outside canvas: cancel, no element created

### 9.4 Drag Existing Element

When dragging element already on canvas:

1. Store original position (for undo and invalid drop)
2. Element visually lifts
3. Show snap guides when aligned
4. Show collision feedback if overlapping
5. On drop: update position
6. Record action for undo history

### 9.5 Multi-Element Drag

When multiple elements are selected and dragged:

1. Drag any selected element to move all
2. Maintain relative positions between elements
3. Collision detection against non-selected elements
4. Single undo action for entire group move

### 9.6 Drag Constraints

| Modifier Key | Effect |
|--------------|--------|
| **None** | Free drag with snap |
| **Shift** | Constrain to horizontal or vertical axis |
| **Alt/Option** | Temporarily disable snap |
| **Shift + Alt** | Constrain to axis, no snap |

---

## 10. Selection System

### 10.1 Selection Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Single Select** | Click element | Selects one, deselects others |
| **Add to Selection** | Shift + Click | Adds element to current selection |
| **Toggle Selection** | Cmd/Ctrl + Click | Toggles element in selection |
| **Box Select** | Click + drag on empty area | Selects all elements in box |
| **Select All** | Cmd/Ctrl + A | Selects all unlocked elements |
| **Deselect All** | Escape / Click empty area | Clears selection |

### 10.2 Selection Visual

Selected elements display:

```
        ┌─────────────────────────────────┐
        │ ○ (rotate handle)               │
        │                                 │
    ●───┼────────────────────────────────●│  ← Corner resize handles
    │   │                                 │
    │   │         [Element]              ●│  ← Edge resize handles
    │   │                                 │
    ●───┼────────────────────────────────●│
        │                                 │
        └─────────────────────────────────┘
```

- **Selection box:** Blue dashed border
- **Resize handles:** Small squares at corners and edges
- **Rotate handle:** Circle above top edge with line
- **Multi-selection:** Single bounding box around all selected

### 10.3 Selection Handles Behavior

| Handle | Action |
|--------|--------|
| **Corner** | Resize proportionally (default) or freely (with Shift) |
| **Edge** | Resize in one dimension |
| **Rotate** | Rotate around element center |
| **Shift + Corner** | Resize freely (non-proportional) |
| **Alt + Corner** | Resize from center |
| **Shift + Rotate** | Snap to 15° increments |

### 10.4 Selection Info Display

When elements are selected, show info bar:

```
┌────────────────────────────────────────────────────────┐
│  3 elements selected  │  [Align ▼]  [Distribute ▼]  │  │
└────────────────────────────────────────────────────────┘
```

### 10.5 Alignment Tools (Multi-Select)

When 2+ elements selected:

| Tool | Description |
|------|-------------|
| Align Left | Align left edges to leftmost element |
| Align Center (H) | Align horizontal centers |
| Align Right | Align right edges to rightmost element |
| Align Top | Align top edges to topmost element |
| Align Middle (V) | Align vertical centers |
| Align Bottom | Align bottom edges to bottommost element |
| Distribute Horizontally | Equal horizontal spacing |
| Distribute Vertically | Equal vertical spacing |

---

## 11. Collision Detection

### 11.1 Collision Algorithm

Using Axis-Aligned Bounding Box (AABB) with buffer:

```typescript
interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getBoundingBox(element: BaseElement): BoundingBox {
  // For rotated elements, calculate rotated corners and find bounds
  const corners = getRotatedCorners(element);
  return {
    minX: Math.min(...corners.map(c => c.x)),
    maxX: Math.max(...corners.map(c => c.x)),
    minY: Math.min(...corners.map(c => c.y)),
    maxY: Math.max(...corners.map(c => c.y)),
  };
}

function checkCollision(
  elementA: BaseElement,
  elementB: BaseElement,
  buffer: number = 0.05  // 5cm buffer
): boolean {
  const boxA = getBoundingBox(elementA);
  const boxB = getBoundingBox(elementB);
  
  // Expand box A by buffer
  const expandedA = {
    minX: boxA.minX - buffer,
    maxX: boxA.maxX + buffer,
    minY: boxA.minY - buffer,
    maxY: boxA.maxY + buffer,
  };
  
  // Check for overlap
  return !(
    expandedA.maxX < boxB.minX ||
    expandedA.minX > boxB.maxX ||
    expandedA.maxY < boxB.minY ||
    expandedA.minY > boxB.maxY
  );
}
```

### 11.2 Collision Exceptions

Collisions are **not** checked between:
- Element and its own children (table and its chairs)
- Elements in the same group
- Locked elements (they can overlap)
- Background elements (zones can overlap with everything)

### 11.3 Collision Visual Feedback

| State | Visual |
|-------|--------|
| **No collision** | Normal element appearance |
| **Collision during drag** | Red pulsing outline on dragged element |
| **Collision on drop** | Yellow warning icon appears, toast message |
| **Multiple collisions** | All colliding elements highlighted |

### 11.4 Collision Behavior

**During Drag:**
- Show collision visually
- Allow drop anyway (soft warning, not hard block)

**After Drop:**
- If collision exists: show toast "Elements are overlapping"
- Do NOT auto-adjust position (user knows best)
- Mark colliding elements with warning indicator

**Rationale:** Wedding planners sometimes intentionally overlap elements (tables touching, chairs close together). Hard blocking would be frustrating.

---

## 12. Snap & Alignment Guides

### 12.1 Snap Types

| Type | Description | Visual |
|------|-------------|--------|
| **Grid Snap** | Snap to grid intersections | Grid highlights |
| **Element Center Snap** | Align centers with other elements | Vertical/horizontal line |
| **Element Edge Snap** | Align edges with other elements | Vertical/horizontal line |
| **Wall Snap** | Snap to venue walls | Wall highlights |
| **Equal Spacing Snap** | Maintain equal distance between elements | Distance indicators |

### 12.2 Snap Threshold

- Default threshold: 10 pixels (screen space)
- User-adjustable in settings: 5px / 10px / 20px / Off

### 12.3 Snap Guide Visuals

```
            Vertical guide (center alignment)
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │   Element A     │                 │
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │   Element B     │   (dragging)    │
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
```

- Guide color: Blue (#0066FF) at 50% opacity
- Guide style: Solid 1px line
- Guide extends to canvas edges (or just between aligned elements)

### 12.4 Snap Controls

| Control | Action |
|---------|--------|
| `S` key | Toggle snap on/off |
| Hold `Alt/Option` | Temporarily disable snap while held |
| Settings | Adjust snap threshold |
| Settings | Enable/disable specific snap types |

### 12.5 Smart Spacing

When dragging element between two others, show equal spacing guides:

```
    ┌───────┐           ┌───────┐           ┌───────┐
    │   A   │←── 2m ──→│   B   │←── 2m ──→│   C   │
    └───────┘           └───────┘           └───────┘
                        (dragging)
```

---

## 13. Guest Assignment System

### 13.1 Assignment Flow

```
User clicks empty chair
        │
        ▼
Inline search dropdown appears
        │
        ├──► Type to search guest name
        │           │
        │           ▼
        │    Results filter in real-time
        │           │
        │           ▼
        │    Click guest to assign
        │           │
        │           ▼
        │    Chair updates visually
        │
        └──► Or click "Open full guest list"
                    │
                    ▼
             Guest list module opens
             (for complex operations)
```

### 13.2 Chair Visual States

```
Empty chair:        Assigned chair:      Selected chair:
     ○                   ●JS                  ◉JS
  (outline)         (filled + initials)   (highlighted)
  
Hover shows:        Hover shows:         
"Click to assign"   "João Silva          
                     Vegetarian 🥗       
                     Table 5, Seat 3"    
```

### 13.3 Inline Search Dropdown

When clicking an empty chair:

```
┌─────────────────────────────────────┐
│ 🔍 Search guest...                  │
├─────────────────────────────────────┤
│                                     │
│ RECENTLY ASSIGNED                   │
│ ┌─────────────────────────────────┐ │
│ │ 👤 João Silva              🥗  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Maria Santos            🍖  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ALL UNASSIGNED (42)                 │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Ana Costa              🥗   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Bruno Dias             🍖   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Carla Ferreira      ⚠️🥜   │ │ ← Allergy warning
│ └─────────────────────────────────┘ │
│ │ ... scroll for more              │
│                                     │
├─────────────────────────────────────┤
│ [Open Full Guest List ↗]           │
└─────────────────────────────────────┘
```

### 13.4 Dietary & Allergy Icons

| Icon | Meaning |
|------|---------|
| 🍖 | Regular (meat) |
| 🥗 | Vegetarian |
| 🌱 | Vegan |
| 🕌 | Halal |
| ✡️ | Kosher |
| ⚠️ | Has allergies (hover for details) |
| 🥜 | Nut allergy |
| 🌾 | Gluten intolerance |
| 🥛 | Dairy intolerance |

### 13.5 Assignment Actions

| Action | Trigger | Result |
|--------|---------|--------|
| **Assign guest** | Click guest in dropdown | Chair fills, shows initials |
| **Unassign guest** | Click assigned chair → "Remove" | Chair empties, guest returns to list |
| **Reassign guest** | Click assigned chair → search new | Previous guest unassigned, new assigned |
| **Swap guests** | Drag guest from one chair to another | Guests swap positions |

### 13.6 Bulk Assignment

Select multiple empty chairs → "Assign Guests" button:

```
┌─────────────────────────────────────┐
│ Assign Guests to 8 seats            │
├─────────────────────────────────────┤
│                                     │
│ ☐ Select all unassigned (42)       │
│                                     │
│ ☑ João Silva                       │
│ ☑ Maria Santos                     │
│ ☑ Ana Costa                        │
│ ☑ Bruno Dias                       │
│ ☐ Carla Ferreira                   │
│ ☐ David Gomes                      │
│ ...                                 │
│                                     │
│ 4 of 8 guests selected             │
│                                     │
│ [Cancel]    [Assign Selected]       │
└─────────────────────────────────────┘
```

### 13.7 Unassigned Counter

Always visible in the UI:

```
┌────────────────────────────────────────────┐
│  Seating: 78/120 assigned   42 remaining   │
│           ████████████░░░░░░               │
└────────────────────────────────────────────┘
```

### 13.8 Table Guest Summary

Hover or click table shows summary:

```
┌─────────────────────────────────────┐
│ Table 5 · Round 8 seats             │
├─────────────────────────────────────┤
│ 6/8 assigned                        │
│                                     │
│ 👤 João Silva        🥗            │
│ 👤 Maria Santos      🍖            │
│ 👤 Ana Costa         🍖            │
│ 👤 Bruno Dias        🌱            │
│ 👤 Carla Ferreira    🥗 ⚠️🥜      │
│ 👤 David Gomes       🍖            │
│ ○  Empty                           │
│ ○  Empty                           │
│                                     │
│ Meals: 3🍖 2🥗 1🌱                 │
│                                     │
│ [Edit Table]  [Assign Remaining]    │
└─────────────────────────────────────┘
```

---

## 14. Floor Plan Import

### 14.1 Purpose

Allow wedding planners to import existing venue floor plans as a background reference for accurate element placement.

### 14.2 Supported Formats

| Format | Notes |
|--------|-------|
| **PDF** | First page extracted as image |
| **PNG** | Direct import |
| **JPG/JPEG** | Direct import |
| **SVG** | Converted to image |

### 14.3 Import Flow

#### Step 1: Upload

```
┌─────────────────────────────────────────────┐
│  Import Venue Floor Plan                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │      📄                             │   │
│  │                                     │   │
│  │   Drop your floor plan here         │   │
│  │   or click to browse               │   │
│  │                                     │   │
│  │   PDF, PNG, JPG up to 10MB         │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│                              [Cancel]       │
└─────────────────────────────────────────────┘
```

#### Step 2: Set Scale

```
┌─────────────────────────────────────────────┐
│  Set Scale                          2 of 3  │
├─────────────────────────────────────────────┤
│                                             │
│  Click two points on the floor plan and    │
│  enter the real-world distance between     │
│  them.                                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │   [Floor plan image]                │   │
│  │          ●━━━━━━━━━━━●             │   │
│  │          Point 1    Point 2        │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Distance between points:                   │
│  ┌────────┐                                │
│  │  10.5  │ meters                         │
│  └────────┘                                │
│                                             │
│  [◀ Back]                    [Continue ▶]  │
└─────────────────────────────────────────────┘
```

#### Step 3: Position & Adjust

```
┌─────────────────────────────────────────────┐
│  Position Floor Plan                 3 of 3 │
├─────────────────────────────────────────────┤
│                                             │
│  Drag to position, use corners to resize   │
│  or rotate if needed.                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │   [Canvas with floor plan overlay]  │   │
│  │   [Existing walls shown on top]     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Opacity                                    │
│  ░░░░░░░░░░●░░░░░░░░░  50%                │
│                                             │
│  ☑ Lock after placing                      │
│                                             │
│  [◀ Back]                    [Done ✓]      │
└─────────────────────────────────────────────┘
```

### 14.4 Floor Plan Layer Controls

Once imported, floor plan appears in background layer:

| Control | Location | Action |
|---------|----------|--------|
| **Opacity Slider** | Properties panel | Adjust visibility (0-100%) |
| **Lock/Unlock** | Properties panel | Prevent accidental moves |
| **Show/Hide** | Layers panel or keyboard `B` | Toggle visibility |
| **Replace** | Properties panel | Upload new floor plan |
| **Remove** | Properties panel | Delete floor plan |
| **Reposition** | Unlock + drag | Move floor plan |
| **Recalibrate** | Properties panel | Redo scale calibration |

### 14.5 Floor Plan Data Model

```typescript
interface FloorPlanBackground {
  id: string;
  imageUrl: string;          // Stored image URL
  originalFilename: string;
  
  // Position (in meters, relative to canvas origin)
  x: number;
  y: number;
  
  // Scale
  pixelsPerMeter: number;    // Calculated from calibration
  width: number;             // Display width in meters
  height: number;            // Display height in meters
  rotation: number;          // Degrees
  
  // Display
  opacity: number;           // 0-1
  locked: boolean;
  visible: boolean;
  
  // Calibration data (for recalibration)
  calibrationPoints: {
    point1: { x: number; y: number };
    point2: { x: number; y: number };
    distanceMeters: number;
  };
}
```

---

## 15. Export System

### 15.1 Export Trigger

Export button in toolbar opens Export Wizard modal.

### 15.2 Export Wizard

```
┌─────────────────────────────────────────────────────────┐
│  Export Layout                                     [×]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  QUICK PRESETS                                          │
│                                                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐│
│  │    👤     │ │    🍽     │ │    🔧     │ │   📋    ││
│  │           │ │           │ │           │ │         ││
│  │  Client   │ │ Catering  │ │   Setup   │ │  Full   ││
│  │  Version  │ │  Version  │ │   Crew    │ │ Details ││
│  └─────┬─────┘ └───────────┘ └───────────┘ └─────────┘│
│        └── selected                                     │
│                                                         │
│  ─────────────────── OR CUSTOMIZE ────────────────────  │
│                                                         │
│  INCLUDE IN EXPORT                                      │
│                                                         │
│  Layout Elements                                        │
│  ☑ Table numbers                                       │
│  ☑ Table shapes                                        │
│  ☐ Element dimensions                                  │
│  ☐ Grid                                                │
│                                                         │
│  Guest Information                                      │
│  ☑ Guest names on seats                                │
│  ☐ Dietary icons                                       │
│  ☐ Meal summary per table                              │
│                                                         │
│  Technical Details                                      │
│  ☐ Measurements and distances                          │
│  ☐ Setup notes                                         │
│  ☐ Electrical points                                   │
│                                                         │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  FORMAT & SIZE                                          │
│                                                         │
│  Format:  ● PDF   ○ PNG   ○ SVG                        │
│  Size:    ● A4    ○ A3    ○ Letter   ○ Custom          │
│  Orient:  ● Portrait   ○ Landscape                     │
│                                                         │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  BRANDING                                               │
│                                                         │
│  ☐ Include company logo                                │
│    [Upload logo]                                        │
│                                                         │
│  ☐ Include footer text                                 │
│    [________________________________]                   │
│                                                         │
│  ───────────────────────────────────────────────────── │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │              [PREVIEW AREA]                     │   │
│  │                                                 │   │
│  │   Shows live preview of export                  │   │
│  │   with current settings                         │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────┐                    ┌───────────────┐  │
│  │   Cancel    │                    │   Export ⬇    │  │
│  └─────────────┘                    └───────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 15.3 Preset Configurations

| Preset | Includes | Excludes |
|--------|----------|----------|
| **Client Version** | Table numbers, Guest names, Table shapes | Dimensions, Grid, Technical notes, Meal counts |
| **Catering Version** | Table numbers, Meal counts per table, Dietary icons, Total meal summary | Guest names, Dimensions, Technical notes |
| **Setup Crew** | Table numbers, All dimensions, Element sizes, Grid, Technical notes, Electrical points | Guest names, Dietary info |
| **Full Details** | Everything | Nothing |

### 15.4 Export Output

**PDF Export:**
- Vector-based for crisp printing
- Embedded fonts
- Metadata (layout name, date, event)
- Optional header/footer

**PNG Export:**
- High resolution (300 DPI default)
- Transparent background option
- Size options: 1x, 2x, 3x

**SVG Export:**
- Full vector
- Editable in design software
- For advanced users

### 15.5 Saved Presets

Users can save custom presets:

```typescript
interface ExportPreset {
  id: string;
  name: string;
  
  // What to include
  includeTableNumbers: boolean;
  includeTableShapes: boolean;
  includeElementDimensions: boolean;
  includeGrid: boolean;
  includeGuestNames: boolean;
  includeDietaryIcons: boolean;
  includeMealSummary: boolean;
  includeTechnicalNotes: boolean;
  includeElectricalPoints: boolean;
  
  // Format
  format: 'pdf' | 'png' | 'svg';
  pageSize: 'a4' | 'a3' | 'letter' | 'custom';
  orientation: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  
  // Branding
  includeLogo: boolean;
  logoUrl?: string;
  includeFooter: boolean;
  footerText?: string;
}
```

---

## 16. Mobile & Tablet Experience

### 16.1 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Desktop** | ≥1024px | Full sidebar + canvas |
| **Tablet** | 768-1023px | Collapsible sidebar or bottom sheet |
| **Mobile** | <768px | Bottom sheet only, compact toolbar |

### 16.2 Tablet Layout

```
┌────────────────────────────────────────────────┐
│  [☰]  Layout Name            [👁]  [⚙]  [⬇]  │  ← Compact header
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│                                                │
│               Canvas Area                      │
│          (full touch support)                  │
│                                                │
│                                                │
│                                    [+]         │  ← Floating Action Button
│                                                │
├────────────────────────────────────────────────┤
│  [Tables] [Zones] [Service] [Decor] [More]    │  ← Tab bar
└────────────────────────────────────────────────┘

When tab selected, bottom sheet slides up:
┌────────────────────────────────────────────────┐
│  ...                                           │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │  ━━━━  (drag handle)                       │ │
│ │                                            │ │
│ │  TABLES                                    │ │
│ │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │ │
│ │  │ ⚪  │ │ ⚪  │ │ ▭  │ │ ▭  │     │ │
│ │  │Rnd 6│ │Rnd 8│ │Rec 6│ │Rec 8│     │ │
│ │  └──────┘ └──────┘ └──────┘ └──────┘     │ │
│ │                                            │ │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### 16.3 Touch Gesture Mapping

| Gesture | Desktop Equivalent | Action |
|---------|-------------------|--------|
| **Tap** | Click | Select element / Open dropdown |
| **Double tap** | Double click | Edit element properties |
| **Long press** | Right click | Context menu |
| **Drag** | Click + drag | Move element |
| **Two-finger drag** | Middle click drag | Pan canvas |
| **Pinch** | Scroll wheel | Zoom in/out |
| **Two-finger rotate** | — | Rotate selected element |

### 16.4 Touch Target Sizes

All interactive elements must meet minimum touch target:
- **Minimum:** 44×44 points (Apple HIG)
- **Recommended:** 48×48 points
- **Small elements (chairs):** Expand hit area by 50% when in touch mode

### 16.5 Element Selection on Touch

When selecting small elements (like chairs) on touch:

1. First tap: select element + show enlarged handle area
2. Drag: move element
3. Tap elsewhere: deselect

For densely packed elements:
- Long press shows disambiguation menu: "Select: Chair 1 / Chair 2 / Table 5"

### 16.6 Properties Panel (Mobile)

On mobile/tablet, properties show in bottom sheet:

```
┌────────────────────────────────────────────────┐
│  ━━━━                                         │  ← Drag to expand/collapse
├────────────────────────────────────────────────┤
│                                                │
│  Table 5 · Round · 8 seats                    │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │ Seats  │  Size  │  Position  │  Style  │  │  ← Tabs
│  └────────┴────────┴────────────┴─────────┘  │
│                                                │
│  NUMBER OF SEATS                               │
│  [4] [6] [8] [10] [12] [+]                   │
│                                                │
│  TABLE SIZE                                    │
│  ● Auto (Ø1.5m)                               │
│  ○ Custom                                      │
│                                                │
│  ┌─────────────┐  ┌─────────────┐            │
│  │   Delete    │  │    Done     │            │
│  └─────────────┘  └─────────────┘            │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 17. Keyboard Shortcuts

### 17.1 Essential Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool (default) |
| `H` | Hand tool (pan) |
| `Space` (hold) | Temporary hand tool |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Deselect all / Cancel operation |

### 17.2 View Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + 0` | Zoom to fit |
| `Cmd/Ctrl + 1` | Zoom to 100% |
| `Cmd/Ctrl + +` | Zoom in |
| `Cmd/Ctrl + -` | Zoom out |
| `Cmd/Ctrl + [` | Zoom to selection |

### 17.3 Edit Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + C` | Copy |
| `Cmd/Ctrl + V` | Paste |
| `Cmd/Ctrl + X` | Cut |
| `Cmd/Ctrl + D` | Duplicate |
| `Cmd/Ctrl + A` | Select all |

### 17.4 Element Shortcuts

| Shortcut | Action |
|----------|--------|
| `T` | Add round table (opens config) |
| `R` | Rotate selected 90° |
| `Shift + R` | Rotate selected -90° |
| `[` | Send backward |
| `]` | Bring forward |
| `Cmd/Ctrl + [` | Send to back |
| `Cmd/Ctrl + ]` | Bring to front |
| `Cmd/Ctrl + G` | Group selected |
| `Cmd/Ctrl + Shift + G` | Ungroup |
| `L` | Lock/unlock selected |

### 17.5 Nudge Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow keys` | Nudge 1 pixel |
| `Shift + Arrow keys` | Nudge 10 pixels |

### 17.6 Toggle Shortcuts

| Shortcut | Action |
|----------|--------|
| `S` | Toggle snap on/off |
| `G` | Toggle grid visibility |
| `B` | Toggle background (floor plan) |
| `?` | Show shortcuts panel |

### 17.7 Modifier Keys

| Modifier | During Drag | During Resize | During Rotate |
|----------|-------------|---------------|---------------|
| `Shift` | Constrain to axis | Maintain aspect ratio | Snap to 15° |
| `Alt/Option` | Disable snap | Resize from center | — |
| `Cmd/Ctrl` | — | — | — |

---

## 18. Undo/Redo & Autosave

### 18.1 Undo System

**Implementation:** Command pattern with action stack

```typescript
interface HistoryEntry {
  id: string;
  timestamp: number;
  actionType: ActionType;
  actionLabel: string;        // Human-readable: "Move Table 5"
  previousState: Partial<LayoutState>;
  nextState: Partial<LayoutState>;
}

type ActionType =
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'MOVE_ELEMENT'
  | 'RESIZE_ELEMENT'
  | 'ROTATE_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'ASSIGN_GUEST'
  | 'UNASSIGN_GUEST'
  | 'BATCH';  // For grouped operations
```

### 18.2 Undo/Redo Limits

- **Stack size:** 100 actions (configurable)
- **Memory management:** Prune old entries when limit exceeded
- **Batch operations:** Multiple related changes count as one undo step

### 18.3 Undo Feedback

When user presses Cmd+Z:

```
┌─────────────────────────────────────┐
│  ↩ Undo: Move Table 5              │  ← Toast notification
└─────────────────────────────────────┘
```

### 18.4 Autosave

**Behavior:**
- Save after every significant action
- Debounce: wait 1 second of inactivity before saving
- Show indicator during save

**Visual indicator in header:**

```
Saving...  →  Saved ✓  →  (fades after 2s)
```

**Offline handling:**
- Queue changes locally
- Sync when back online
- Show "Offline - changes saved locally" indicator

### 18.5 Version History (Future)

For recovery of older versions:

```
┌─────────────────────────────────────────────┐
│  Version History                            │
├─────────────────────────────────────────────┤
│                                             │
│  ● Current version                          │
│  │                                          │
│  ○ Today, 3:45 PM                          │
│  │ "Before moving dance floor"              │
│  │                                          │
│  ○ Today, 2:30 PM                          │
│  │ Auto-saved                               │
│  │                                          │
│  ○ Yesterday, 5:15 PM                      │
│  │ "Initial layout"                         │
│                                             │
│  [Restore Selected]          [Close]        │
└─────────────────────────────────────────────┘
```

---

## 19. Visual Feedback System

### 19.1 Interaction States

| State | Visual Feedback |
|-------|-----------------|
| **Idle** | Normal appearance |
| **Hover** | Light border glow, cursor change |
| **Selected** | Blue border, resize handles visible |
| **Multi-selected** | Blue border on each, group bounding box |
| **Dragging** | Drop shadow, slight transparency (90%) |
| **Resizing** | Active handle highlighted, dimension tooltip |
| **Rotating** | Rotation angle tooltip |
| **Locked** | Lock icon badge, no hover effect |
| **Hidden** | Not rendered |

### 19.2 Cursor States

| Context | Cursor |
|---------|--------|
| Default | `default` |
| Hovering element | `pointer` |
| Dragging element | `grabbing` |
| Hand tool | `grab` |
| Panning | `grabbing` |
| Resize handle (corner) | `nwse-resize` / `nesw-resize` |
| Resize handle (edge) | `ns-resize` / `ew-resize` |
| Rotate handle | `rotate` (custom) |
| Over locked element | `not-allowed` |

### 19.3 Toast Notifications

| Event | Toast Message | Duration |
|-------|---------------|----------|
| Element deleted | "Table 5 deleted" with Undo button | 5s |
| Undo | "Undo: Move Table 5" | 2s |
| Redo | "Redo: Move Table 5" | 2s |
| Collision warning | "Elements are overlapping" | 3s |
| Guest assigned | "João Silva assigned to Table 5, Seat 3" | 2s |
| Export complete | "Layout exported successfully" with Open button | 5s |
| Save error | "Couldn't save. Retrying..." | Until resolved |

### 19.4 Loading States

| Situation | Feedback |
|-----------|----------|
| Initial load | Skeleton loader for canvas |
| Adding element | Immediate (optimistic) |
| Saving | "Saving..." indicator |
| Exporting | Progress bar in modal |
| Importing floor plan | Progress bar with percentage |

### 19.5 Empty States

**No elements on canvas:**

```
┌─────────────────────────────────────────────┐
│                                             │
│              [illustration]                 │
│                                             │
│        Start building your layout           │
│                                             │
│   Add tables and elements from the          │
│   sidebar, or import a floor plan.          │
│                                             │
│   [+ Add First Element]  [Import Plan]      │
│                                             │
└─────────────────────────────────────────────┘
```

**No venue space defined:**

```
┌─────────────────────────────────────────────┐
│                                             │
│              [illustration]                 │
│                                             │
│         Define your venue space             │
│                                             │
│   Create walls to set the boundaries        │
│   of your event space.                      │
│                                             │
│   [Create Space]  [Import from Library]     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 20. Data Models

### 20.1 Complete Layout Data Model

```typescript
interface Layout {
  // Identity
  id: string;
  projectId: string;           // Parent project
  eventId: string;             // Associated event
  
  // Metadata
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'ready' | 'approved';
  
  // Venue space
  space: {
    walls: Wall[];
    dimensions: {
      width: number;           // Total width in meters
      height: number;          // Total height in meters
    };
    pixelsPerMeter: number;
  };
  
  // Background
  floorPlan: FloorPlanBackground | null;
  
  // Elements
  elements: Record<string, BaseElement>;
  elementOrder: string[];      // Z-index ordering
  
  // Groups
  groups: Record<string, ElementGroup>;
  
  // Settings
  settings: LayoutSettings;
  
  // Guest assignments (denormalized for performance)
  assignments: Record<string, GuestAssignment>;  // chairId -> assignment
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Version
  schemaVersion: number;
}

interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
}

interface ElementGroup {
  id: string;
  name: string;
  elementIds: string[];
  locked: boolean;
}

interface LayoutSettings {
  gridVisible: boolean;
  gridSize: number;            // In meters
  snapEnabled: boolean;
  snapThreshold: number;       // In pixels
  rulersVisible: boolean;
  unit: 'meters' | 'feet';
}

interface GuestAssignment {
  chairId: string;
  guestId: string;
  guestName: string;           // Denormalized
  dietaryType: string | null;
  allergyFlags: string[];
  assignedAt: string;
  assignedBy: string;
}
```

### 20.2 Guest Data Model (from Guest List module)

```typescript
interface Guest {
  id: string;
  eventId: string;
  
  // Personal info
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  
  // RSVP
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  plusOne: boolean;
  plusOneName: string | null;
  
  // Dietary
  dietaryType: 'regular' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'other';
  dietaryNotes: string | null;
  allergies: string[];
  
  // Preferences
  tablePreferences: string[];  // Guest IDs they want to sit with
  tableAvoidances: string[];   // Guest IDs they want to avoid
  accessibilityNeeds: string | null;
  
  // Assignment (reference)
  assignedLayoutId: string | null;
  assignedChairId: string | null;
  
  // Metadata
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 20.3 Export Preset Data Model

```typescript
interface ExportPreset {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  
  // Content options
  content: {
    tableNumbers: boolean;
    tableShapes: boolean;
    elementDimensions: boolean;
    grid: boolean;
    guestNames: boolean;
    dietaryIcons: boolean;
    mealSummary: boolean;
    technicalNotes: boolean;
    electricalPoints: boolean;
  };
  
  // Format options
  format: {
    type: 'pdf' | 'png' | 'svg';
    pageSize: 'a4' | 'a3' | 'letter' | 'custom';
    orientation: 'portrait' | 'landscape';
    customWidth: number | null;
    customHeight: number | null;
    resolution: number;        // DPI for raster
  };
  
  // Branding
  branding: {
    includeLogo: boolean;
    logoUrl: string | null;
    includeFooter: boolean;
    footerText: string | null;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 21. Technical Implementation Notes

### 21.1 Technology Stack

| Layer | Technology |
|-------|------------|
| **Rendering** | SVG (consistent with Wall Maker) |
| **Framework** | React with TypeScript |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase |
| **PDF Export** | jsPDF or react-pdf |
| **Image Export** | html-to-image or svg-to-image |

### 21.2 Performance Considerations

| Concern | Solution |
|---------|----------|
| Many elements (200+) | Viewport culling (only render visible) |
| Frequent updates | Debounced rendering, RAF |
| Large floor plans | Image compression, lazy loading |
| Complex collision checks | Spatial indexing (quadtree if needed) |
| Undo history memory | Limit stack, compress old entries |

### 21.3 File Structure

```
src/
├── layout-maker/
│   ├── components/
│   │   ├── LayoutMaker.tsx           # Main container
│   │   ├── WorkflowView/
│   │   │   ├── WorkflowView.tsx
│   │   │   ├── LayoutCard.tsx
│   │   │   └── CreateLayoutModal.tsx
│   │   ├── Canvas/
│   │   │   ├── CanvasArea.tsx
│   │   │   ├── GridLayer.tsx
│   │   │   ├── WallsLayer.tsx
│   │   │   ├── ElementsLayer.tsx
│   │   │   ├── SelectionLayer.tsx
│   │   │   ├── GuidesLayer.tsx
│   │   │   └── BackgroundLayer.tsx
│   │   ├── Elements/
│   │   │   ├── TableElement.tsx
│   │   │   ├── ChairElement.tsx
│   │   │   ├── ZoneElement.tsx
│   │   │   ├── FurnitureElement.tsx
│   │   │   └── SelectionHandles.tsx
│   │   ├── Sidebar/
│   │   │   ├── ElementLibrary.tsx
│   │   │   ├── ElementCategory.tsx
│   │   │   ├── ElementRow.tsx
│   │   │   ├── ConfigPopover.tsx
│   │   │   └── PropertiesPanel.tsx
│   │   ├── Toolbar/
│   │   │   ├── MainToolbar.tsx
│   │   │   └── ViewControls.tsx
│   │   ├── GuestAssignment/
│   │   │   ├── GuestSearchDropdown.tsx
│   │   │   ├── GuestCard.tsx
│   │   │   └── AssignmentSummary.tsx
│   │   ├── FloorPlanImport/
│   │   │   ├── ImportWizard.tsx
│   │   │   ├── ScaleCalibration.tsx
│   │   │   └── PositionAdjust.tsx
│   │   ├── Export/
│   │   │   ├── ExportWizard.tsx
│   │   │   ├── PresetSelector.tsx
│   │   │   └── ExportPreview.tsx
│   │   └── common/
│   │       ├── Rulers.tsx
│   │       ├── ScaleBar.tsx
│   │       ├── Toast.tsx
│   │       └── Modal.tsx
│   │
│   ├── hooks/
│   │   ├── useViewport.ts
│   │   ├── useElements.ts
│   │   ├── useSelection.ts
│   │   ├── useDragDrop.ts
│   │   ├── useCollision.ts
│   │   ├── useSnapGuides.ts
│   │   ├── useHistory.ts
│   │   ├── useGuestAssignment.ts
│   │   └── useExport.ts
│   │
│   ├── stores/
│   │   ├── layoutStore.ts
│   │   ├── viewportStore.ts
│   │   ├── selectionStore.ts
│   │   ├── historyStore.ts
│   │   └── uiStore.ts
│   │
│   ├── utils/
│   │   ├── geometry.ts
│   │   ├── collision.ts
│   │   ├── snapGuides.ts
│   │   ├── chairGeneration.ts
│   │   ├── coordinateConversion.ts
│   │   ├── export.ts
│   │   └── validation.ts
│   │
│   ├── types/
│   │   ├── elements.ts
│   │   ├── layout.ts
│   │   ├── guests.ts
│   │   ├── export.ts
│   │   └── index.ts
│   │
│   └── constants/
│       ├── elementDefaults.ts
│       ├── shortcuts.ts
│       └── colors.ts
```

### 21.4 State Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ZUSTAND STORES                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ layoutStore │  │viewportStore│  │selectionStore│   │
│  │             │  │             │  │             │    │
│  │ - elements  │  │ - x, y      │  │ - selected  │    │
│  │ - walls     │  │ - zoom      │  │ - hovering  │    │
│  │ - settings  │  │ - width     │  │ - dragging  │    │
│  │ - floorPlan │  │ - height    │  │             │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│                          ▼                             │
│                  ┌───────────────┐                     │
│                  │ historyStore  │                     │
│                  │               │                     │
│                  │ - past[]      │                     │
│                  │ - future[]    │                     │
│                  │ - canUndo     │                     │
│                  │ - canRedo     │                     │
│                  └───────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 21.5 Integration Points

| Integration | Data Flow |
|-------------|-----------|
| **Wall Maker → Layout Maker** | Walls array exported, imported as space.walls |
| **Guest List → Layout Maker** | Guest data fetched via API, cached locally |
| **Layout Maker → Export** | Layout rendered to PDF/PNG/SVG |
| **Layout Maker → Supabase** | Real-time sync of layout changes |

### 21.6 Testing Strategy

| Type | Coverage |
|------|----------|
| **Unit Tests** | Geometry utils, collision detection, chair generation |
| **Integration Tests** | Store actions, undo/redo, guest assignment |
| **E2E Tests** | Full workflow: create layout → add elements → assign guests → export |
| **Visual Regression** | Element rendering, export output |
| **Performance Tests** | 200+ elements, rapid interactions |

---

## Appendix A: Accessibility

### A.1 Keyboard Navigation

- All interactive elements are focusable
- Tab order follows logical flow
- Focus indicators visible
- All actions achievable via keyboard

### A.2 Screen Reader Support

- Elements have aria-labels
- Status changes announced
- Canvas has text alternative description

### A.3 Color & Contrast

- Minimum 4.5:1 contrast ratio for text
- Color not sole indicator of state
- High contrast mode support

---

## Appendix B: Localization

### B.1 Supported Languages (Future)

- English (default)
- Portuguese
- Spanish
- French

### B.2 Measurement Units

- Meters (default)
- Feet (US market)
- Automatic conversion

### B.3 Page Sizes

- A4 (default, international)
- Letter (US)
- A3 (large prints)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial specification |

---

*End of Document*
