# Smart Guides & Snapping

## Overview

The Layout Maker includes intelligent snapping and alignment guides to help you place elements precisely.

## Features

### Snap Types

| Type | Color | Description |
|------|-------|-------------|
| **Edge** | Blue (#3b82f6) | Snaps to left/right/top/bottom edges of other elements |
| **Center** | Orange (#f97316) | Snaps element centers to other element centers |
| **Grid** | Green (#22c55e) | Snaps to grid lines |
| **Wall** | Purple (#8b5cf6) | Snaps to venue walls/boundaries |

### Priority System

Snapping follows this priority order:
1. Edge alignment (most precise)
2. Center alignment
3. Wall alignment
4. Grid alignment (last resort)

## Controls

### Toggle Settings

- **Snap to Elements (S)**: Toggle element snapping on/off
- **Show Grid (G)**: Toggle grid visibility
- **Distance Labels**: Show measurement indicators between elements

### Grid Sizes

Available grid sizes:
- 10 cm
- 25 cm
- 50 cm (default)
- 1 m

## Distance Indicators

When an element is selected, distance labels appear showing the gap to nearby elements:

- Only shown when distance is relevant (< 2m)
- Displayed in meters or centimeters
- Positioned between aligned elements
- Auto-hides when not needed to avoid clutter

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle snap to elements |
| `G` | Toggle grid visibility |
| `Arrow Keys` | Nudge selected element |
| `Shift + Arrow Keys` | Nudge 10x distance |

## Configuration

Snap settings can be adjusted in:
- Toolbar snap toggle dropdown
- Settings panel

### Default Settings

```typescript
{
  snapEnabled: true,
  gridEnabled: true,
  gridSize: 0.5, // 50cm
  snapThreshold: 0.15, // 15cm
  showDistanceIndicators: true
}
```
