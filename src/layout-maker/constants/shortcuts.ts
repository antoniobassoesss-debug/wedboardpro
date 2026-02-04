/**
 * Keyboard Shortcuts
 *
 * All keyboard shortcuts used in the Layout Maker.
 */

/**
 * Shortcut Definition
 */
export interface ShortcutDef {
  key: string; // The key (lowercase)
  modifiers?: {
    cmd?: boolean; // Cmd on Mac, Ctrl on Windows
    shift?: boolean;
    alt?: boolean;
  };
  action: string; // Action identifier
  label: string; // Human-readable label
  category: ShortcutCategory;
}

/**
 * Shortcut Categories
 */
export type ShortcutCategory =
  | 'tools'
  | 'view'
  | 'edit'
  | 'elements'
  | 'navigation'
  | 'toggles';

/**
 * All Keyboard Shortcuts
 */
export const SHORTCUTS: ShortcutDef[] = [
  // Tools
  { key: 'v', action: 'tool.select', label: 'Select Tool', category: 'tools' },
  { key: 'h', action: 'tool.hand', label: 'Hand Tool (Pan)', category: 'tools' },
  { key: 't', action: 'tool.table', label: 'Add Table', category: 'tools' },
  { key: ' ', action: 'tool.hand.temp', label: 'Temporary Hand Tool', category: 'tools' },

  // View
  { key: '0', modifiers: { cmd: true }, action: 'view.fit', label: 'Zoom to Fit', category: 'view' },
  { key: '1', modifiers: { cmd: true }, action: 'view.100', label: 'Zoom to 100%', category: 'view' },
  { key: '=', modifiers: { cmd: true }, action: 'view.zoomIn', label: 'Zoom In', category: 'view' },
  { key: '-', modifiers: { cmd: true }, action: 'view.zoomOut', label: 'Zoom Out', category: 'view' },
  { key: '[', modifiers: { cmd: true }, action: 'view.zoomToSelection', label: 'Zoom to Selection', category: 'view' },

  // Edit - Undo/Redo
  { key: 'z', modifiers: { cmd: true }, action: 'edit.undo', label: 'Undo', category: 'edit' },
  { key: 'z', modifiers: { cmd: true, shift: true }, action: 'edit.redo', label: 'Redo', category: 'edit' },
  { key: 'y', modifiers: { cmd: true }, action: 'edit.redo', label: 'Redo (Alt)', category: 'edit' },

  // Edit - Clipboard
  { key: 'c', modifiers: { cmd: true }, action: 'edit.copy', label: 'Copy', category: 'edit' },
  { key: 'x', modifiers: { cmd: true }, action: 'edit.cut', label: 'Cut', category: 'edit' },
  { key: 'v', modifiers: { cmd: true }, action: 'edit.paste', label: 'Paste', category: 'edit' },
  { key: 'd', modifiers: { cmd: true }, action: 'edit.duplicate', label: 'Duplicate', category: 'edit' },

  // Edit - Selection
  { key: 'a', modifiers: { cmd: true }, action: 'edit.selectAll', label: 'Select All', category: 'edit' },
  { key: 'Escape', action: 'edit.deselect', label: 'Deselect All', category: 'edit' },

  // Edit - Delete
  { key: 'Delete', action: 'edit.delete', label: 'Delete', category: 'edit' },
  { key: 'Backspace', action: 'edit.delete', label: 'Delete', category: 'edit' },

  // Elements - Transform
  { key: 'r', action: 'element.rotate90', label: 'Rotate 90°', category: 'elements' },
  { key: 'r', modifiers: { shift: true }, action: 'element.rotate-90', label: 'Rotate -90°', category: 'elements' },

  // Elements - Layering
  { key: ']', action: 'element.bringForward', label: 'Bring Forward', category: 'elements' },
  { key: '[', action: 'element.sendBackward', label: 'Send Backward', category: 'elements' },
  { key: ']', modifiers: { cmd: true }, action: 'element.bringToFront', label: 'Bring to Front', category: 'elements' },
  { key: '[', modifiers: { cmd: true }, action: 'element.sendToBack', label: 'Send to Back', category: 'elements' },

  // Elements - Grouping
  { key: 'g', modifiers: { cmd: true }, action: 'element.group', label: 'Group', category: 'elements' },
  { key: 'g', modifiers: { cmd: true, shift: true }, action: 'element.ungroup', label: 'Ungroup', category: 'elements' },

  // Elements - Lock
  { key: 'l', action: 'element.toggleLock', label: 'Lock/Unlock', category: 'elements' },

  // Navigation - Arrow Keys
  { key: 'ArrowUp', action: 'nav.nudgeUp', label: 'Nudge Up', category: 'navigation' },
  { key: 'ArrowDown', action: 'nav.nudgeDown', label: 'Nudge Down', category: 'navigation' },
  { key: 'ArrowLeft', action: 'nav.nudgeLeft', label: 'Nudge Left', category: 'navigation' },
  { key: 'ArrowRight', action: 'nav.nudgeRight', label: 'Nudge Right', category: 'navigation' },
  { key: 'ArrowUp', modifiers: { shift: true }, action: 'nav.nudgeUpLarge', label: 'Nudge Up (Large)', category: 'navigation' },
  { key: 'ArrowDown', modifiers: { shift: true }, action: 'nav.nudgeDownLarge', label: 'Nudge Down (Large)', category: 'navigation' },
  { key: 'ArrowLeft', modifiers: { shift: true }, action: 'nav.nudgeLeftLarge', label: 'Nudge Left (Large)', category: 'navigation' },
  { key: 'ArrowRight', modifiers: { shift: true }, action: 'nav.nudgeRightLarge', label: 'Nudge Right (Large)', category: 'navigation' },

  // Toggles
  { key: 's', action: 'toggle.snap', label: 'Toggle Snap', category: 'toggles' },
  { key: 'g', action: 'toggle.grid', label: 'Toggle Grid', category: 'toggles' },
  { key: 'b', action: 'toggle.background', label: 'Toggle Background', category: 'toggles' },
  { key: '?', action: 'toggle.shortcuts', label: 'Show Shortcuts', category: 'toggles' },
];

