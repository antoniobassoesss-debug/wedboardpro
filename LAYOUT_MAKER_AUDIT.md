# Layout Maker Comprehensive Audit

## File Structure Map

### Core Layout Maker Files

| File | Size | Purpose | Status |
|------|------|---------|--------|
| `src/client/LayoutMakerPage.tsx` | 30KB | Main page container, project management, save functionality | Has P0 bug |
| `src/client/GridCanvas.tsx` | 98KB | SVG-based canvas with drag/drop, zoom/pan, element rendering | Working |
| `src/client/Toolbar.tsx` | 91KB | Left sidebar with tools, space/table creation, wall maker | Working |
| `src/client/ProjectTabs.tsx` | 8KB | Project tabs at bottom of screen | Working |
| `src/client/HeaderBar.tsx` | 9KB | Top header with save buttons | Working |
| `src/client/InfiniteGridBackground.tsx` | 2KB | Background grid pattern | Working |
| `src/client/AssistantChat.tsx` | 13KB | AI chat assistant panel | Working |
| `src/client/AssociateProjectModal.tsx` | 12KB | Modal to link layouts to events | Working |

### Supporting Components

| File | Purpose |
|------|---------|
| `src/client/components/WallMaker.tsx` | Wall drawing tool |
| `src/client/components/ElectricalDashboard.tsx` | Electrical panel view |
| `src/client/components/ElectricalDrawer.tsx` | Power point properties |
| `src/client/components/ElectricalIcon.tsx` | Power point icons |
| `src/client/components/ElectricalAIChat.tsx` | AI electrical assistant |
| `src/client/components/ElectricalBreakerCalculator.tsx` | Circuit calculator |

### API & Types

| File | Purpose |
|------|---------|
| `src/client/api/layoutsApi.ts` | Supabase layout CRUD operations |
| `src/client/types/wall.ts` | Wall and door types |
| `src/client/types/powerPoint.ts` | Power point types |
| `src/client/types/electrical.ts` | Electrical standard types |

### Database Schema

| File | Purpose |
|------|---------|
| `supabase_layouts_schema.sql` | Database tables for layouts |

---

## Issue List

### P0 - Critical (App Breaking)

#### Issue #1: setShowSaveDropdown Not Defined
**Priority**: P0
**File**: `src/client/LayoutMakerPage.tsx`
**Lines**: 225, 293
**Error**: `Cannot find name 'setShowSaveDropdown'`
**Current behavior**: Calling undefined function when saving layouts
**Expected behavior**: Dropdown should close after save action
**Root cause**: State `showSaveDropdown` and setter exist in `HeaderBar.tsx` but are called directly in `LayoutMakerPage.tsx` without being passed or defined
**Fix plan**: Remove calls to `setShowSaveDropdown` from LayoutMakerPage.tsx since the dropdown is managed by HeaderBar
**Status**: [x] Fixed - Removed both calls to setShowSaveDropdown from handleSaveCurrentLayout and handleSaveAllLayouts

---

### P1 - High (Features Broken)

#### Issue #2: Debug Overlay in Production
**Priority**: P1
**File**: `src/client/LayoutMakerPage.tsx`
**Lines**: 678-692
**Current behavior**: Red "Layout Maker Loaded" text always visible at top-left
**Expected behavior**: Should only show in development or not at all
**Root cause**: Debug element not wrapped in dev-only condition
**Fix plan**: Remove debug element or wrap in NODE_ENV check
**Status**: [x] Fixed - Removed the debug overlay completely

---

### P2 - Medium (Warnings/Partial Features)

#### Issue #3: TypeScript Module Resolution Warnings
**Priority**: P2
**Files**: Multiple files throughout codebase
**Warning**: Import paths need explicit `.js` extensions
**Current behavior**: Vite handles these, but TypeScript compiler shows warnings
**Fix plan**: Low priority - Vite handles these correctly
**Status**: [ ] Deferred

#### Issue #4: Implicit Any Types
**Priority**: P2
**Files**: `avatarApi.ts`, `AuthCallbackPage.tsx`, etc.
**Warning**: Parameters implicitly have 'any' type
**Fix plan**: Add proper type annotations
**Status**: [ ] Not started

---

### P3 - Low (Polish/Optimization)

#### Issue #5: Debug Overlay in Development
**Priority**: P3
**File**: `src/client/LayoutMakerPage.tsx`
**Lines**: 856-876
**Current behavior**: Debug overlay shows in development mode
**Expected behavior**: Should be toggleable or less obtrusive
**Status**: [ ] Not started

#### Issue #6: Excessive Console Logging
**Priority**: P3
**File**: `src/client/GridCanvas.tsx`
**Count**: 37 console.log statements (18 now wrapped with DEBUG_CANVAS flag)
**Current behavior**: Verbose logging of every operation (image loading, shape changes, etc.)
**Expected behavior**: Production builds should have minimal logging
**Fix plan**: Wrap in DEBUG_CANVAS flag (set to false by default)
**Status**: [x] Fixed - Added DEBUG_CANVAS constant and wrapped 18 most verbose logs

