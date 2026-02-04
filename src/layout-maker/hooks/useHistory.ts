/**
 * useHistory Hook
 *
 * Convenient hook for undo/redo functionality:
 * - recordState(label) - records current state before a change
 * - undo() / redo() - applies snapshots to layoutStore
 * - Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
 */

import { useCallback, useEffect } from 'react';
import { useLayoutStore, useHistoryStore } from '../stores';
import { createStateSnapshot } from '../stores/historyStore';
import type { ActionType } from '../types/history';
import type { BaseElement } from '../types/elements';

interface UseHistoryReturn {
  recordState: (actionType: ActionType, label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}

export function useHistory(): UseHistoryReturn {
  const layoutStore = useLayoutStore();
  const historyStore = useHistoryStore();

  const recordState = useCallback((actionType: ActionType, label: string) => {
    const layout = layoutStore.layout;
    if (!layout) return;

    const currentState = createStateSnapshot(
      layout.elements,
      layout.elementOrder,
      layout.space?.walls,
      layout.settings,
      layout.assignments
    );

    historyStore.record(actionType, label, currentState, currentState);
  }, [layoutStore, historyStore]);

  const undo = useCallback(() => {
    historyStore.undo();
  }, [historyStore]);

  const redo = useCallback(() => {
    historyStore.redo();
  }, [historyStore]);

  const canUndo = historyStore.getCanUndo();
  const canRedo = historyStore.getCanRedo();
  const undoLabel = historyStore.getUndoLabel();
  const redoLabel = historyStore.getRedoLabel();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    recordState,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  };
}

export default useHistory;
