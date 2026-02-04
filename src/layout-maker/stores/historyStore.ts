/**
 * History Store
 *
 * State store for undo/redo functionality.
 * Uses deep cloning to capture complete layout snapshots.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { ActionType } from '../types/history';
import type { BaseElement } from '../types/elements';
import type { Wall, LayoutSettings } from '../types/layout';
import type { GuestAssignment } from '../types/guests';
import {
  MAX_HISTORY_ENTRIES,
  type HistoryEntry,
  type PartialLayoutState,
} from '../types/history';
import { useLayoutStore } from './layoutStore';

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
  isBatching: boolean;
  batchLabel: string | null;
  currentBatchId: string | null;
  isRecording: boolean;

  record: (
    actionType: ActionType,
    actionLabel: string,
    previousState: PartialLayoutState,
    nextState: PartialLayoutState
  ) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clear: () => void;

  startBatch: (label: string) => void;
  endBatch: () => void;

  getCanUndo: () => boolean;
  getCanRedo: () => boolean;
  getUndoLabel: () => string | null;
  getRedoLabel: () => string | null;
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  if (obj instanceof Map) {
    return new Map(Array.from(obj.entries().map(([k, v]) => [k, deepClone(v)]))) as unknown as T;
  }
  if (obj instanceof Set) {
    return new Set(Array.from(obj.values()).map(deepClone)) as unknown as T;
  }
  const cloned = Object.create(Object.getPrototypeOf(obj));
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned;
}

const applyStateToLayout = (state: PartialLayoutState) => {
  const layoutStore = useLayoutStore.getState();
  if (!state || !layoutStore.layout) return;

  const currentLayout = layoutStore.layout;
  const newLayout = deepClone(currentLayout);
  let needsUpdate = false;

  if (state.elements) {
    newLayout.elements = deepClone(state.elements);
    needsUpdate = true;
  }

  if (state.elementOrder) {
    newLayout.elementOrder = [...state.elementOrder];
    needsUpdate = true;
  }

  if (state.walls) {
    newLayout.space = { ...newLayout.space, walls: deepClone(state.walls) };
    needsUpdate = true;
  }

  if (state.assignments) {
    newLayout.assignments = deepClone(state.assignments);
    needsUpdate = true;
  }

  if (state.settings) {
    newLayout.settings = deepClone(state.settings);
    needsUpdate = true;
  }

  if (needsUpdate) {
    newLayout.updatedAt = new Date().toISOString();
    layoutStore.setLayout(newLayout);
  }
};

export const useHistoryStore = create<HistoryStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      past: [],
      future: [],
      maxSize: MAX_HISTORY_ENTRIES,
      isBatching: false,
      batchLabel: null,
      currentBatchId: null,
      isRecording: false,

      record: (actionType, actionLabel, previousState, nextState) => {
        if (get().isRecording) return;

        set({ isRecording: true });

        const entry: HistoryEntry = {
          id: uuidv4(),
          timestamp: Date.now(),
          actionType,
          actionLabel,
          previousState: deepClone(previousState),
          nextState: deepClone(nextState),
        };

        set((state) => {
          if (state.isBatching && state.currentBatchId) {
            const batchEntry = state.past[state.past.length - 1];
            if (
              batchEntry &&
              batchEntry.actionType === 'BATCH' &&
              batchEntry.id === state.currentBatchId
            ) {
              batchEntry.nextState = deepClone(nextState);
              state.isRecording = false;
              return;
            }
          }

          state.past.push(entry);
          state.future = [];

          if (state.past.length > state.maxSize) {
            state.past.shift();
          }

          state.isRecording = false;
        });
      },

      undo: () => {
        const state = get();
        if (state.past.length === 0) return null;

        set({ isRecording: true });

        const entry = state.past[state.past.length - 1];
        if (!entry) {
          set({ isRecording: false });
          return null;
        }

        applyStateToLayout(entry.previousState);

        set((state) => {
          state.past.pop();
          state.future.push(entry);
          state.isRecording = false;
        });

        return entry;
      },

      redo: () => {
        const state = get();
        if (state.future.length === 0) return null;

        set({ isRecording: true });

        const entry = state.future[state.future.length - 1];
        if (!entry) {
          set({ isRecording: false });
          return null;
        }

        applyStateToLayout(entry.nextState);

        set((state) => {
          state.future.pop();
          state.past.push(entry);
          state.isRecording = false;
        });

        return entry;
      },

      clear: () =>
        set((state) => {
          state.past = [];
          state.future = [];
          state.isBatching = false;
          state.batchLabel = null;
          state.currentBatchId = null;
        }),

      startBatch: (label) =>
        set((state) => {
          const batchId = uuidv4();
          state.isBatching = true;
          state.batchLabel = label;
          state.currentBatchId = batchId;

          const batchEntry: HistoryEntry = {
            id: batchId,
            timestamp: Date.now(),
            actionType: 'BATCH',
            actionLabel: label,
            previousState: {},
            nextState: {},
          };
          state.past.push(batchEntry);
          state.future = [];
        }),

      endBatch: () =>
        set((state) => {
          state.isBatching = false;
          state.batchLabel = null;
          state.currentBatchId = null;
        }),

      getCanUndo: () => {
        const state = get();
        return state.past.length > 0;
      },

      getCanRedo: () => {
        const state = get();
        return state.future.length > 0;
      },

      getUndoLabel: () => {
        const state = get();
        if (state.past.length === 0) return null;
        const entry = state.past[state.past.length - 1];
        return entry?.actionLabel ?? null;
      },

      getRedoLabel: () => {
        const state = get();
        if (state.future.length === 0) return null;
        const entry = state.future[state.future.length - 1];
        return entry?.actionLabel ?? null;
      },
    }))
  )
);

export function createStateSnapshot(
  elements: Record<string, BaseElement> | undefined,
  elementOrder: string[] | undefined,
  walls: Wall[] | undefined,
  settings: LayoutSettings | undefined,
  assignments?: Record<string, GuestAssignment> | undefined
): PartialLayoutState {
  const snapshot: PartialLayoutState = {};

  if (elements !== undefined) {
    snapshot.elements = deepClone(elements);
  }
  if (elementOrder !== undefined) {
    snapshot.elementOrder = [...elementOrder];
  }
  if (walls !== undefined) {
    snapshot.walls = deepClone(walls);
  }
  if (assignments !== undefined) {
    snapshot.assignments = deepClone(assignments);
  }
  if (settings !== undefined) {
    snapshot.settings = deepClone(settings);
  }

  return snapshot;
}
