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
  actionLabel: string;
  
  previousState: Partial<Layout>;
  
  nextState: Partial<Layout>;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;
}

import type { Layout } from './layout';
