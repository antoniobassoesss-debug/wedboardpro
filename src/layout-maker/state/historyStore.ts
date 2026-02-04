import { create } from 'zustand';
import type { HistoryEntry, ActionType, Layout } from './types';

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
  
  record: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clear: () => void;
  
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLastAction: () => HistoryEntry | null;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSize: 100,
  
  record: (entry) => {
    set((state) => ({
      past: [
        ...state.past.slice(-(state.maxSize - 1)),
        {
          ...entry,
          id: generateHistoryId(),
          timestamp: Date.now(),
          actionLabel: entry.actionLabel || createActionLabel(entry.actionType),
        },
      ],
      future: [],
    }));
  },
  
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const entry = past[past.length - 1];
    if (!entry) return null;

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
    if (!entry) return null;

    set({
      past: [...past, entry],
      future: future.slice(1),
    });

    return entry;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
  getLastAction: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const entry = past[past.length - 1];
    return entry ?? null;
  },
}));

function generateHistoryId(): string {
  return `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createActionLabel(actionType: ActionType, context: Record<string, unknown> = {}): string {
  switch (actionType) {
    case 'ADD_ELEMENT':
      return `Add ${context.type || 'element'}`;
    case 'ADD_ELEMENTS':
      return `Add ${context.count || 0} elements`;
    case 'UPDATE_ELEMENT':
      return `Update ${context.type || 'element'}`;
    case 'UPDATE_ELEMENTS':
      return `Update ${context.count || 0} elements`;
    case 'DELETE_ELEMENT':
      return `Delete ${context.type || 'element'}`;
    case 'DELETE_ELEMENTS':
      return `Delete ${context.count || 0} elements`;
    case 'MOVE_ELEMENT':
      return `Move ${context.type || 'element'}`;
    case 'MOVE_ELEMENTS':
      return `Move ${context.count || 0} elements`;
    case 'RESIZE_ELEMENT':
      return `Resize ${context.type || 'element'}`;
    case 'ROTATE_ELEMENT':
      return `Rotate ${context.type || 'element'}`;
    case 'REORDER_ELEMENTS':
      return `Reorder elements`;
    case 'UPDATE_SETTINGS':
      return `Update settings`;
    case 'BATCH':
      return `Batch operation`;
    default:
      return 'Unknown action';
  }
}