/**
 * Shortcut Map for Quick Lookup
 */
export const SHORTCUT_MAP: Record<string, ShortcutDef> = SHORTCUTS.reduce(
  (acc, shortcut) => {
    acc[shortcut.action] = shortcut;
    return acc;
  },
  {} as Record<string, ShortcutDef>
);

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(category: ShortcutCategory): ShortcutDef[] {
  return SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutDef, isMac: boolean = true): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.cmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers?.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format special keys
  let keyDisplay = shortcut.key;
  switch (shortcut.key) {
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'ArrowUp':
      keyDisplay = '↑';
      break;
    case 'ArrowDown':
      keyDisplay = '↓';
      break;
    case 'ArrowLeft':
      keyDisplay = '←';
      break;
    case 'ArrowRight':
      keyDisplay = '→';
      break;
    case 'Escape':
      keyDisplay = 'Esc';
      break;
    case 'Delete':
      keyDisplay = isMac ? '⌫' : 'Del';
      break;
    case 'Backspace':
      keyDisplay = '⌫';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }

  parts.push(keyDisplay);
  return parts.join(isMac ? '' : '+');
}

/**
 * Check if keyboard event matches shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDef): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? event.metaKey : event.ctrlKey;

  // Check modifiers
  if (shortcut.modifiers?.cmd && !cmdKey) return false;
  if (shortcut.modifiers?.shift && !event.shiftKey) return false;
  if (shortcut.modifiers?.alt && !event.altKey) return false;

  // Check key
  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

/**
 * Find matching shortcut for keyboard event
 */
export function findMatchingShortcut(event: KeyboardEvent): ShortcutDef | null {
  return SHORTCUTS.find((shortcut) => matchesShortcut(event, shortcut)) || null;
}

/**
 * Modifier Keys for Drag Operations
 */
export const DRAG_MODIFIERS = {
  constrainAxis: 'Shift', // Constrain to horizontal or vertical
  disableSnap: 'Alt', // Temporarily disable snap
  duplicate: 'Alt', // Duplicate while dragging (with Option/Alt)
} as const;

/**
 * Modifier Keys for Resize Operations
 */
export const RESIZE_MODIFIERS = {
  proportional: 'Shift', // Maintain aspect ratio (inverted - default is proportional for corners)
  fromCenter: 'Alt', // Resize from center
} as const;

/**
 * Modifier Keys for Rotate Operations
 */
export const ROTATE_MODIFIERS = {
  snapAngle: 'Shift', // Snap to 15° increments
} as const;

/**
 * Nudge Amounts
 */
export const NUDGE_AMOUNT = 1; // pixels (at 100% zoom)
export const NUDGE_AMOUNT_LARGE = 10; // pixels with Shift