---

## Feature Verification Checklist

### Canvas Management
- [x] Zoomable canvas (zoom in/out via scroll wheel)
- [x] Pannable canvas (drag background with hand tool)
- [x] Grid system (visible grid via InfiniteGridBackground)
- [x] Canvas size configurable (A4 dimensions calculated)
- [x] Responsive canvas (adapts to window size)
- [ ] Canvas background color customizable - Not implemented

### Element Library
- [x] Predefined shapes in sidebar (Tables via Toolbar)
- [x] Tables (round, rectangular) with configurable sizes
- [x] Spaces (floor areas) with meter dimensions
- [x] Walls and doors (via WallMaker)
- [x] Power points (electrical)
- [x] Drag from sidebar onto canvas
- [ ] Element preview while dragging - Partial (flash outline)
- [x] Proper drop behavior

### Element Manipulation
- [x] Select element (click with hand tool)
- [ ] Multi-select (Ctrl+Click) - Not implemented
- [x] Move element (drag selected)
- [ ] Resize element - Not implemented for all types
- [ ] Rotate element - Not implemented
- [x] Delete element (Delete key)
- [x] Copy/Paste (Ctrl+C/V)
- [x] Undo/Redo (via stack, partial implementation)
- [ ] Bring to front/Send to back - Not implemented

### Element Properties
- [ ] Properties panel for selected element - Not implemented
- [ ] Inline editing of properties - Not implemented
- [x] Real-time updates when properties change

### Table-Specific Features
- [ ] Tables show seat count visually - Image-based
- [x] Configurable seats per table
- [ ] Table numbering/labeling - Not implemented
- [ ] Color coding tables - Not implemented

### Save & Export
- [x] Save layout to database (Supabase)
- [ ] Auto-save functionality - Not implemented
- [ ] Export as image (PNG/JPG) - Not implemented
- [ ] Export as PDF - Not implemented
- [x] Load existing layouts
- [ ] Duplicate existing layout - Not implemented

### Templates
- [ ] Pre-made layout templates - Not implemented
- [ ] Save custom layouts as templates - Not implemented

---

## Architecture Notes

### State Management
- Uses React useState + useRef extensively
- Project data stored in localStorage with Supabase sync
- Multiple refs for tracking current state (drawingsRef, shapesRef, etc.)
- Deep copy pattern for project isolation

### Canvas Implementation
- Pure SVG-based (no canvas library like Konva/Fabric)
- Custom zoom/pan via viewBox manipulation
- Custom drag handling via mouse events

### Data Persistence
- localStorage: `layout-maker-projects` (array of projects)
- localStorage: `layout-maker-active-project-id` (current project)
- Supabase: Optional cloud sync via `saveLayout()` API

---

## Recommendations

### Immediate Fixes (Do Now)
1. Fix P0 bug: Remove `setShowSaveDropdown` calls from LayoutMakerPage.tsx
2. Fix P1 bug: Remove debug overlay

### Short-term Improvements
1. Add proper element resize handles
2. Implement rotation for elements
3. Add properties panel for selected elements
4. Implement auto-save functionality

### Long-term Improvements
1. Consider using Konva.js or Fabric.js for canvas management
2. Add Zustand or Context for state management
3. Implement proper undo/redo with Immer
4. Add collaborative features with Supabase real-time

---

## Testing Scenarios

### Test Case 1: Basic Save Functionality
1. Open Layout Maker
2. Add a space (e.g., 10m x 10m)
3. Add a table
4. Click "Save" in header
5. **Expected**: Layout saves without console errors
6. **Current**: Will throw error due to setShowSaveDropdown bug

### Test Case 2: Element Manipulation
1. Add elements to canvas
2. Select an element
3. Press Delete
4. Press Ctrl+Z to undo
5. **Expected**: Element deleted then restored
6. **Current**: Working

### Test Case 3: Project Switching
1. Create multiple projects
2. Switch between them
3. Verify data persists correctly
4. **Expected**: Each project maintains its own data
5. **Current**: Working (with deep copy isolation)

---

---

## Summary

### Issues Found: 6
- **P0 Critical**: 1 (fixed)
- **P1 High**: 1 (fixed)
- **P2 Medium**: 2 (deferred - not blocking)
- **P3 Low**: 2 (1 fixed, 1 deferred)

### Issues Fixed: 3
1. **setShowSaveDropdown bug** - Removed undefined function calls
2. **Debug overlay** - Removed always-visible red text
3. **Excessive logging** - Wrapped 18 verbose logs with DEBUG_CANVAS flag

### Remaining Known Limitations
1. No resize/rotate handles for elements
2. No multi-select functionality
3. No properties panel for selected elements
4. No export to PNG/PDF
5. No templates
6. No auto-save

### Test Results
- All critical paths working after fixes
- No TypeScript errors related to Layout Maker functionality
- Server starts and runs correctly

---

*Audit Date: 2026-01-20*
*Auditor: Claude Code*
