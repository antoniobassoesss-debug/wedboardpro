/**
 * History Type Definitions
 *
 * Types for undo/redo functionality.
 */

import type { BaseElement } from './elements';
import type { Wall, LayoutSettings } from './layout';
import type { GuestAssignment } from './guests';

/**
 * Action Types
 *
 * All possible actions that can be undone/redone.
 */
export type ActionType =
  // Element actions
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'MOVE_ELEMENT'
  | 'RESIZE_ELEMENT'
  | 'ROTATE_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'DUPLICATE_ELEMENT'
  // Multi-element actions
  | 'ADD_ELEMENTS'
  | 'DELETE_ELEMENTS'
  | 'MOVE_ELEMENTS'
  // Group actions
  | 'GROUP_ELEMENTS'
  | 'UNGROUP_ELEMENTS'
  // Layer actions
  | 'BRING_TO_FRONT'
  | 'SEND_TO_BACK'
  | 'BRING_FORWARD'
  | 'SEND_BACKWARD'
  // Guest actions
  | 'ASSIGN_GUEST'
  | 'UNASSIGN_GUEST'
  | 'SWAP_GUESTS'
  | 'BULK_ASSIGN_GUESTS'
  // Wall actions
  | 'ADD_WALL'
  | 'DELETE_WALL'
  | 'UPDATE_WALL'
  // Settings actions
  | 'UPDATE_SETTINGS'
  // Batch action (multiple actions as one)
  | 'BATCH';

/**
 * Partial State Snapshot
 *
 * State that can be captured for undo/redo.
 */
export interface PartialLayoutState {
  elements?: Record<string, BaseElement>;
  elementOrder?: string[];
  walls?: Wall[];
  assignments?: Record<string, GuestAssignment>;
  settings?: LayoutSettings;
}

/**
 * History Entry
 *
 * A single entry in the undo/redo stack.
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  actionType: ActionType;
  actionLabel: string; // Human-readable: "Move Table 5"
  previousState: PartialLayoutState;
  nextState: PartialLayoutState;
}

/**
 * History State
 *
 * The complete history stack state.
 */
export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // Current position in history
  maxEntries: number; // Maximum entries to keep
}

/**
 * History Limits
 */
export const MAX_HISTORY_ENTRIES = 100;

/**
 * Default History State
 */
export const DEFAULT_HISTORY_STATE: HistoryState = {
  entries: [],
  currentIndex: -1,
  maxEntries: MAX_HISTORY_ENTRIES,
};

/**
 * Action Labels
 *
 * Human-readable labels for action types.
 */
export const ACTION_LABELS: Record<ActionType, string> = {
  ADD_ELEMENT: 'Add element',
  DELETE_ELEMENT: 'Delete element',
  MOVE_ELEMENT: 'Move element',
  RESIZE_ELEMENT: 'Resize element',
  ROTATE_ELEMENT: 'Rotate element',
  UPDATE_ELEMENT: 'Update element',
  DUPLICATE_ELEMENT: 'Duplicate element',
  ADD_ELEMENTS: 'Add elements',
  DELETE_ELEMENTS: 'Delete elements',
  MOVE_ELEMENTS: 'Move elements',
  GROUP_ELEMENTS: 'Group elements',
  UNGROUP_ELEMENTS: 'Ungroup elements',
  BRING_TO_FRONT: 'Bring to front',
  SEND_TO_BACK: 'Send to back',
  BRING_FORWARD: 'Bring forward',
  SEND_BACKWARD: 'Send backward',
  ASSIGN_GUEST: 'Assign guest',
  UNASSIGN_GUEST: 'Unassign guest',
  SWAP_GUESTS: 'Swap guests',
  BULK_ASSIGN_GUESTS: 'Assign guests',
  ADD_WALL: 'Add wall',
  DELETE_WALL: 'Delete wall',
  UPDATE_WALL: 'Update wall',
  UPDATE_SETTINGS: 'Update settings',
  BATCH: 'Multiple changes',
};

/**
 * Helper: Create action label with element name
 */
export function createActionLabel(actionType: ActionType, elementLabel?: string): string {
  const baseLabel = ACTION_LABELS[actionType];
  if (elementLabel) {
    return `${baseLabel}: ${elementLabel}`;
  }
  return baseLabel;
}

/**
 * Helper: Check if can undo
 */
export function canUndo(state: HistoryState): boolean {
  return state.currentIndex >= 0;
}

/**
 * Helper: Check if can redo
 */
export function canRedo(state: HistoryState): boolean {
  return state.currentIndex < state.entries.length - 1;
}

/**
 * Helper: Get current entry
 */
export function getCurrentEntry(state: HistoryState): HistoryEntry | null {
  if (state.currentIndex < 0 || state.currentIndex >= state.entries.length) {
    return null;
  }
  return state.entries[state.currentIndex] ?? null;
}

/**
 * Helper: Get next entry (for redo)
 */
export function getNextEntry(state: HistoryState): HistoryEntry | null {
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.entries.length) {
    return null;
  }
  return state.entries[nextIndex] ?? null;
}
